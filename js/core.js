/**
 * core.js - Kernfunktionen für die Bildupload-Anwendung
 * Diese Datei sollte als letzte geladen werden, da sie von den anderen JS-Dateien abhängt
 */

// Dokumentenfertig-Event-Handler 
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing application");
    
    // PDF.js Worker initialisieren
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    // Bilder laden
    loadImages();
    
    // Suchformular-Handler
    document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const searchTerm = document.getElementById('searchInput').value.trim();
        
        if (searchTerm.length === 0) {
            alert('Bitte geben Sie einen Suchbegriff ein.');
            return;
        }
        
        // Get selected tags from the multi-select
        const tagFilter = document.getElementById('tagFilter');
        const selectedTags = Array.from(tagFilter.selectedOptions).map(option => option.value);
        
        // Search with or without tags
        if (selectedTags.length > 0) {
            searchFilesWithTags(searchTerm, selectedTags);
        } else {
            searchFiles(searchTerm);
        }
    });
    
    // Upload-Formular-Handler
    document.getElementById('uploadForm').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Upload form submitted");
        
        // Überprüfen, ob mindestens ein Tag ausgewählt wurde
        const tagCheckboxes = document.querySelectorAll('input[name="tags[]"]:checked');
        if (tagCheckboxes.length === 0) {
            alert('Bitte wählen Sie mindestens einen Tag aus.');
            return;
        }
        
        const formData = new FormData(this);
        const uploadProgressBox = document.getElementById('uploadProgressBox');
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadStatus = document.getElementById('uploadStatus');
        
        uploadProgressBox.style.display = 'block';
        uploadProgress.style.width = '0%';
        uploadProgress.textContent = '0%';
        uploadStatus.textContent = 'Datei wird hochgeladen...';
        
        // Upload the file to the server
        fetch('upload.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log("Upload response:", data);
            
            if (data.success) {
                uploadProgress.style.width = '50%';
                uploadProgress.textContent = '50%';
                uploadStatus.textContent = 'Text wird erkannt...';
                
                // Nach erfolgreichem Upload automatisch Text scannen
                scanUploadedFile(data.filename, function(success, message) {
                    console.log("OCR result:", {success, message});
                    
                    if (success) {
                        uploadProgress.style.width = '100%';
                        uploadProgress.textContent = '100%';
                        uploadStatus.textContent = 'Fertig!';
                        
                        setTimeout(() => {
                            uploadProgressBox.style.display = 'none';
                            document.getElementById('uploadForm').reset();
                            loadImages(); // Bilderliste aktualisieren
                        }, 1000);
                    } else {
                        // Bei OCR-Fehler trotzdem als fertig markieren (Datei wurde hochgeladen)
                        uploadProgress.style.width = '100%';
                        uploadProgress.textContent = '100%';
                        uploadStatus.textContent = 'Datei hochgeladen, aber Text konnte nicht erkannt werden: ' + message;
                        
                        setTimeout(() => {
                            uploadProgressBox.style.display = 'none';
                            document.getElementById('uploadForm').reset();
                            loadImages(); // Bilderliste trotzdem aktualisieren
                        }, 3000);
                    }
                });
            } else {
                uploadProgressBox.style.display = 'none';
                alert('Fehler beim Hochladen: ' + data.message);
            }
        })
        .catch(error => {
            console.error("Upload error:", error);
            uploadProgressBox.style.display = 'none';
            alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        });
    });
});

// Bilder vom Server laden
function loadImages() {
    console.log("Loading all images");
    
    fetch('get_images.php')
        .then(response => response.json())
        .then(data => {
            console.log(`Loaded ${data.length} images`);
            displayFiles(data);
        })
        .catch(error => {
            console.error("Error loading images:", error);
            // Show error message
            const imageGrid = document.getElementById('imageGrid');
            imageGrid.innerHTML = '<p class="no-results">Fehler beim Laden der Bilder.</p>';
        });
}

