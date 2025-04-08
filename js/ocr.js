/**
 * ocr.js - Funktionen für die Texterkennung mit Space OCR API
 */

// Proxy-URL für Space OCR API
const OCR_SPACE_PROXY = 'ocr_space_proxy.php';

// Debug-Logging aktivieren (auf false setzen für Produktion)
const DEBUG = true;

// Debug-Funktion
function logDebug(message, data) {
    if (DEBUG) {
        console.log('[OCR] ' + message, data);
    }
}

// Bild für OCR vorbereiten
function prepareImageForOCR(imageUrl, callback) {
    logDebug('Bereite Bild vor: ' + imageUrl);
    
    const img = new Image();
    
    img.onload = function() {
        logDebug('Bild geladen', { width: img.width, height: img.height });
        
        // Größe auf max 2000px begrenzen, aber Seitenverhältnis beibehalten
        let width = img.width;
        let height = img.height;
        const maxDim = 2000;
        
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
        
        logDebug('Bild auf Canvas gezeichnet', { canvasWidth: canvas.width, canvasHeight: canvas.height });
        callback(null, canvas);
    };
    
    img.onerror = function(error) {
        logDebug('Fehler beim Laden des Bildes', error);
        callback(new Error('Bild konnte nicht geladen werden'), null);
    };
    
    img.src = imageUrl;
}

// Base64-Kodierung für ein Canvas-Element
function canvasToBase64(canvas) {
    try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64 = dataUrl.split(',')[1];
        logDebug('Bild in Base64 konvertiert', { length: base64.length });
        return base64;
    } catch (error) {
        logDebug('Fehler bei Base64-Konvertierung', error);
        throw new Error('Bild konnte nicht in Base64 konvertiert werden: ' + error.message);
    }
}

// Texterkennung für ein Bild durchführen mit Space OCR API
function recognizeImageText(imageUrl, options, callback) {
    logDebug('Starte Texterkennung für: ' + imageUrl);
    
    prepareImageForOCR(imageUrl, function(err, canvas) {
        if (err) {
            logDebug('Fehler bei Bildvorbereitung', err);
            callback(false, err.message);
            return;
        }
        
        try {
            // Bild in Base64 konvertieren
            const base64Image = canvasToBase64(canvas);
            
            logDebug('Sende Bild an OCR API', { base64Length: base64Image.length });
            
            // API-Anfrage an den Proxy senden
            fetch(OCR_SPACE_PROXY, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    base64Image: base64Image,
                    language: 'ger' // Deutsch
                })
            })
            .then(response => {
                logDebug('API-Antwort erhalten', { 
                    status: response.status, 
                    ok: response.ok 
                });
                
                if (!response.ok) {
                    throw new Error('HTTP-Fehler: ' + response.status);
                }
                
                return response.json();
            })
            .then(data => {
                logDebug('Verarbeite API-Daten', data);
                
                if (data.success && data.text) {
                    // Text formatieren und zurückgeben
                    try {
                        const formattedText = formatText(data.text);
                        logDebug('Text formatiert', { length: formattedText.length });
                        callback(true, formattedText);
                    } catch (error) {
                        logDebug('Fehler bei Textformatierung', error);
                        callback(false, 'Fehler bei Textformatierung: ' + error.message);
                    }
                } else {
                    logDebug('Keine Textdaten in API-Antwort', data);
                    callback(false, data.message || 'Texterkennung fehlgeschlagen');
                }
            })
            .catch(error => {
                logDebug('Fehler bei API-Anfrage', error);
                callback(false, 'OCR-Fehler: ' + error.message);
            });
        } catch (error) {
            logDebug('Fehler im OCR-Prozess', error);
            callback(false, 'OCR-Fehler: ' + error.message);
        }
    });
}

// PDF-Seite für OCR verarbeiten
function processPDFPageForOCR(pdfDoc, pageNum, options, callback) {
    logDebug('Verarbeite PDF-Seite', { pageNum: pageNum });
    
    try {
        pdfDoc.getPage(pageNum).then(function(page) {
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            };
            
            page.render(renderContext).promise.then(function() {
                logDebug('PDF-Seite gerendert', { 
                    pageNum: pageNum, 
                    width: canvas.width, 
                    height: canvas.height 
                });
                
                // Seite als Base64 konvertieren
                try {
                    const base64Image = canvasToBase64(canvas);
                    
                    // API-Anfrage an den Proxy senden
                    fetch(OCR_SPACE_PROXY, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            base64Image: base64Image,
                            language: 'ger' // Deutsch
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.text) {
                            logDebug('Text für PDF-Seite erkannt', { 
                                pageNum: pageNum, 
                                textLength: data.text.length 
                            });
                            callback(null, data.text);
                        } else {
                            callback(new Error(data.message || 'Texterkennung fehlgeschlagen'), null);
                        }
                    })
                    .catch(error => {
                        logDebug('API-Fehler bei PDF-Seite', { 
                            pageNum: pageNum, 
                            error: error.message 
                        });
                        callback(error, null);
                    });
                } catch (error) {
                    logDebug('Fehler bei Base64-Konvertierung', error);
                    callback(error, null);
                }
            }).catch(function(error) {
                logDebug('Fehler beim Rendern der PDF-Seite', { 
                    pageNum: pageNum, 
                    error: error.message 
                });
                callback(error, null);
            });
        }).catch(function(error) {
            logDebug('Fehler beim Laden der PDF-Seite', { 
                pageNum: pageNum, 
                error: error.message 
            });
            callback(error, null);
        });
    } catch (error) {
        logDebug('Allgemeiner Fehler bei PDF-Verarbeitung', error);
        callback(error, null);
    }
}

// Text formatieren für bessere Lesbarkeit
function formatText(text) {
    logDebug('Formatiere Text', { length: text.length });
    
    // Verwende die bestehende formatText Funktion aus utils.js, falls verfügbar
    if (typeof window.formatText === 'function') {
        try {
            return window.formatText(text);
        } catch (error) {
            logDebug('Fehler bei externer Textformatierung', error);
            // Fallback zur einfachen Formatierung
            return text.trim();
        }
    }
    
    // Einfache Formatierung, falls keine externe Funktion verfügbar ist
    return text.trim();
}

// Automatische Texterkennung für hochgeladene Dateien
function scanUploadedFile(filename, callback) {
    logDebug('Starte Texterkennung für Datei', { filename: filename });
    
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isPdf = fileExtension === 'pdf';
    
    if (isPdf) {
        // Für PDFs: Alle Seiten verarbeiten mit Status-Updates
        logDebug('Verarbeite PDF-Datei', { filename: filename });
        
        processMultipagePDF(
            filename, 
            {}, // Keine besonderen Optionen nötig
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
                
                logDebug('PDF-Fortschritt aktualisiert', { 
                    pageNum: pageNum, 
                    totalPages: totalPages, 
                    progress: progress 
                });
            },
            function(success, text, message) {
                logDebug('PDF-Verarbeitung abgeschlossen', { 
                    success: success, 
                    textLength: text ? text.length : 0, 
                    message: message 
                });
                
                if (success && text) {
                    saveScannedText(filename, text);
                }
                callback(success, message);
            }
        );
    } else {
        // Für Bilder: Texterkennung durchführen
        logDebug('Verarbeite Bilddatei', { filename: filename });
        
        recognizeImageText(
            `uploads/${filename}`,
            {},
            function(success, result) {
                logDebug('Bild-OCR abgeschlossen', { 
                    success: success, 
                    resultLength: result ? result.length : 0 
                });
                
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