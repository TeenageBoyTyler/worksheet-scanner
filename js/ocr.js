/**
 * ocr.js - Funktionen für die Texterkennung mit Space OCR API
 * Mit korrigierter PDF-Verarbeitung
 */

// Proxy-URL für Space OCR API
const OCR_SPACE_PROXY = 'ocr_space_proxy.php';

// Debug-Logging aktivieren (auf false setzen für Produktion)
const DEBUG = true;

// Maximale Anzahl von PDF-Seiten für OCR (Space OCR API Limit)
const MAX_PDF_PAGES = 3;

// Debug-Funktion
function logDebug(message, data) {
    if (DEBUG) {
        console.log('[OCR] ' + message, data || '');
    }
}

// Bild für OCR vorbereiten
function prepareImageForOCR(imageUrl, callback) {
    logDebug('Bereite Bild vor', { url: imageUrl });
    
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

// Texterkennung mit Space OCR API
function sendToOCR(base64Image) {
    logDebug('Sende Bild an OCR API', { base64Length: base64Image.length });
    
    return fetch(OCR_SPACE_PROXY, {
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
        logDebug('OCR API Antwort erhalten', { status: response.status });
        if (!response.ok) {
            throw new Error('HTTP-Fehler: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        logDebug('OCR API Daten verarbeitet', data);
        if (!data.success || !data.text) {
            throw new Error(data.message || 'OCR fehlgeschlagen');
        }
        return data.text;
    });
}

// Texterkennung für ein Bild durchführen
function recognizeImageText(imageUrl, options, callback) {
    logDebug('Starte Texterkennung für', { url: imageUrl });
    
    prepareImageForOCR(imageUrl, function(err, canvas) {
        if (err) {
            logDebug('Fehler bei Bildvorbereitung', err);
            callback(false, err.message);
            return;
        }
        
        try {
            // Bild in Base64 konvertieren
            const base64Image = canvasToBase64(canvas);
            
            // OCR durchführen
            sendToOCR(base64Image)
                .then(text => {
                    // Text formatieren und zurückgeben
                    const formattedText = formatText(text);
                    logDebug('Text erkannt und formatiert', { textLength: formattedText.length });
                    callback(true, formattedText);
                })
                .catch(error => {
                    logDebug('Fehler bei OCR-Anfrage', error);
                    callback(false, 'OCR-Fehler: ' + error.message);
                });
        } catch (error) {
            logDebug('Fehler im OCR-Prozess', error);
            callback(false, 'OCR-Fehler: ' + error.message);
        }
    });
}

// Neue Funktion zur PDF-Verarbeitung
function processPDFforOCR(filename, progressCallback, resultCallback) {
    logDebug('Verarbeite PDF', { filename });
    
    // PDF laden
    pdfjsLib.getDocument('uploads/' + filename).promise
        .then(pdf => {
            const numPages = pdf.numPages;
            const pagesToProcess = Math.min(numPages, MAX_PDF_PAGES); // API-Limit beachten
            let allText = '';
            let processedPages = 0;
            
            logDebug('PDF geladen', { 
                totalPages: numPages, 
                pagesToProcess: pagesToProcess 
            });
            
            // Status aktualisieren
            if (progressCallback) {
                if (numPages > MAX_PDF_PAGES) {
                    progressCallback(0, pagesToProcess, 
                        `PDF mit ${numPages} Seiten gefunden, verarbeite die ersten ${MAX_PDF_PAGES} Seiten...`);
                } else {
                    progressCallback(0, pagesToProcess, 
                        `PDF mit ${numPages} Seiten wird verarbeitet...`);
                }
            }
            
            // Seiten sequentiell verarbeiten
            function processNextPage(pageIndex) {
                // Fertig, wenn alle Seiten verarbeitet sind
                if (pageIndex > pagesToProcess) {
                    logDebug('Alle PDF-Seiten verarbeitet', { textLength: allText.length });
                    
                    // Hinweis hinzufügen, wenn nicht alle Seiten verarbeitet wurden
                    if (numPages > MAX_PDF_PAGES) {
                        allText = `HINWEIS: Dieses PDF hat ${numPages} Seiten. Aufgrund von API-Beschränkungen wurden nur die ersten ${MAX_PDF_PAGES} Seiten verarbeitet.\n\n` + allText;
                    }
                    
                    resultCallback(true, allText, 
                        numPages > MAX_PDF_PAGES 
                            ? `Text aus den ersten ${MAX_PDF_PAGES} von ${numPages} Seiten erkannt`
                            : `Text aus ${numPages} Seiten erkannt`);
                    return;
                }
                
                // Status aktualisieren
                if (progressCallback) {
                    progressCallback(pageIndex, pagesToProcess, 
                        `Verarbeite Seite ${pageIndex} von ${pagesToProcess}...`);
                }
                
                logDebug('Verarbeite PDF-Seite', { page: pageIndex });
                
                // Seite rendern
                pdf.getPage(pageIndex).then(page => {
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    const renderContext = {
                        canvasContext: canvas.getContext('2d'),
                        viewport: viewport
                    };
                    
                    // Seite rendern und dann als Bild verarbeiten
                    page.render(renderContext).promise.then(() => {
                        try {
                            // In Base64 konvertieren
                            const base64Image = canvasToBase64(canvas);
                            
                            // OCR für diese Seite durchführen
                            sendToOCR(base64Image)
                                .then(text => {
                                    // Text dieser Seite verarbeiten
                                    const pageText = formatText(text);
                                    if (pageText && pageText.trim().length > 0) {
                                        // Seitentext zum Gesamttext hinzufügen
                                        allText += (allText ? '\n\n=== SEITE ' + pageIndex + ' ===\n\n' : '=== SEITE ' + pageIndex + ' ===\n\n') + pageText;
                                    }
                                    
                                    // Nächste Seite verarbeiten
                                    processedPages++;
                                    setTimeout(() => processNextPage(pageIndex + 1), 100);
                                })
                                .catch(error => {
                                    logDebug('Fehler bei OCR für Seite', {
                                        page: pageIndex,
                                        error: error.message
                                    });
                                    
                                    // Trotz Fehler zur nächsten Seite gehen
                                    processedPages++;
                                    setTimeout(() => processNextPage(pageIndex + 1), 100);
                                });
                        } catch (error) {
                            logDebug('Fehler bei der Seitenverarbeitung', {
                                page: pageIndex,
                                error: error.message
                            });
                            
                            // Trotz Fehler zur nächsten Seite gehen
                            processedPages++;
                            setTimeout(() => processNextPage(pageIndex + 1), 100);
                        }
                    }).catch(error => {
                        logDebug('Fehler beim Rendern der Seite', {
                            page: pageIndex,
                            error: error.message
                        });
                        
                        // Trotz Fehler zur nächsten Seite gehen
                        processedPages++;
                        setTimeout(() => processNextPage(pageIndex + 1), 100);
                    });
                }).catch(error => {
                    logDebug('Fehler beim Laden der Seite', {
                        page: pageIndex,
                        error: error.message
                    });
                    
                    // Trotz Fehler zur nächsten Seite gehen
                    processedPages++;
                    setTimeout(() => processNextPage(pageIndex + 1), 100);
                });
            }
            
            // Starte mit der ersten Seite
            processNextPage(1);
        })
        .catch(error => {
            logDebug('Fehler beim Laden des PDFs', error);
            resultCallback(false, '', 'PDF konnte nicht geladen werden: ' + error.message);
        });
}

// Text formatieren für bessere Lesbarkeit
function formatText(text) {
    if (!text) return '';
    
    logDebug('Formatiere Text', { length: text.length });
    
    // Externe Formatierungsfunktion verwenden, wenn verfügbar
    if (window.formatText && typeof window.formatText === 'function') {
        try {
            return window.formatText(text);
        } catch (error) {
            logDebug('Fehler bei externer Textformatierung', error);
            return text.trim();
        }
    }
    
    // Einfache Formatierung, falls keine externe Funktion verfügbar ist
    return text.trim();
}

// Automatische Texterkennung für hochgeladene Dateien
function scanUploadedFile(filename, callback) {
    logDebug('Starte Texterkennung für Datei', { filename });
    
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isPdf = fileExtension === 'pdf';
    
    if (isPdf) {
        // Für PDFs: Neue PDF-Verarbeitungsmethode verwenden
        processPDFforOCR(
            filename,
            // Status-Update-Callback
            function(currentPage, totalPages, statusMessage) {
                // Fortschritt aktualisieren
                const uploadStatus = document.getElementById('uploadStatus');
                const uploadProgress = document.getElementById('uploadProgress');
                
                if (uploadStatus) {
                    uploadStatus.textContent = statusMessage;
                }
                
                if (uploadProgress) {
                    const progress = Math.round((currentPage / totalPages) * 100);
                    uploadProgress.style.width = progress + '%';
                    uploadProgress.textContent = progress + '%';
                }
                
                logDebug('PDF-Fortschritt aktualisiert', { 
                    currentPage,
                    totalPages,
                    progress: Math.round((currentPage / totalPages) * 100) + '%'
                });
            },
            // Ergebnis-Callback
            function(success, text, message) {
                logDebug('PDF-Verarbeitung abgeschlossen', { 
                    success, 
                    textLength: text ? text.length : 0,
                    message
                });
                
                if (success && text) {
                    saveScannedText(filename, text);
                }
                callback(success, message);
            }
        );
    } else {
        // Für Bilder: Texterkennung durchführen
        logDebug('Verarbeite Bilddatei', { filename });
        
        recognizeImageText(
            `uploads/${filename}`,
            {},
            function(success, result) {
                logDebug('Bild-OCR abgeschlossen', { 
                    success, 
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