// Suche in Dateien (ohne Tags-Filter)
function searchFiles(searchTerm) {
    console.log("Searching files for:", searchTerm);
    
    fetch('search_text.php?search=' + encodeURIComponent(searchTerm))
        .then(response => response.json())
        .then(data => {
            console.log(`Found ${data.length} search results`);
            displaySearchResults(data, searchTerm);
        })
        .catch(error => {
            console.error("Search error:", error);
            // Show error message
            const imageGrid = document.getElementById('imageGrid');
            imageGrid.innerHTML = '<p class="no-results">Fehler bei der Suche.</p>';
        });
}

// Suche in Dateien mit Tags-Filter
function searchFilesWithTags(searchTerm, tags) {
    console.log("Searching files for:", searchTerm, "with tags:", tags);
    
    // Rufe die spezielle Such-API auf, die bereits nach Tags filtert
    fetch('search_text_by_tags.php?search=' + encodeURIComponent(searchTerm) + 
          '&tags=' + encodeURIComponent(JSON.stringify(tags)))
        .then(response => response.json())
        .then(data => {
            console.log(`Found ${data.length} search results with specified tags`);
            displaySearchResults(data, searchTerm, tags);
        })
        .catch(error => {
            console.error("Search error:", error);
            // Show error message
            const imageGrid = document.getElementById('imageGrid');
            imageGrid.innerHTML = '<p class="no-results">Fehler bei der Suche.</p>';
        });
}

// Suchergebnisse anzeigen
function displaySearchResults(data, searchTerm, tags = null) {
    const imageGrid = document.getElementById('imageGrid');
    imageGrid.innerHTML = '';
    
    if (data.length === 0) {
        if (tags) {
            imageGrid.innerHTML = '<p class="no-results">Keine Suchergebnisse für "' + 
                searchTerm + '" in Dateien mit den ausgewählten Tags</p>';
            document.getElementById('searchStatus').textContent = '0 Ergebnisse gefunden';
        } else {
            imageGrid.innerHTML = '<p class="no-results">Keine Suchergebnisse für "' + searchTerm + '"</p>';
            document.getElementById('searchStatus').textContent = '0 Ergebnisse gefunden';
        }
        return;
    }
    
    data.forEach(file => {
        const card = document.createElement('div');
        card.className = 'image-card search-highlight';
        card.dataset.filename = file.filename;
        
        const fileExtension = file.filename.split('.').pop().toLowerCase();
        const isPdf = fileExtension === 'pdf';
        
        let previewHTML;
        if (isPdf) {
            previewHTML = `
                <div class="image-wrapper">
                    <div class="image-select-wrapper">
                        <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                    </div>
                    <div class="pdf-preview" id="pdf_${file.filename.replace(/\./g, '_')}">
                        <div>PDF-Dokument wird geladen...</div>
                        <canvas></canvas>
                        <div class="pdf-controls">
                            <button class="btn" id="prev_${file.filename.replace(/\./g, '_')}" disabled>Zurück</button>
                            <span>Seite <span id="page_num_${file.filename.replace(/\./g, '_')}">1</span> / <span id="page_count_${file.filename.replace(/\./g, '_')}">?</span></span>
                            <button class="btn" id="next_${file.filename.replace(/\./g, '_')}" disabled>Vor</button>
                        </div>
                    </div>
                    <span class="file-type-badge">PDF</span>
                </div>
            `;
        } else {
            previewHTML = `
                <div class="image-wrapper">
                    <div class="image-select-wrapper">
                        <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                    </div>
                    <img src="uploads/${file.filename}" alt="${file.filename}">
                    <span class="file-type-badge">${fileExtension.toUpperCase()}</span>
                </div>
            `;
        }
        
        card.innerHTML = `
            ${previewHTML}
            <div class="progress-container">
                <div class="progress-bar">0%</div>
            </div>
            <div class="loading">Text wird erkannt...</div>
            <div class="file-tags" id="tags_${file.filename.replace(/\./g, '_')}">Tags werden geladen...</div>
            <div class="text-content">${highlightText(file.text, searchTerm)}</div>
        `;
        
        imageGrid.appendChild(card);
        
        // Checkbox-Event-Listener hinzufügen
        const checkbox = card.querySelector('.image-select-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', batchOperations.handleItemSelect);
        }
        
        // Tags laden
        loadTags(file.filename, card.querySelector('.file-tags'));
        
        // PDF laden, wenn es sich um ein PDF handelt
        if (isPdf) {
            loadPDF(file.filename);
        }
    });
    
    // Suchergebnis-Status aktualisieren
    if (tags) {
        document.getElementById('searchStatus').textContent = 
            `${data.length} Ergebnis${data.length !== 1 ? 'se' : ''} für "${searchTerm}" in Dateien mit den ausgewählten Tags`;
    } else {
        document.getElementById('searchStatus').textContent = 
            `${data.length} Ergebnis${data.length !== 1 ? 'se' : ''} für "${searchTerm}"`;
    }
}

