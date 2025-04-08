/**
 * ocr.js - Optimierte Funktionen für die Texterkennung mit Space OCR API
 */

// Konfiguration
const CONFIG = {
    PROXY_URL: 'ocr_space_proxy.php',
    DEBUG: true,
    DEFAULT_LANGUAGE: 'ger',
    MAX_IMAGE_SIZE: 2000, // Maximale Größe für Bilder
    JPEG_QUALITY: 0.9     // JPEG-Qualität für Base64-Konvertierung
};

// Logger-Klasse
class OcrLogger {
    static log(message, data) {
        if (!CONFIG.DEBUG) return;
        console.log(`[OCR] ${message}`, data || '');
    }
    
    static error(message, error) {
        if (!CONFIG.DEBUG) return;
        console.error(`[OCR Error] ${message}`, error || '');
    }
}

// OCR-Service-Klasse
class OcrService {
    /**
     * Bereitet ein Bild für die OCR vor
     * @param {string} imageUrl - URL zum Bild
     * @returns {Promise<HTMLCanvasElement>} - Canvas mit optimiertem Bild
     */
    static prepareImage(imageUrl) {
        OcrLogger.log('Bereite Bild vor', { url: imageUrl });
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                OcrLogger.log('Bild geladen', { width: img.width, height: img.height });
                
                // Größe anpassen wenn nötig
                let width = img.width;
                let height = img.height;
                const maxDim = CONFIG.MAX_IMAGE_SIZE;
                
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = (height * maxDim) / width;
                        width = maxDim;
                    } else {
                        width = (width * maxDim) / height;
                        height = maxDim;
                    }
                }
                
                // Auf Canvas zeichnen
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                OcrLogger.log('Bild optimiert', { width, height });
                resolve(canvas);
            };
            
            img.onerror = (error) => {
                OcrLogger.error('Fehler beim Laden des Bildes', error);
                reject(new Error('Bild konnte nicht geladen werden'));
            };
            
            img.src = imageUrl;
        });
    }
    
    /**
     * Konvertiert ein Canvas-Element zu Base64
     * @param {HTMLCanvasElement} canvas - Canvas-Element
     * @returns {string} - Base64-String
     */
    static canvasToBase64(canvas) {
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', CONFIG.JPEG_QUALITY);
            const base64 = dataUrl.split(',')[1];
            OcrLogger.log('Base64-Konvertierung erfolgreich', { length: base64.length });
            return base64;
        } catch (error) {
            OcrLogger.error('Fehler bei Base64-Konvertierung', error);
            throw new Error('Bild konnte nicht in Base64 konvertiert werden');
        }
    }
    
    /**
     * Führt die Texterkennung für ein Bild durch
     * @param {string} imageUrl - URL zum Bild
     * @returns {Promise<string>} - Erkannter Text
     */
    static async recognizeText(imageUrl) {
        OcrLogger.log('Starte Texterkennung', { url: imageUrl });
        
        try {
            // Bild vorbereiten
            const canvas = await this.prepareImage(imageUrl);
            
            // Base64 konvertieren
            const base64Image = this.canvasToBase64(canvas);
            
            // API-Anfrage
            const response = await fetch(CONFIG.PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Image: base64Image,
                    language: CONFIG.DEFAULT_LANGUAGE
                })
            });
            
            OcrLogger.log('API-Antwort erhalten', { 
                status: response.status, 
                ok: response.ok 
            });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            // Daten verarbeiten
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Texterkennung fehlgeschlagen');
            }
            
            return data.text;
        } catch (error) {
            OcrLogger.error('Fehler bei Texterkennung', error);
            throw error;
        }
    }
    
    /**
     * Erkennt Text in einer PDF-Seite
     * @param {Object} pdfDoc - PDF.js Dokument
     * @param {number} pageNum - Seitennummer
     * @returns {Promise<string>} - Erkannter Text
     */
    static async processPdfPage(pdfDoc, pageNum) {
        OcrLogger.log('Verarbeite PDF-Seite', { page: pageNum });
        
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            OcrLogger.log('PDF-Seite gerendert', { 
                page: pageNum, 
                width: canvas.width, 
                height: canvas.height 
            });
            
            // Base64 konvertieren
            const base64Image = this.canvasToBase64(canvas);
            
            // API-Anfrage
            const response = await fetch(CONFIG.PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Image: base64Image,
                    language: CONFIG.DEFAULT_LANGUAGE
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Texterkennung fehlgeschlagen');
            }
            
            return data.text;
        } catch (error) {
            OcrLogger.error('Fehler bei PDF-Seitenverarbeitung', error);
            throw error;
        }
    }
}

// Öffentliche API-Funktionen

/**
 * Führt OCR auf einem Bild durch
 * @param {string} imageUrl - URL zum Bild
 * @param {Object} options - Optionen (momentan nicht verwendet)
 * @param {Function} callback - Callback-Funktion(success, result)
 */
function recognizeImageText(imageUrl, options, callback) {
    OcrService.recognizeText(imageUrl)
        .then(text => {
            const formattedText = formatText(text);
            callback(true, formattedText);
        })
        .catch(error => {
            callback(false, `OCR-Fehler: ${error.message}`);
        });
}

/**
 * Verarbeitet eine PDF-Seite für OCR
 * @param {Object} pdfDoc - PDF.js Dokument
 * @param {number} pageNum - Seitennummer
 * @param {Object} options - Optionen
 * @param {Function} callback - Callback-Funktion(error, text)
 */
function processPDFPageForOCR(pdfDoc, pageNum, options, callback) {
    OcrService.processPdfPage(pdfDoc, pageNum)
        .then(text => {
            callback(null, text);
        })
        .catch(error => {
            callback(error, null);
        });
}

/**
 * Formatiert den erkannten Text
 * @param {string} text - Roher Text
 * @returns {string} - Formatierter Text
 */
function formatText(text) {
    // Externe formatText-Funktion verwenden, wenn verfügbar
    if (typeof window.formatText === 'function') {
        try {
            return window.formatText(text);
        } catch (error) {
            OcrLogger.error('Fehler bei externer Textformatierung', error);
            return text.trim();
        }
    }
    
    return text.trim();
}

/**
 * Scannt eine hochgeladene Datei
 * @param {string} filename - Dateiname
 * @param {Function} callback - Callback-Funktion(success, message)
 */
function scanUploadedFile(filename, callback) {
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isPdf = fileExtension === 'pdf';
    
    OcrLogger.log('Starte Scan', { filename, type: isPdf ? 'PDF' : 'Bild' });
    
    if (isPdf) {
        // PDF verarbeiten
        processMultipagePDF(
            filename, 
            {}, 
            (pageNum, totalPages, statusMessage) => {
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
            (success, text, message) => {
                if (success && text) {
                    saveScannedText(filename, text);
                }
                callback(success, message);
            }
        );
    } else {
        // Bild verarbeiten
        recognizeImageText(
            `uploads/${filename}`,
            {},
            (success, result) => {
                if (success) {
                    saveScannedText(filename, result);
                    callback(true, 'Bild-Text erkannt');
                } else {
                    callback(false, result); // Fehlermeldung
                }
            }
        );
    }
}