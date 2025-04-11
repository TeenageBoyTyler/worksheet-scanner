/**
 * tag-editor.js - Funktionen für die Bearbeitung von Tags bei bestehenden Dokumenten
 */

const tagEditor = {
    // Aktives Element, das gerade bearbeitet wird
    activeElement: null,
    
    // Verfügbare Tags (sollten mit denen im Upload-Formular übereinstimmen)
    availableTags: ['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch', 'Andere'],
    
    // Initialisierung des Tag-Editors
    initialize: function() {
        console.log("Tag-Editor initialisiert");
        
        // Event-Delegation für den gesamten Image-Grid-Container
        document.getElementById('imageGrid').addEventListener('click', function(e) {
            // Prüfen, ob das Edit-Icon geklickt wurde
            if (e.target.classList.contains('tag-edit-button') || 
                e.target.closest('.tag-edit-button')) {
                
                // Bildkarte finden
                const imageCard = e.target.closest('.image-card');
                if (imageCard) {
                    const filename = imageCard.dataset.filename;
                    const tagsContainer = imageCard.querySelector('.file-tags');
                    
                    // Bearbeitungsmodus starten
                    tagEditor.startEditing(filename, tagsContainer);
                }
            }
        });
        
        // Event-Listener für Klicks außerhalb des Editors (zum Schließen)
        document.addEventListener('click', function(e) {
            if (tagEditor.activeElement && 
                !e.target.closest('.tag-edit-form') && 
                !e.target.classList.contains('tag-edit-button') && 
                !e.target.closest('.tag-edit-button')) {
                tagEditor.cancelEditing();
            }
        });
    },
    
    // Bearbeitungsmodus starten
    startEditing: function(filename, tagsContainer) {
        // Wenn bereits ein Editor aktiv ist, diesen schließen
        if (this.activeElement) {
            this.cancelEditing();
        }
        
        // Aktuellen Container merken
        this.activeElement = {
            filename: filename,
            container: tagsContainer,
            originalContent: tagsContainer.innerHTML
        };
        
        // Aktuell ausgewählte Tags ermitteln
        const currentTags = [];
        tagsContainer.querySelectorAll('.tag').forEach(tag => {
            currentTags.push(tag.textContent.trim());
        });
        
        // Editor-Formular erstellen
        const formHTML = `
            <div class="tag-edit-form">
                <div class="tag-edit-checkboxes">
                    ${this.availableTags.map(tag => `
                        <label class="tag-checkbox ${currentTags.includes(tag) ? 'selected' : ''}">
                            <input type="checkbox" value="${tag}" ${currentTags.includes(tag) ? 'checked' : ''}>
                            <span>${tag}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="tag-edit-actions">
                    <button type="button" class="btn btn-primary btn-save-tags">Speichern</button>
                    <button type="button" class="btn btn-cancel-tags">Abbrechen</button>
                </div>
            </div>
        `;
        
        // Formular einfügen
        tagsContainer.innerHTML = formHTML;
        
        // Event-Listener für die Checkboxen
        tagsContainer.querySelectorAll('.tag-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const label = this.closest('.tag-checkbox');
                if (this.checked) {
                    label.classList.add('selected');
                } else {
                    label.classList.remove('selected');
                }
            });
        });
        
        // Event-Listener für die Tasten
        tagsContainer.querySelector('.btn-save-tags').addEventListener('click', () => this.saveChanges());
        tagsContainer.querySelector('.btn-cancel-tags').addEventListener('click', () => this.cancelEditing());
    },
    
    // Änderungen speichern
    saveChanges: function() {
        if (!this.activeElement) return;
        
        // Ausgewählte Tags sammeln
        const selectedTags = [];
        this.activeElement.container.querySelectorAll('.tag-edit-checkboxes input:checked').forEach(checkbox => {
            selectedTags.push(checkbox.value);
        });
        
        // Prüfen, ob mindestens ein Tag ausgewählt wurde
        if (selectedTags.length === 0) {
            alert('Bitte wählen Sie mindestens einen Tag aus.');
            return;
        }
        
        const filename = this.activeElement.filename;
        
        // Speichern-UI-Feedback
        this.activeElement.container.innerHTML = '<div class="loading-tags">Tags werden gespeichert...</div>';
        
        // AJAX-Anfrage zum Speichern der Tags
        fetch('update_tags.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                tags: selectedTags
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Tags neu rendern
                updateTagDisplay(this.activeElement.container.id, selectedTags);
                
                // Edit-Button wieder hinzufügen
                this.addEditButton(this.activeElement.container);
                
                // Wenn Tags zur Filterung verwendet werden, aktuelle Ansicht aktualisieren
                if (typeof tagFilter !== 'undefined' && tagFilter.isFiltering) {
                    // Falls Tag-Filter aktiv ist, Filter erneut anwenden
                    tagFilter.applyFilter();
                }
            } else {
                alert('Fehler beim Speichern der Tags: ' + data.message);
                // Ursprünglichen Zustand wiederherstellen
                this.activeElement.container.innerHTML = this.activeElement.originalContent;
            }
            
            // Aktives Element zurücksetzen
            this.activeElement = null;
        })
        .catch(error => {
            console.error('Fehler beim Speichern der Tags:', error);
            alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
            
            // Ursprünglichen Zustand wiederherstellen
            this.activeElement.container.innerHTML = this.activeElement.originalContent;
            
            // Aktives Element zurücksetzen
            this.activeElement = null;
        });
    },
    
    // Bearbeitung abbrechen
    cancelEditing: function() {
        if (!this.activeElement) return;
        
        // Ursprünglichen Zustand wiederherstellen
        this.activeElement.container.innerHTML = this.activeElement.originalContent;
        
        // Aktives Element zurücksetzen
        this.activeElement = null;
    },
    
    // Edit-Button zu einem Tag-Container hinzufügen
    addEditButton: function(container) {
        const editButton = document.createElement('button');
        editButton.className = 'tag-edit-button';
        editButton.innerHTML = '<i class="edit-icon">✏️</i>';
        editButton.title = 'Tags bearbeiten';
        
        container.appendChild(editButton);
    }
};

// Funktion, um Edit-Buttons zu bestehenden Tag-Containern hinzuzufügen
function addEditButtonsToTagContainers() {
    document.querySelectorAll('.file-tags').forEach(container => {
        // Prüfen, ob bereits ein Edit-Button vorhanden ist
        if (!container.querySelector('.tag-edit-button')) {
            tagEditor.addEditButton(container);
        }
    });
}

// Dokument fertig Event
document.addEventListener('DOMContentLoaded', function() {
    tagEditor.initialize();
    
    // Beobachter für dynamisch hinzugefügte Bildkarten
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                addEditButtonsToTagContainers();
            }
        });
    });
    
    // Beobachter für imageGrid aktivieren
    const imageGrid = document.getElementById('imageGrid');
    if (imageGrid) {
        observer.observe(imageGrid, { childList: true, subtree: true });
        
        // Initial alle Edit-Buttons hinzufügen
        setTimeout(addEditButtonsToTagContainers, 500);
    }
});