/**
 * pdf-handler.js - Optimierte Funktionen für die Anzeige und Verarbeitung von PDF-Dateien
 */

// Konfiguration
const PDF_CONFIG = {
    DEBUG: true,           // Debug-Modus
    SCALE: 1.5,            // Skalierungsfaktor für PDF-Rendering
    WORKER_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
    UPLOAD_PATH: 'uploads/' // Pfad zu hochgeladenen Dateien
};

// Logger-Klasse
class PdfLogger {
    static log(message, data) {
        if (!PDF_CONFIG.DEBUG) return;
        console.log(`[PDF] ${message}`, data || '');
    }
    
    static error(message, error) {
        if (!PDF_CONFIG.DEBUG) return;
        console.error(`[PDF Error] ${message}`, error || '');
    }
}

// PDF-Viewer-Klasse
class PdfViewer {
    /**
     * Lädt und zeigt ein PDF an
     * @param {string} filename - Dateiname des PDFs
     */
    static loadPdf(filename) {
        PdfLogger.log('Lade PDF', { filename });
        
        const pdfId = filename.replace(/\./g, '_');
        const elements = {
            canvas: document.querySelector(`#pdf_${pdfId} canvas`),
            prevButton: document.getElementById(`prev_${pdfId}`),
            nextButton: document.getElementById(`next_${pdfId}`),
            pageNumSpan: document.getElementById(`page_num_${pdfId}`),
            pageCountSpan: document.getElementById(`page_count_${pdfId}`)
        };
        
        // Prüfen, ob alle benötigten Elemente vorhanden sind
        if (!elements.canvas || !elements.prevButton || !elements.nextButton || 
            !elements.pageNumSpan || !elements.pageCountSpan) {
            PdfLogger.error('PDF-Elemente nicht gefunden', { pdfId });
            return;
        }
        
        // PDF laden
        let pdfDoc = null;
        let pageNum = 1;
        let pageRendering = false;
        let pageNumPending = null;
        
        // PDF-Seite rendern
        const renderPage = (num) => {
            pageRendering = true;
            PdfLogger.log('Rendere Seite', { page: num });
            
            pdfDoc.getPage(num).then((page) => {
                const viewport = page.getViewport({ scale: PDF_CONFIG.SCALE });
                elements.canvas.height = viewport.height;
                elements.canvas.width = viewport.width;
                
                const renderContext = {
                    canvasContext: elements.canvas.getContext('2d'),
                    viewport: viewport
                };
                
                page.render(renderContext).promise
                    .then(() => {
                        pageRendering = false;
                        
                        if (pageNumPending !== null) {
                            renderPage(pageNumPending);
                            pageNumPending = null;
                        }
                        
                        PdfLogger.log('Seite gerendert', { page: num });
                    })
                    .catch((error) => {
                        PdfLogger.error('Fehler beim Rendern der Seite', { 
                            page: num, 
                            error: error.message 
                        });
                    });
                
                // Navigation aktualisieren
                elements.pageNumSpan.textContent = num;
                elements.prevButton.disabled = num <= 1;
                elements.nextButton.disabled = num >= pdfDoc.numPages;
            })
            .catch((error) => {
                PdfLogger.error('Fehler beim Laden der Seite', { 
                    page: num, 
                    error: error.message 
                });
            });
        };
        
        // Warteschlange für Seitenrendering
        const queueRenderPage = (num) => {
            if (pageRendering) {
                pageNumPending = num;
            } else {
                renderPage(num);
            }
        };
        
        // Event-Handler für Navigation
        elements.prevButton.addEventListener('click', () => {
            if (pageNum <= 1) return;
            pageNum--;
            queueRenderPage(pageNum);
        });
        
        elements.nextButton.addEventListener('click', () => {
            if (pageNum >= pdfDoc.numPages) return;
            pageNum++;
            queueRenderPage(pageNum);
        });
        
        // PDF laden
        pdfjsLib.getDocument(`${PDF_CONFIG.UPLOAD_PATH}${filename}`).promise
            .then((doc) => {
                pdfDoc = doc;
                elements.pageCountSpan.textContent = pdfDoc.numPages;
                
                PdfLogger.log('PDF geladen', { 
                    filename, 
                    pages: pdfDoc.numPages 
                });
                
                renderPage(pageNum);
            })
            .catch((error) => {
                PdfLogger.error('Fehler beim Laden des PDFs', { 
                    filename, 
                    error: error.message 
                });
            });
    }
}

/**
 * PDF-OCR-Klasse zum Erkennen von Text in PDFs
 */
