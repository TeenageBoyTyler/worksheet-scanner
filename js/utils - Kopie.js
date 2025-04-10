/**
 * utils.js - Hilfsfunktionen für die Bildupload-Anwendung
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

// Tags für ein Bild laden
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
                        tagsElement.appendChild(tagSpan);
                    });
                } else {
                    tagsElement.innerHTML = '<span class="no-tags">Keine Tags</span>';
                }
            } else {
                tagsElement.innerHTML = '<span class="no-tags">Keine Tags</span>';
            }
        })
        .catch(() => {
            tagsElement.innerHTML = '<span class="no-tags">Keine Tags</span>';
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

// Suche zurücksetzen und alle Dateien anzeigen
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchStatus').textContent = '';
    
    // Tag filter zurücksetzen
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) {
        for (let i = 0; i < tagFilter.options.length; i++) {
            tagFilter.options[i].selected = false;
        }
    }
    
    // Batch-Auswahl zurücksetzen, wenn vorhanden
    if (typeof batchOperations !== 'undefined') {
        batchOperations.selectedItems = [];
        batchOperations.selectAll = false;
        
        // Select All Checkbox zurücksetzen
        const selectAllCheckbox = document.getElementById('batch-select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
        
        // Batch-Panel aktualisieren
        batchOperations.updateBatchPanel();
    }
    
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
                
                // Suche aktualisieren, falls eine Suche aktiv ist
                const searchInput = document.getElementById('searchInput');
                if (searchInput.value.trim()) {
                    searchFiles(searchInput.value.trim());
                } else {
                    loadImages(); // Bilderliste aktualisieren
                }
            } else {
                alert('Fehler beim Löschen der Datei: ' + data.message);
            }
        })
        .catch(() => {
            // Fehler still behandeln ohne Console-Ausgabe
        });
    }
}