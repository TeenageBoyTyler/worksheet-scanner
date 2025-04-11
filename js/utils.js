/**
 * utils.js - Hilfsfunktionen für die Bildupload-Anwendung
 * Simplified version - clearSearch function will be replaced by tag-filter.js
 */

// Text mit Suchbegriff hervorheben
function highlightText(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    // Regex für case-insensitive Suche
    const regex = new RegExp(searchTerm, 'gi');
    return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}

// Text formatieren für bessere Lesbarkeit
function formatText(text) {
    // Mehrfache Leerzeichen reduzieren
    text = text.replace(/\s+/g, ' ');
    
    // Mehrfache Zeilenumbrüche reduzieren
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Absätze erkennen und formatieren
    text = text.replace(/([.!?])\s+(\w)/g, '$1\n\n$2');
    
    // Listen erkennen und formatieren
    text = text.replace(/(\d+\.\s*\w)/g, '\n$1');
    
    // Bindestrich am Zeilenende erkennen und zusammenführen
    text = text.replace(/(\w+)-\n(\w+)/g, '$1$2');
    
    return text.trim();
}

// Gescannten Text auf dem Server speichern
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
            // Fehler beim Speichern des Textes - stille Behandlung
        }
    })
    .catch(() => {
        // Fehler still behandeln ohne Console-Ausgabe
    });
}

// Textinhalte aus gespeicherten Textdateien laden
function loadText(filename, textElement) {
    fetch('get_text.php?filename=' + encodeURIComponent(filename))
        .then(response => response.json())
        .then(data => {
            if (data.success && data.text) {
                textElement.textContent = data.text;
            }
        })
        .catch(() => {
            // Fehler still behandeln ohne Console-Ausgabe
        });
}

// This function should replace the existing loadTags function in utils.js

// Tags für ein Bild laden - improved with class-based styling and edit button
function loadTags(filename, tagsElement) {
    fetch('get_metadata.php?filename=' + encodeURIComponent(filename))
        .then(response => response.json())
        .then(data => {
            if (data.success && data.metadata) {
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
                    
                    // Add edit button to the tags container (if tagEditor is available)
                    if (typeof tagEditor !== 'undefined') {
                        tagEditor.addEditButton(tagsElement);
                    }
                } else {
                    tagsElement.innerHTML = '<span class="no-tags">Keine Tags</span>';
                    
                    // Add edit button even when there are no tags
                    if (typeof tagEditor !== 'undefined') {
                        tagEditor.addEditButton(tagsElement);
                    }
                }
            } else {
                tagsElement.innerHTML = '<span class="no-tags">Keine Tags</span>';
                
                // Add edit button even when metadata is not available
                if (typeof tagEditor !== 'undefined') {
                    tagEditor.addEditButton(tagsElement);
                }
            }
        })
        .catch(() => {
            tagsElement.innerHTML = '<span class="no-tags">Keine Tags</span>';
            
            // Add edit button even in case of an error
            if (typeof tagEditor !== 'undefined') {
                tagEditor.addEditButton(tagsElement);
            }
        });
}

// Datei drucken
function printFile(filename) {
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isPdf = fileExtension === 'pdf';
    const fileUrl = 'uploads/' + filename;
    
    // Für PDFs
    if (isPdf) {
        window.open(fileUrl, '_blank');
    } 
    // Für Bilder
    else {
        var printWin = window.open('', '_blank');
        printWin.document.write('<html><head><title>Drucken</title>');
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

// Bild löschen
function deleteImage(filename) {
    if (confirm('Sind Sie sicher, dass Sie diese Datei löschen möchten?')) {
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
                // Datei aus der Batch-Auswahl entfernen, wenn vorhanden
                if (typeof batchOperations !== 'undefined') {
                    batchOperations.removeFromSelection(filename);
                    batchOperations.updateBatchPanel();
                }
                
                // Aktuelle Ansicht aktualisieren basierend auf Filter-Status
                if (typeof tagFilter !== 'undefined') {
                    if (tagFilter.isFiltering) {
                        // Wenn Tag-Filter aktiv ist, Filter erneut anwenden
                        tagFilter.applyFilter();
                    } else if (tagFilter.currentSearchTerm) {
                        // Wenn nur Textsuche aktiv ist
                        searchFiles(tagFilter.currentSearchTerm);
                    } else {
                        // Standard: Alle Bilder laden
                        loadImages();
                    }
                } else {
                    // Wenn tagFilter nicht definiert ist - Standardverhalten
                    const searchInput = document.getElementById('searchInput');
                    const searchTerm = searchInput.value.trim();
                    
                    if (searchTerm) {
                        searchFiles(searchTerm);
                    } else {
                        loadImages();
                    }
                }
            } else {
                alert('Fehler beim Löschen der Datei: ' + data.message);
            }
        })
        .catch(() => {
            // Fehler still behandeln ohne Console-Ausgabe
            alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        });
    }
}