class PdfOcr {
    /**
     * Verarbeitet ein mehrseitiges PDF für OCR
     * @param {string} filename - Dateiname des PDFs
     * @param {Object} options - Verarbeitungsoptionen
     * @param {Function} progressCallback - Callback für Fortschrittsupdate (pageNum, totalPages, statusMessage)
     * @param {Function} completeCallback - Callback für Abschluss (success, text, message)
     */
    static processMultipagePdf(filename, options, progressCallback, completeCallback) {
        PdfLogger.log('Starte PDF-Texterkennung', { filename });
        
        pdfjsLib.getDocument(`${PDF_CONFIG.UPLOAD_PATH}${filename}`).promise
            .then((pdfDoc) => {
                const numPages = pdfDoc.numPages;
                let completeText = '';
                
                // Status am Anfang aktualisieren
                if (progressCallback) {
                    progressCallback(0, numPages, `PDF mit ${numPages} Seiten wird verarbeitet...`);
                }
                
                // Iterative Verarbeitung der Seiten
                this.processPages(pdfDoc, numPages, options, progressCallback, (success, text) => {
                    if (success && text) {
                        completeCallback(true, text, `Text aus ${numPages} Seiten erkannt`);
                    } else {
                        completeCallback(false, '', 'Kein Text im PDF gefunden');
                    }
                });
            })
            .catch((error) => {
                PdfLogger.error('Fehler beim Laden des PDFs für OCR', { 
                    filename, 
                    error: error.message 
                });
                completeCallback(false, '', `PDF konnte nicht geladen werden: ${error.message}`);
            });
    }
    
    /**
     * Verarbeitet PDF-Seiten sequentiell
     * @private
     */
    static processPages(pdfDoc, totalPages, options, progressCallback, finalCallback) {
        let currentPage = 1;
        let completeText = '';
        
        // Verarbeitungsfunktion für eine einzelne Seite
        const processPage = () => {
            if (progressCallback) {
                progressCallback(currentPage, totalPages, `Verarbeite Seite ${currentPage} von ${totalPages}...`);
            }
            
            PdfLogger.log('Verarbeite PDF-Seite', { page: currentPage, total: totalPages });
            
            // Externe Funktion zur OCR-Verarbeitung aufrufen (aus ocr.js)
            processPDFPageForOCR(pdfDoc, currentPage, options, (err, text) => {
                if (!err && text) {
                    try {
                        // Text formatieren und zum Gesamttext hinzufügen
                        let formattedText = typeof formatText === 'function' ? formatText(text) : text.trim();
                        
                        if (formattedText) {
                            const pageHeader = (completeText ? '\n\n=== SEITE ' + currentPage + ' ===\n\n' : '=== SEITE ' + currentPage + ' ===\n\n');
                            completeText += pageHeader + formattedText;
                        }
                    } catch (formatError) {
                        PdfLogger.error('Fehler bei Textformatierung', { 
                            page: currentPage, 
                            error: formatError.message 
                        });
                        // Rohtext verwenden, wenn Formatierung fehlschlägt
                        completeText += (completeText ? '\n\n=== SEITE ' + currentPage + ' ===\n\n' : '=== SEITE ' + currentPage + ' ===\n\n') + text.trim();
                    }
                } else if (err) {
                    PdfLogger.error('Fehler bei Seitenverarbeitung', { 
                        page: currentPage, 
                        error: err.message 
                    });
                }
                
                // Zur nächsten Seite oder Abschluss
                if (currentPage < totalPages) {
                    currentPage++;
                    // setTimeout verwenden, um den Call Stack zu entlasten
                    setTimeout(processPage, 0);
                } else {
                    // Verarbeitung abgeschlossen
                    PdfLogger.log('PDF-Verarbeitung abgeschlossen', { 
                        pages: totalPages, 
                        textLength: completeText.length 
                    });
                    
                    finalCallback(completeText.length > 0, completeText);
                }
            });
        };
        
        // Starte mit der ersten Seite
        processPage();
    }
}

// Öffentliche API-Funktionen, die von anderen Skripten aufgerufen werden

/**
 * Lädt und zeigt ein PDF an
 * @param {string} filename - Dateiname des PDFs
 */
function loadPDF(filename) {
    PdfViewer.loadPdf(filename);
}

/**
 * Verarbeitet ein mehrseitiges PDF für OCR
 * @param {string} filename - Dateiname des PDFs
 * @param {Object} options - Verarbeitungsoptionen
 * @param {Function} progressCallback - Callback für Fortschrittsupdate
 * @param {Function} completeCallback - Callback für Abschluss
 */
function processMultipagePDF(filename, options, progressCallback, completeCallback) {
    PdfOcr.processMultipagePdf(filename, options, progressCallback, completeCallback);
}

// Worker für PDF.js initialisieren (bei Ladung der Seite)
pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_URL;