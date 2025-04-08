/**
 * pdf-handler.js - Funktionen für die Anzeige und Verarbeitung von PDF-Dateien
 */

// Debug-Logging aktivieren (auf false setzen für Produktion)
const PDF_DEBUG = true;

// Debug-Funktion
function logPdfDebug(message, data) {
    if (PDF_DEBUG) {
        console.log('[PDF] ' + message, data);
    }
}

// PDF laden und anzeigen (bleibt weitgehend unverändert)
function loadPDF(filename) {
    logPdfDebug('Lade PDF', { filename: filename });
    
    const pdfId = filename.replace(/\./g, '_');
    const canvas = document.querySelector(`#pdf_${pdfId} canvas`);
    const prevButton = document.getElementById(`prev_${pdfId}`);
    const nextButton = document.getElementById(`next_${pdfId}`);
    const pageNumSpan = document.getElementById(`page_num_${pdfId}`);
    const pageCountSpan = document.getElementById(`page_count_${pdfId}`);
    
    if (!canvas || !prevButton || !nextButton || !pageNumSpan || !pageCountSpan) {
        logPdfDebug('PDF-Elemente nicht gefunden', { pdfId: pdfId });
        return;
    }
    
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    
    function renderPage(num) {
        pageRendering = true;
        logPdfDebug('Rendere PDF-Seite', { page: num });
        
        pdfDoc.getPage(num).then(function(page) {
            const viewport = page.getViewport({scale: 1.5});
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            };
            
            const renderTask = page.render(renderContext);
            
            renderTask.promise.then(function() {
                pageRendering = false;
                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
                logPdfDebug('Seite gerendert', { page: num });
            }).catch(function(error) {
                logPdfDebug('Fehler beim Rendern der Seite', { 
                    page: num, 
                    error: error.message 
                });
            });
        }).catch(function(error) {
            logPdfDebug('Fehler beim Laden der Seite', { 
                page: num, 
                error: error.message 
            });
        });
        
        pageNumSpan.textContent = num;
        
        prevButton.disabled = num <= 1;
        nextButton.disabled = num >= pdfDoc.numPages;
    }
    
    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }
    
    function onPrevPage() {
        if (pageNum <= 1) {
            return;
        }
        pageNum--;
        queueRenderPage(pageNum);
    }
    
    function onNextPage() {
        if (pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
    }
    
    pdfjsLib.getDocument(`uploads/${filename}`).promise.then(function(pdfDoc_) {
        pdfDoc = pdfDoc_;
        pageCountSpan.textContent = pdfDoc.numPages;
        logPdfDebug('PDF geladen', { 
            filename: filename, 
            pages: pdfDoc.numPages 
        });
        
        renderPage(pageNum);
        
        prevButton.addEventListener('click', onPrevPage);
        nextButton.addEventListener('click', onNextPage);
    }).catch(function(error) {
        logPdfDebug('Fehler beim Laden des PDFs', { 
            filename: filename, 
            error: error.message 
        });
    });
}

// PDF-Texterkennung für alle Seiten (für Space OCR angepasst, mit Korrektur für Call Stack)
function processMultipagePDF(filename, options, progressCallback, completeCallback) {
    logPdfDebug('Starte PDF-Texterkennung', { filename: filename });
    
    pdfjsLib.getDocument(`uploads/${filename}`).promise.then(function(pdfDoc) {
        const numPages = pdfDoc.numPages;
        let completeText = '';
        let processedPages = 0;
        
        // Status am Anfang aktualisieren
        if (progressCallback) {
            progressCallback(0, numPages, `PDF mit ${numPages} Seiten wird verarbeitet...`);
        }
        
        // Iterative Verarbeitung statt Rekursion, um Call Stack Overflow zu vermeiden
        function processPages() {
            // Beginne mit Seite 1
            let currentPage = 1;
            
            // Funktion zur Verarbeitung einer einzelnen Seite
            function processPage() {
                // Status aktualisieren
                if (progressCallback) {
                    progressCallback(currentPage, numPages, `Verarbeite Seite ${currentPage} von ${numPages}...`);
                }
                
                logPdfDebug('Verarbeite PDF-Seite', { 
                    page: currentPage, 
                    total: numPages 
                });
                
                processPDFPageForOCR(pdfDoc, currentPage, options, function(err, text) {
                    processedPages++;
                    
                    if (!err && text) {
                        // Text dieser Seite formatieren
                        let formattedText = '';
                        try {
                            formattedText = formatText(text);
                        } catch (formatError) {
                            logPdfDebug('Fehler bei Textformatierung', { 
                                page: currentPage, 
                                error: formatError.message 
                            });
                            formattedText = text.trim();
                        }
                        
                        if (formattedText) {
                            completeText += (completeText ? '\n\n=== SEITE ' + currentPage + ' ===\n\n' : '=== SEITE ' + currentPage + ' ===\n\n') + formattedText;
                        }
                    } else if (err) {
                        logPdfDebug('Fehler bei Seitenverarbeitung', { 
                            page: currentPage, 
                            error: err.message 
                        });
                    }
                    
                    // Nächste Seite oder fertig
                    if (currentPage < numPages) {
                        currentPage++;
                        // Verwende setTimeout, um den Call Stack zu entlasten
                        setTimeout(processPage, 0);
                    } else {
                        // Alle Seiten verarbeitet
                        logPdfDebug('PDF-Verarbeitung abgeschlossen', { 
                            pages: numPages, 
                            textLength: completeText.length 
                        });
                        
                        if (completeText) {
                            completeCallback(true, completeText, `Text aus ${numPages} Seiten erkannt`);
                        } else {
                            completeCallback(false, '', 'Kein Text im PDF gefunden');
                        }
                    }
                });
            }
            
            // Starte mit der ersten Seite
            processPage();
        }
        
        // Starte den Verarbeitungsprozess
        processPages();
        
    }).catch(function(error) {
        // Fehler beim Laden des PDFs
        logPdfDebug('Fehler beim Laden des PDFs für OCR', { 
            filename: filename, 
            error: error.message 
        });
        completeCallback(false, '', `PDF konnte nicht geladen werden: ${error.message}`);
    });
}