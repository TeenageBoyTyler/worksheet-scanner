/**
 * ocr.js - Enhanced functions for OCR text recognition with Space OCR API
 * With language detection and image preprocessing
 */

// Proxy-URL for Space OCR API
const OCR_SPACE_PROXY = 'ocr_space_proxy.php';

// Debug-Logging enable (set to false for production)
const DEBUG = true;

// Maximum number of PDF pages for OCR (Space OCR API Limit)
const MAX_PDF_PAGES = 3;

// Debug function
function logDebug(message, data) {
    if (DEBUG) {
        console.log('[OCR] ' + message, data || '');
    }
}

// Prepare image for OCR
function prepareImageForOCR(imageUrl, callback) {
    logDebug('Preparing image', { url: imageUrl });
    
    const img = new Image();
    
    img.onload = function() {
        logDebug('Image loaded', { width: img.width, height: img.height });
        
        // Limit size to max 2000px, but maintain aspect ratio
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
        
        // Draw image with smoothing
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        logDebug('Image drawn on canvas', { canvasWidth: canvas.width, canvasHeight: canvas.height });
        callback(null, canvas);
    };
    
    img.onerror = function(error) {
        logDebug('Error loading image', error);
        callback(new Error('Image could not be loaded'), null);
    };
    
    img.src = imageUrl;
}

// Base64 encoding for a canvas element
function canvasToBase64(canvas) {
    try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64 = dataUrl.split(',')[1];
        logDebug('Image converted to Base64', { length: base64.length });
        return base64;
    } catch (error) {
        logDebug('Error converting to Base64', error);
        throw new Error('Image could not be converted to Base64: ' + error.message);
    }
}

// OCR with Space OCR API
function sendToOCR(base64Image, options = {}) {
    logDebug('Sending image to OCR API', { 
        base64Length: base64Image.length,
        options: options
    });
    
    // Prepare request data
    const requestData = {
        base64Image: base64Image
    };
    
    // Add language if specified
    if (options.language) {
        requestData.language = options.language;
    }
    
    return fetch(OCR_SPACE_PROXY, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        logDebug('OCR API response received', { status: response.status });
        if (!response.ok) {
            throw new Error('HTTP error: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        logDebug('OCR API data processed', data);
        if (!data.success || !data.text) {
            throw new Error(data.message || 'OCR failed');
        }
        
        // Return both text and detected language if available
        const result = {
            text: data.text,
            language: data.language || 'unknown'
        };
        
        return result;
    });
}

// Perform OCR on an image
function recognizeImageText(imageUrl, options, callback) {
    logDebug('Starting text recognition for', { url: imageUrl });
    
    prepareImageForOCR(imageUrl, function(err, canvas) {
        if (err) {
            logDebug('Error preparing image', err);
            callback(false, err.message);
            return;
        }
        
        try {
            // Convert image to Base64
            const base64Image = canvasToBase64(canvas);
            
            // Perform OCR
            sendToOCR(base64Image, options)
                .then(result => {
                    // Format and return text
                    const formattedText = formatText(result.text);
                    logDebug('Text recognized and formatted', { 
                        textLength: formattedText.length,
                        language: result.language
                    });
                    callback(true, formattedText, result.language);
                })
                .catch(error => {
                    logDebug('Error in OCR request', error);
                    callback(false, 'OCR error: ' + error.message);
                });
        } catch (error) {
            logDebug('Error in OCR process', error);
            callback(false, 'OCR error: ' + error.message);
        }
    });
}

// Process PDF for OCR
function processPDFforOCR(filename, progressCallback, resultCallback) {
    logDebug('Processing PDF', { filename });
    
    // Load PDF
    pdfjsLib.getDocument('uploads/' + filename).promise
        .then(pdf => {
            const numPages = pdf.numPages;
            const pagesToProcess = Math.min(numPages, MAX_PDF_PAGES); // Respect API limit
            let allText = '';
            let processedPages = 0;
            let detectedLanguage = null;
            
            logDebug('PDF loaded', { 
                totalPages: numPages, 
                pagesToProcess: pagesToProcess 
            });
            
            // Update status
            if (progressCallback) {
                if (numPages > MAX_PDF_PAGES) {
                    progressCallback(0, pagesToProcess, 
                        `PDF with ${numPages} pages found, processing first ${MAX_PDF_PAGES} pages...`);
                } else {
                    progressCallback(0, pagesToProcess, 
                        `Processing PDF with ${numPages} pages...`);
                }
            }
            
            // Process pages sequentially
            function processNextPage(pageIndex) {
                // Done when all pages are processed
                if (pageIndex > pagesToProcess) {
                    logDebug('All PDF pages processed', { 
                        textLength: allText.length,
                        language: detectedLanguage
                    });
                    
                    // Add note if not all pages were processed
                    if (numPages > MAX_PDF_PAGES) {
                        allText = `NOTE: This PDF has ${numPages} pages. Due to API limitations, only the first ${MAX_PDF_PAGES} pages were processed.\n\n` + allText;
                    }
                    
                    resultCallback(true, allText, 
                        numPages > MAX_PDF_PAGES 
                            ? `Text recognized from first ${MAX_PDF_PAGES} of ${numPages} pages`
                            : `Text recognized from ${numPages} pages`,
                        detectedLanguage);
                    return;
                }
                
                // Update status
                if (progressCallback) {
                    progressCallback(pageIndex, pagesToProcess, 
                        `Processing page ${pageIndex} of ${pagesToProcess}...`);
                }
                
                logDebug('Processing PDF page', { page: pageIndex });
                
                // Render page
                pdf.getPage(pageIndex).then(page => {
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    const renderContext = {
                        canvasContext: canvas.getContext('2d'),
                        viewport: viewport
                    };
                    
                    // Render page and then process as image
                    page.render(renderContext).promise.then(() => {
                        try {
                            // Convert to Base64
                            const base64Image = canvasToBase64(canvas);
                            
                            // Create OCR options
                            const ocrOptions = {};
                            
                            // If we already detected a language, use it for consistency
                            if (detectedLanguage) {
                                ocrOptions.language = detectedLanguage;
                            }
                            
                            // Perform OCR for this page
                            sendToOCR(base64Image, ocrOptions)
                                .then(result => {
                                    // Store the first detected language for consistent processing
                                    if (!detectedLanguage && result.language) {
                                        detectedLanguage = result.language;
                                        logDebug('Language detected for PDF', { language: detectedLanguage });
                                    }
                                    
                                    // Process text from this page
                                    const pageText = formatText(result.text);
                                    if (pageText && pageText.trim().length > 0) {
                                        // Add page text to overall text
                                        allText += (allText ? '\n\n=== PAGE ' + pageIndex + ' ===\n\n' : '=== PAGE ' + pageIndex + ' ===\n\n') + pageText;
                                    }
                                    
                                    // Process next page
                                    processedPages++;
                                    setTimeout(() => processNextPage(pageIndex + 1), 100);
                                })
                                .catch(error => {
                                    logDebug('OCR error for page', {
                                        page: pageIndex,
                                        error: error.message
                                    });
                                    
                                    // Continue to next page despite error
                                    processedPages++;
                                    setTimeout(() => processNextPage(pageIndex + 1), 100);
                                });
                        } catch (error) {
                            logDebug('Error processing page', {
                                page: pageIndex,
                                error: error.message
                            });
                            
                            // Continue to next page despite error
                            processedPages++;
                            setTimeout(() => processNextPage(pageIndex + 1), 100);
                        }
                    }).catch(error => {
                        logDebug('Error rendering page', {
                            page: pageIndex,
                            error: error.message
                        });
                        
                        // Continue to next page despite error
                        processedPages++;
                        setTimeout(() => processNextPage(pageIndex + 1), 100);
                    });
                }).catch(error => {
                    logDebug('Error loading page', {
                        page: pageIndex,
                        error: error.message
                    });
                    
                    // Continue to next page despite error
                    processedPages++;
                    setTimeout(() => processNextPage(pageIndex + 1), 100);
                });
            }
            
            // Start with the first page
            processNextPage(1);
        })
        .catch(error => {
            logDebug('Error loading PDF', error);
            resultCallback(false, '', 'Could not load PDF: ' + error.message);
        });
}

// Format text for better readability
function formatText(text) {
    if (!text) return '';
    
    logDebug('Formatting text', { length: text.length });
    
    // Use external formatting function if available
    if (window.formatText && typeof window.formatText === 'function') {
        try {
            return window.formatText(text);
        } catch (error) {
            logDebug('Error in external text formatting', error);
            return text.trim();
        }
    }
    
    // Simple formatting if no external function is available
    return text.trim();
}

// Save scanned text on the server
function saveScannedText(filename, text) {
    fetch('save_text.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'filename=' + encodeURIComponent(filename) + '&text=' + encodeURIComponent(text)
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            // Silent handling of saving error
        }
    })
    .catch(() => {
        // Silent handling of error without console output
    });
}

