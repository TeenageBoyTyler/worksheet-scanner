/**
 * utils.js - Helper functions for the image upload application
 * Updated with language display functionality
 */

// Highlight text with search term
function highlightText(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    // Regex for case-insensitive search
    const regex = new RegExp(searchTerm, 'gi');
    return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}

// Format text for better readability
function formatText(text) {
    // Reduce multiple spaces
    text = text.replace(/\s+/g, ' ');
    
    // Reduce multiple line breaks
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Detect and format paragraphs
    text = text.replace(/([.!?])\s+(\w)/g, '$1\n\n$2');
    
    // Detect and format lists
    text = text.replace(/(\d+\.\s*\w)/g, '\n$1');
    
    // Detect and fix hyphenation at line breaks
    text = text.replace(/(\w+)-\n(\w+)/g, '$1$2');
    
    return text.trim();
}

// Save scanned text on server
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

// Load text content from saved text files
function loadText(filename, textElement) {
    fetch('get_text.php?filename=' + encodeURIComponent(filename))
        .then(response => response.json())
        .then(data => {
            if (data.success && data.text) {
                textElement.textContent = data.text;
            }
        })
        .catch(() => {
            // Silent handling of error without console output
        });
}

// Display language name based on language code
function getLanguageName(langCode) {
    const languages = {
        'eng': 'English',
        'ger': 'German',
        'fre': 'French',
        'spa': 'Spanish',
        'ita': 'Italian',
        'por': 'Portuguese',
        'dut': 'Dutch',
        'rus': 'Russian',
        'chi_sim': 'Chinese (Simplified)',
        'chi_tra': 'Chinese (Traditional)',
        'jpn': 'Japanese',
        'kor': 'Korean',
        'ara': 'Arabic',
        'tur': 'Turkish',
        'pol': 'Polish',
        'nor': 'Norwegian',
        'swe': 'Swedish',
        'fin': 'Finnish',
        'dan': 'Danish',
        'hun': 'Hungarian',
        'cze': 'Czech',
        'gre': 'Greek',
        'rom': 'Romanian',
        'bul': 'Bulgarian',
        'slo': 'Slovak',
        'slv': 'Slovenian',
        'hrv': 'Croatian',
        'ukr': 'Ukrainian',
        'heb': 'Hebrew',
        'tha': 'Thai',
        'vie': 'Vietnamese',
        'ind': 'Indonesian',
        'mal': 'Malayalam',
        'tel': 'Telugu',
        'tam': 'Tamil',
        'lat': 'Latin'
    };
    
    return languages[langCode] || 'Unknown';
}

