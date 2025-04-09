/**
 * pdf-handler.js - Fixed version for "progress is not defined" error
 */

// Debug-Logging aktivieren (auf false setzen für Produktion)
const PDF_DEBUG = true;

// Debug-Funktion
function logPdfDebug(message, data) {
    if (PDF_DEBUG) {
        console.log('[PDF] ' + message, data || '');
    }
}

// PDF laden und anzeigen
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

// Simplified PDF OCR processing to fix the "progress is not defined" error
function processMultipagePDF(filename, options, progressCallback, completeCallback) {
    // Ensure callbacks are functions to prevent "is not defined" errors
    const updateProgress = typeof progressCallback === 'function' ? progressCallback : function() {};
    const onComplete = typeof completeCallback === 'function' ? completeCallback : function() {};
    
    logPdfDebug('Starting PDF OCR', { filename });
    
    // Use PDF.js to load the document
    pdfjsLib.getDocument(`uploads/${filename}`).promise
        .then(function(pdfDoc) {
            const numPages = pdfDoc.numPages;
            let allText = '';
            let processedPages = 0;
            
            // Update initial progress
            updateProgress(0, numPages, `PDF mit ${numPages} Seiten wird verarbeitet...`);
            
            // Process each page sequentially with setTimeout to avoid stack overflow
            function processNextPage(pageNum) {
                if (pageNum > numPages) {
                    // All pages processed
                    if (allText) {
                        onComplete(true, allText, `Text aus ${numPages} Seiten erkannt`);
                    } else {
                        onComplete(false, '', 'Kein Text im PDF gefunden');
                    }
                    return;
                }
                
                // Update progress
                updateProgress(pageNum, numPages, `Verarbeite Seite ${pageNum} von ${numPages}...`);
                
                // Get the page
                pdfDoc.getPage(pageNum).then(function(page) {
                    // Create a canvas and render the page
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    const renderContext = {
                        canvasContext: canvas.getContext('2d'),
                        viewport: viewport
                    };
                    
                    // Render the page to canvas
                    page.render(renderContext).promise.then(function() {
                        // Convert the page to an image
                        try {
                            const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
                            
                            // Send to OCR API
                            fetch('ocr_space_proxy.php', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    base64Image: base64Image,
                                    language: 'ger' // German
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success && data.text) {
                                    // Format the text for this page
                                    let pageText = formatText(data.text);
                                    
                                    // Add the text to our collection
                                    if (pageText) {
                                        allText += (allText ? '\n\n=== SEITE ' + pageNum + ' ===\n\n' : '=== SEITE ' + pageNum + ' ===\n\n') + pageText;
                                    }
                                } 
                                
                                // Process the next page
                                processedPages++;
                                setTimeout(() => processNextPage(pageNum + 1), 10);
                            })
                            .catch(error => {
                                logPdfDebug('OCR API error', { page: pageNum, error: error.message });
                                // Continue to next page even if this one failed
                                processedPages++;
                                setTimeout(() => processNextPage(pageNum + 1), 10);
                            });
                        } catch (error) {
                            logPdfDebug('Canvas processing error', { page: pageNum, error: error.message });
                            // Continue to next page even if this one failed
                            processedPages++;
                            setTimeout(() => processNextPage(pageNum + 1), 10);
                        }
                    }).catch(function(error) {
                        logPdfDebug('Page rendering error', { page: pageNum, error: error.message });
                        // Continue to next page even if this one failed
                        processedPages++;
                        setTimeout(() => processNextPage(pageNum + 1), 10);
                    });
                }).catch(function(error) {
                    logPdfDebug('Page loading error', { page: pageNum, error: error.message });
                    // Continue to next page even if this one failed
                    processedPages++;
                    setTimeout(() => processNextPage(pageNum + 1), 10);
                });
            }
            
            // Start processing with the first page
            processNextPage(1);
            
        })
        .catch(function(error) {
            logPdfDebug('PDF loading error', { error: error.message });
            onComplete(false, '', `PDF konnte nicht geladen werden: ${error.message}`);
        });
}