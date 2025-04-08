/**
 * ocr.js - Funktionen für die Texterkennung und OCR-Verarbeitung
 */

// Tesseract-Konfiguration für hohe Qualität
const defaultTessConfig = { 
    tessedit_pageseg_mode: '1', // Automatische Seitensegmentierung mit OSD
    tessedit_ocr_engine_mode: '0', // Legacy + LSTM
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789.,;:!?()[]{}+-*/=\'"\n ', // Deutsche Zeichen explizit erlauben
    preserve_interword_spaces: '1'
};

// Bild für OCR optimieren
function optimizeImageForOCR(canvas) {
    try {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Originales Bild speichern
        const originalImageData = ctx.getImageData(0, 0, width, height);
        let imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Bild in Graustufen umwandeln für bessere OCR
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;     // Rot
            data[i + 1] = avg; // Grün
            data[i + 2] = avg; // Blau
        }
        
        // Kontrast erhöhen
        const factor = 1.5; // Kontraststärke (1-2 ist ein guter Bereich)
        for (let i = 0; i < data.length; i += 4) {
            // Für jeden Pixel Kontrast anpassen
            const gray = data[i];
            // Kontrast um den Mittelwert 128 verstärken
            const newVal = 128 + factor * (gray - 128);
            data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, newVal));
        }
        
        // Optimiertes Bild auf Canvas zeichnen
        ctx.putImageData(imageData, 0, 0);
        return true;
    } catch (e) {
        // Bei Fehler das Original behalten
        return false;
    }
}

// Bild für Texterkennung vorbereiten
function prepareImageForOCR(imageUrl, callback) {
    const img = new Image();
    
    img.onload = function() {
        // Größe auf max 1500px begrenzen, aber Seitenverhältnis beibehalten
        let width = img.width;
        let height = img.height;
        const maxDim = 1500;
        
        if (width > maxDim || height > maxDim) {
            if (width > height) {
                height = (height * maxDim) / width;
                width = maxDim;
            } else {
                width = (width * maxDim) / height;
                height = maxDim;
            }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Bild mit Glättung zeichnen
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Bild optimieren
        optimizeImageForOCR(canvas);
        
        callback(null, canvas);
    };
    
    img.onerror = function() {
        callback(new Error('Bild konnte nicht geladen werden'), null);
    };
    
    img.src = imageUrl;
}

// Texterkennung für ein Bild durchführen
function recognizeImageText(imageUrl, tessConfig, callback) {
    prepareImageForOCR(imageUrl, function(err, canvas) {
        if (err) {
            callback(false, err.message);
            return;
        }
        
        // Tesseract starten
        Tesseract.recognize(
            canvas.toDataURL('image/png'),
            'deu', // Standard: Deutsch
            tessConfig || defaultTessConfig
        ).then(({ data: { text } }) => {
            // Text formatieren und speichern
            const formattedText = formatText(text);
            if (formattedText) {
                callback(true, formattedText);
            } else {
                callback(false, 'Kein Text im Bild gefunden');
            }
        }).catch(err => {
            // Fehler bei der Bild-Texterkennung
            callback(false, err.message);
        });
    });
}

// Automatische Texterkennung für hochgeladene Dateien
function scanUploadedFile(filename, callback) {
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isPdf = fileExtension === 'pdf';
    
    if (isPdf) {
        // Für PDFs: Alle Seiten verarbeiten mit Status-Updates
        processMultipagePDF(
            filename, 
            defaultTessConfig,
            function(pageNum, totalPages, statusMessage) {
                // Fortschritt aktualisieren
                const uploadStatus = document.getElementById('uploadStatus');
                const uploadProgress = document.getElementById('uploadProgress');
                
                if (uploadStatus) {
                    uploadStatus.textContent = statusMessage;
                }
                
                if (uploadProgress) {
                    const progress = Math.round((pageNum / totalPages) * 100);
                    uploadProgress.style.width = progress + '%';
                    uploadProgress.textContent = progress + '%';
                }
            },
            function(success, text, message) {
                if (success && text) {
                    saveScannedText(filename, text);
                }
                callback(success, message);
            }
        );
    } else {
        // Für Bilder: Texterkennung durchführen
        recognizeImageText(
            `uploads/${filename}`,
            defaultTessConfig,
            function(success, result) {
                if (success) {
                    saveScannedText(filename, result);
                    callback(true, 'Bild-Text erkannt');
                } else {
                    callback(false, result); // Result enthält die Fehlermeldung
                }
            }
        );
    }
}