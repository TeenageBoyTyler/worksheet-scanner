/**
 * tag-filter.js - Funktionen für Tag-basierte Filterung (mit OR-Logik)
 * Fixed version with proper clearSearch handling
 */

// Globale Tag-Filter-Einstellungen
const tagFilter = {
    // Aktive Filter-Tags
    activeTags: [],
    
    // Aktueller Suchbegriff (für Kombination mit Tags)
    currentSearchTerm: '',
    
    // Filterstatus
    isFiltering: false,
    
    // Initialisierung der Tag-Filter-Funktionen
    initialize: function() {
        console.log("Initialisiere Tag-Filter");
        
        // Event-Handler für Filter-Aktionen
        document.getElementById('applyTagFilterBtn').addEventListener('click', this.applyFilter);
        document.getElementById('clearTagFilterBtn').addEventListener('click', this.clearFilter);
        
        // Tag-Checkboxen initialisieren
        const filterCheckboxes = document.querySelectorAll('.tag-filter input[type="checkbox"]');
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Visuelles Feedback für die Auswahl
                const label = this.closest('.tag-checkbox');
                if (this.checked) {
                    label.classList.add('selected');
                } else {
                    label.classList.remove('selected');
                }
            });
        });
        
        // Erweitere den bestehenden Suchformular-Handler
        const originalSearchHandler = document.getElementById('searchForm').onsubmit;
        document.getElementById('searchForm').onsubmit = function(e) {
            e.preventDefault();
            const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
            
            // Suchbegriff global speichern
            tagFilter.currentSearchTerm = searchTerm;
            
            // Suche mit aktiven Tags durchführen
            if (searchTerm.length > 0) {
                tagFilter.searchWithTags(searchTerm);
            } else if (tagFilter.activeTags.length > 0) {
                // Nur nach Tags filtern, wenn kein Suchbegriff, aber Tags aktiv sind
                tagFilter.applyFilter();
            } else {
                // Standardverhalten bei leerem Suchfeld: Alle Dateien anzeigen
                tagFilter.resetEverything();
            }
        };
        
        // Überschreibe die clearSearch-Funktion (Handler für "Alle Dateien anzeigen" Button)
        if (typeof window.clearSearch === 'function') {
            window.originalClearSearch = window.clearSearch;
            window.clearSearch = tagFilter.resetEverything;
        }
    },
    
    // Aktive Filter-Tags sammeln
    collectActiveTags: function() {
        const checkboxes = document.querySelectorAll('.tag-filter input[type="checkbox"]:checked');
        const tags = [];
        
        checkboxes.forEach(checkbox => {
            tags.push(checkbox.value);
        });
        
        return tags;
    },
    
    // Filter anwenden
    applyFilter: function() {
        // Aktive Tags sammeln
        tagFilter.activeTags = tagFilter.collectActiveTags();
        
        if (tagFilter.activeTags.length === 0) {
            // Keine Tags ausgewählt, Standardansicht anzeigen
            if (tagFilter.isFiltering) {
                // Wenn vorher gefiltert wurde, Filter zurücksetzen
                tagFilter.clearFilter();
                return;
            }
            
            alert('Bitte wählen Sie mindestens einen Tag zum Filtern aus.');
            return;
        }
        
        console.log('Filtere nach Tags (OR-Logik):', tagFilter.activeTags);
        
        // Filterstatus setzen
        tagFilter.isFiltering = true;
        
        // Container visuell als aktiv markieren
        document.querySelector('.tag-filter-container').classList.add('tag-filter-active');
        
        // Wenn aktuell eine Textsuche aktiv ist, kombinierte Suche durchführen
        if (tagFilter.currentSearchTerm) {
            tagFilter.searchWithTags(tagFilter.currentSearchTerm);
        } else {
            // Nur nach Tags filtern
            tagFilter.filterByTagsOnly();
        }
    },
    
    // Filter zurücksetzen ohne Bilder neu zu laden
    clearFilterOnly: function() {
        // Tags zurücksetzen
        tagFilter.activeTags = [];
        tagFilter.isFiltering = false;
        
        // Checkboxen zurücksetzen
        const checkboxes = document.querySelectorAll('.tag-filter input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const label = checkbox.closest('.tag-checkbox');
            label.classList.remove('selected');
        });
        
        // Container-Styling zurücksetzen
        document.querySelector('.tag-filter-container').classList.remove('tag-filter-active');
        
        // Status zurücksetzen
        document.getElementById('tagFilterStatus').textContent = '';
    },
    
    // Filter zurücksetzen und Bilder neu laden
    clearFilter: function() {
        // Tags zurücksetzen
        tagFilter.clearFilterOnly();
        
        // Wenn aktuell eine Textsuche aktiv ist, nur Textsuche wiederholen
        if (tagFilter.currentSearchTerm) {
            searchFiles(tagFilter.currentSearchTerm);
        } else {
            // Alle Bilder anzeigen
            loadImages();
        }
    },
    
    // Alles zurücksetzen (Tag-Filter und Suche)
    resetEverything: function() {
        console.log("Resetting everything - tags and search");
        
        // Suchfeld zurücksetzen
        document.getElementById('searchInput').value = '';
        document.getElementById('searchStatus').textContent = '';
        tagFilter.currentSearchTerm = '';
        
        // Tags zurücksetzen
        tagFilter.clearFilterOnly();
        
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
        
        // Alle Bilder laden
        loadImages();
    },
    
    // Nur nach Tags filtern (ohne Textsuche)
    filterByTagsOnly: function() {
        console.log('Führe reine Tag-Filterung durch (OR-Logik)');
        
        // Tag-Komma-Liste erstellen
        const tagParam = tagFilter.activeTags.join(',');
        
        fetch('get_images.php?tags=' + encodeURIComponent(tagParam))
            .then(response => response.json())
            .then(data => {
                console.log(`Gefiltert nach Tags: ${data.length} Bilder gefunden`);
                
                const imageGrid = document.getElementById('imageGrid');
                imageGrid.innerHTML = '';
                
                if (data.length === 0) {
                    imageGrid.innerHTML = '<p class="no-results">Keine Dateien mit den ausgewählten Tags gefunden.</p>';
                    document.getElementById('tagFilterStatus').textContent = 'Keine Dateien mit den ausgewählten Tags gefunden.';
                    return;
                }
                
                // Bilder anzeigen (ähnlich wie loadImages)
                data.forEach(filename => {
                    // Erstelle Bildkarte (wie in loadImages)
                    createImageCard(filename, imageGrid);
                });
                
                // Filterstatus aktualisieren mit OR-Logik Hinweis
                document.getElementById('tagFilterStatus').textContent = 
                    `${data.length} Datei${data.length !== 1 ? 'en' : ''} gefunden, die mindestens einen der ausgewählten Tags enthalten`;
            })
            .catch(error => {
                console.error("Fehler bei der Tag-Filterung:", error);
                // Fehlermeldung anzeigen
                const imageGrid = document.getElementById('imageGrid');
                imageGrid.innerHTML = '<p class="no-results">Fehler bei der Filterung.</p>';
            });
    },
    
    // Kombinierte Suche: Text + Tags
    searchWithTags: function(searchTerm) {
        console.log("Kombinierte Suche mit OR-Logik:", { searchTerm, tags: tagFilter.activeTags });
        
        let url = 'search_text.php?search=' + encodeURIComponent(searchTerm);
        
        // Tags hinzufügen, wenn aktiv
        if (tagFilter.activeTags.length > 0) {
            url += '&tags=' + encodeURIComponent(tagFilter.activeTags.join(','));
        }
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(`Kombinierte Suche: ${data.length} Ergebnisse gefunden`);
                
                const imageGrid = document.getElementById('imageGrid');
                imageGrid.innerHTML = '';
                
                if (data.length === 0) {
                    let message = 'Keine Suchergebnisse';
                    if (tagFilter.activeTags.length > 0) {
                        message += ` für "${searchTerm}" mit den ausgewählten Tags`;
                    } else {
                        message += ` für "${searchTerm}"`;
                    }
                    
                    imageGrid.innerHTML = `<p class="no-results">${message}</p>`;
                    document.getElementById('searchStatus').textContent = '0 Ergebnisse gefunden';
                    return;
                }
                
                // Bilder mit Suchergebnissen anzeigen (wie in searchFiles)
                data.forEach(file => {
                    // Erstelle Bildkarte mit Suchhervorhebung
                    createSearchResultCard(file, imageGrid, searchTerm);
                });
                
                // Suchstatus aktualisieren mit OR-Logik Hinweis
                let statusMessage = `${data.length} Ergebnis${data.length !== 1 ? 'se' : ''} für "${searchTerm}"`;
                if (tagFilter.activeTags.length > 0) {
                    statusMessage += `, die mindestens einen der ausgewählten Tags enthalten`;
                }
                document.getElementById('searchStatus').textContent = statusMessage;
            })
            .catch(error => {
                console.error("Kombinierte Suche fehlgeschlagen:", error);
                // Fehlermeldung anzeigen
                const imageGrid = document.getElementById('imageGrid');
                imageGrid.innerHTML = '<p class="no-results">Fehler bei der Suche.</p>';
            });
    }
};

// Hilfsfunktion zum Erstellen einer Bildkarte
function createImageCard(filename, container) {
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
    
    container.appendChild(card);
    
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
}

// Hilfsfunktion zum Erstellen einer Bildkarte mit Suchergebnissen
function createSearchResultCard(file, container, searchTerm) {
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
        <div class="text-content hidden">${highlightText(file.text, searchTerm)}</div>
    `;
    
    container.appendChild(card);
    
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
}

// Dokument fertig Event für Tag-Filter-Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    tagFilter.initialize();
});