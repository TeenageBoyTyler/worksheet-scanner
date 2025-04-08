/**
 * pdf-handler.js - Funktionen für die Anzeige und Verarbeitung von PDF-Dateien
 */

// PDF laden und anzeigen
function loadPDF(filename) {
    const pdfId = filename.replace(/\./g, '_');
    const canvas = document.querySelector(`#pdf_${pdfId} canvas`);
    const prevButton = document.getElementById(`prev_${pdfId}`);
    const nextButton = document.getElementById(`next_${pdfId}`);
    const pageNumSpan = document.getElementById(`page_num_${pdfId}`);
    const pageCountSpan = document.getElementById(`page_count_${pdfId}`);
    
    if (!canvas || !prevButton || !nextButton || !pageNumSpan || !pageCountSpan) {
        // PDF-Element nicht gefunden - stille Behandlung
        return;
    }
    
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    
    function renderPage(num) {
        pageRendering = true;
        
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
        
        renderPage(pageNum);
        
        prevButton.addEventListener('click', onPrevPage);
        nextButton.addEventListener('click', onNextPage);
    }).catch(function() {
        // Fehler beim Laden des PDFs - stille Behandlung
    });
}

// PDF-Seite für OCR verarbeiten
function processPDFPageForOCR(pdfDoc, pageNum, tessConfig, callback) {
    pdfDoc.getPage(pageNum).then(function(page) {
        const canvas = document.createElement('canvas');
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        };
        
        page.render(renderContext).promise.then(function() {
            // Seite mit Tesseract verarbeiten
            Tesseract.recognize(
                canvas,
                'deu', // Standard: Deutsch
                tessConfig
            ).then(({ data: { text } }) => {
                callback(null, text);
            }).catch(err => {
                callback(err, null);
            });
        }).catch(function(err) {
            callback(err, null);
        });
    }).catch(function(err) {
        callback(err, null);
    });
}

// PDF-Texterkennung für alle Seiten
function processMultipagePDF(filename, tessConfig, progressCallback, completeCallback) {
    pdfjsLib.getDocument(`uploads/${filename}`).promise.then(function(pdfDoc) {
        const numPages = pdfDoc.numPages;
        let completeText = '';
        let processedPages = 0;
        
        // Status am Anfang aktualisieren
        if (progressCallback) {
            progressCallback(0, numPages, `PDF mit ${numPages} Seiten wird verarbeitet...`);
        }
        
        // Funktion zum rekursiven Verarbeiten aller Seiten
        function processPage(pageNum) {
            // Status aktualisieren
            if (progressCallback) {
                progressCallback(pageNum, numPages, `Verarbeite Seite ${pageNum} von ${numPages}...`);
            }
            
            processPDFPageForOCR(pdfDoc, pageNum, tessConfig, function(err, text) {
                processedPages++;
                
                if (!err && text) {
                    // Text dieser Seite formatieren
                    let formattedText = formatText(text);
                    if (formattedText) {
                        completeText += (completeText ? '\n\n=== SEITE ' + pageNum + ' ===\n\n' : '=== SEITE ' + pageNum + ' ===\n\n') + formattedText;
                    }
                }
                
                // Nächste Seite oder fertig
                if (pageNum < numPages) {
                    processPage(pageNum + 1);
                } else {
                    // Alle Seiten verarbeitet
                    if (completeText) {
                        completeCallback(true, completeText, `Text aus ${numPages} Seiten erkannt`);
                    } else {
                        completeCallback(false, '', 'Kein Text im PDF gefunden');
                    }
                }
            });
        }
        
        // Starte mit der ersten Seite
        processPage(1);
        
    }).catch(function() {
        // Fehler beim Laden des PDFs
        completeCallback(false, '', 'PDF konnte nicht geladen werden');
    });
}