// Automatic text recognition for uploaded files
function scanUploadedFile(filename, callback) {
    logDebug('Starting text recognition for file', { filename });
    
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isPdf = fileExtension === 'pdf';
    
    if (isPdf) {
        // For PDFs: Use the PDF processing method
        processPDFforOCR(
            filename,
            // Status update callback
            function(currentPage, totalPages, statusMessage) {
                // Update progress
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
                
                logDebug('PDF progress updated', { 
                    currentPage,
                    totalPages,
                    progress: Math.round((currentPage / totalPages) * 100) + '%'
                });
            },
            // Result callback
            function(success, text, message, language) {
                logDebug('PDF processing completed', { 
                    success, 
                    textLength: text ? text.length : 0,
                    message,
                    language
                });
                
                if (success && text) {
                    saveScannedText(filename, text);
                    
                    // Store detected language in metadata if available
                    if (language) {
                        updateFileLanguage(filename, language);
                    }
                }
                callback(success, message);
            }
        );
    } else {
        // For images: Perform OCR
        logDebug('Processing image file', { filename });
        
        recognizeImageText(
            `uploads/${filename}`,
            {},
            function(success, result, language) {
                logDebug('Image OCR completed', { 
                    success, 
                    resultLength: result ? result.length : 0,
                    language
                });
                
                if (success) {
                    saveScannedText(filename, result);
                    
                    // Store detected language in metadata if available
                    if (language) {
                        updateFileLanguage(filename, language);
                    }
                    
                    callback(true, 'Image text recognized');
                } else {
                    callback(false, result); // Result contains error message
                }
            }
        );
    }
}

// Update file metadata with detected language
function updateFileLanguage(filename, language) {
    // Store the detected language in file metadata for future reference
    logDebug('Language detected for file', { 
        filename, 
        language 
    });
    
    // Call the backend endpoint to update metadata
    fetch('update_file_language.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filename: filename,
            language: language
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            logDebug('File language updated in metadata', { filename, language });
        } else {
            logDebug('Failed to update file language', { reason: data.message });
        }
    })
    .catch(error => {
        logDebug('Error updating file language', { error: error.message });
    });
}