// Dateien im Grid anzeigen (für alle Bilder, ohne Suche)
function displayFiles(files) {
    const imageGrid = document.getElementById('imageGrid');
    imageGrid.innerHTML = '';
    
    if (files.length === 0) {
        imageGrid.innerHTML = '<p class="no-results">Keine Dateien vorhanden.</p>';
        document.getElementById('searchStatus').textContent = '';
        return;
    }
    
    files.forEach(file => {
        // Bei erweiterten Dateninformationen
        let filename;
        if (typeof file === 'object' && file.filename) {
            filename = file.filename;
        } else {
            filename = file;
        }
        
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.filename = filename;
        
        const fileExtension = filename.split('.').pop().toLowerCase();
        const isPdf = fileExtension === 'pdf';
        
        let previewHTML;
        if (isPdf) {
            previewHTML = `
                <div class="image-wrapper">
                    <div class="image-select-wrapper">
                        <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                    </div>
                    <div class="pdf-preview" id="pdf_${filename.replace(/\./g, '_')}">
                        <div>PDF-Dokument wird geladen...</div>
                        <canvas></canvas>
                        <div class="pdf-controls">
                            <button class="btn" id="prev_${filename.replace(/\./g, '_')}" disabled>Zurück</button>
                            <span>Seite <span id="page_num_${filename.replace(/\./g, '_')}">1</span> / <span id="page_count_${filename.replace(/\./g, '_')}">?</span></span>
                            <button class="btn" id="next_${filename.replace(/\./g, '_')}" disabled>Vor</button>
                        </div>
                    </div>
                    <span class="file-type-badge">PDF</span>
                </div>
            `;
        } else {
            previewHTML = `
                <div class="image-wrapper">
                    <div class="image-select-wrapper">
                        <input type="checkbox" class="image-select-checkbox" title="Auswählen">
                    </div>
                    <img src="uploads/${filename}" alt="${filename}">
                    <span class="file-type-badge">${fileExtension.toUpperCase()}</span>
                </div>
            `;
        }
        
        card.innerHTML = `
            ${previewHTML}
            <div class="progress-container">
                <div class="progress-bar">0%</div>
            </div>
            <div class="loading">Text wird erkannt...</div>
            <div class="file-tags" id="tags_${filename.replace(/\./g, '_')}">Tags werden geladen...</div>
            <div class="text-content hidden"></div>
        `;
        
        imageGrid.appendChild(card);
        
        // Checkbox-Event-Listener hinzufügen
        const checkbox = card.querySelector('.image-select-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', batchOperations.handleItemSelect);
        }
        
        // Text laden
        loadText(filename, card.querySelector('.text-content'));
        
        // Tags laden
        loadTags(filename, card.querySelector('.file-tags'));
        
        // PDF laden, wenn es sich um ein PDF handelt
        if (isPdf) {
            loadPDF(filename);
        }
    });
    
    // Status zurücksetzen
    document.getElementById('searchStatus').textContent = '';
}