// Load tags and language information for a file
function loadTags(filename, tagsElement) {
    fetch('get_metadata.php?filename=' + encodeURIComponent(filename))
        .then(response => response.json())
        .then(data => {
            if (data.success && data.metadata) {
                // Process tags
                if (data.metadata.tags && data.metadata.tags.length > 0) {
                    tagsElement.innerHTML = '';
                    data.metadata.tags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tag';
                        tagSpan.textContent = tag;
                        
                        // Add specific class based on tag content
                        if (tag === 'Deutsch') {
                            tagSpan.classList.add('tag-deutsch');
                        } else if (tag === 'Mathematik') {
                            tagSpan.classList.add('tag-mathematik');
                        } else if (tag === 'Sachunterricht') {
                            tagSpan.classList.add('tag-sachunterricht');
                        } else if (tag === 'Englisch') {
                            tagSpan.classList.add('tag-englisch');
                        } else if (tag === 'Andere') {
                            tagSpan.classList.add('tag-andere');
                        }
                        
                        tagsElement.appendChild(tagSpan);
                    });
                    
                    // Add language indicator if available
                    if (data.metadata.language) {
                        const languageCode = data.metadata.language;
                        const languageName = getLanguageName(languageCode);
                        
                        const langDiv = document.createElement('div');
                        langDiv.className = `language-indicator language-${languageCode}`;
                        langDiv.innerHTML = `<span class="language-flag"></span> ${languageName}`;
                        
                        tagsElement.appendChild(langDiv);
                    }
                    
                    // Add edit button to the tags container (if tagEditor is available)
                    if (typeof tagEditor !== 'undefined') {
                        tagEditor.addEditButton(tagsElement);
                    }
                } else {
                    tagsElement.innerHTML = '<span class="no-tags">No Tags</span>';
                    
                    // Add language indicator if available even without tags
                    if (data.metadata.language) {
                        const languageCode = data.metadata.language;
                        const languageName = getLanguageName(languageCode);
                        
                        const langDiv = document.createElement('div');
                        langDiv.className = `language-indicator language-${languageCode}`;
                        langDiv.innerHTML = `<span class="language-flag"></span> ${languageName}`;
                        
                        tagsElement.appendChild(langDiv);
                    }
                    
                    // Add edit button even when there are no tags
                    if (typeof tagEditor !== 'undefined') {
                        tagEditor.addEditButton(tagsElement);
                    }
                }
            } else {
                tagsElement.innerHTML = '<span class="no-tags">No Tags</span>';
                
                // Add edit button even when metadata is not available
                if (typeof tagEditor !== 'undefined') {
                    tagEditor.addEditButton(tagsElement);
                }
            }
        })
        .catch(() => {
            tagsElement.innerHTML = '<span class="no-tags">No Tags</span>';
            
            // Add edit button even in case of an error
            if (typeof tagEditor !== 'undefined') {
                tagEditor.addEditButton(tagsElement);
            }
        });
}

// Print file
function printFile(filename) {
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isPdf = fileExtension === 'pdf';
    const fileUrl = 'uploads/' + filename;
    
    // For PDFs
    if (isPdf) {
        window.open(fileUrl, '_blank');
    } 
    // For images
    else {
        var printWin = window.open('', '_blank');
        printWin.document.write('<html><head><title>Print</title>');
        printWin.document.write('<style>body{margin:0;padding:0;text-align:center;}img{max-width:100%;height:auto;}</style>');
        printWin.document.write('</head><body>');
        printWin.document.write('<img src="' + fileUrl + '" alt="' + filename + '">');
        printWin.document.write('</body></html>');
        printWin.document.close();
        
        printWin.onload = function() {
            printWin.focus();
            printWin.print();
        };
    }
}

// Basic clearSearch implementation - will be replaced by tag-filter.js
function clearSearch() {
    // Simply load all images - tag-filter.js will provide the full implementation
    loadImages();
}

// Delete image
function deleteImage(filename) {
    if (confirm('Are you sure you want to delete this file?')) {
        fetch('delete_image.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'filename=' + encodeURIComponent(filename)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove file from batch selection if present
                if (typeof batchOperations !== 'undefined') {
                    batchOperations.removeFromSelection(filename);
                    batchOperations.updateBatchPanel();
                }
                
                // Update current view based on filter status
                if (typeof tagFilter !== 'undefined') {
                    if (tagFilter.isFiltering) {
                        // If tag filter is active, reapply filter
                        tagFilter.applyFilter();
                    } else if (tagFilter.currentSearchTerm) {
                        // If only text search is active
                        searchFiles(tagFilter.currentSearchTerm);
                    } else {
                        // Default: Load all images
                        loadImages();
                    }
                } else {
                    // Default behavior if tagFilter is not defined
                    const searchInput = document.getElementById('searchInput');
                    const searchTerm = searchInput.value.trim();
                    
                    if (searchTerm) {
                        searchFiles(searchTerm);
                    } else {
                        loadImages();
                    }
                }
            } else {
                alert('Error deleting file: ' + data.message);
            }
        })
        .catch(() => {
            // Silent error handling
            alert('An error occurred. Please try again.');
        });
    }
}