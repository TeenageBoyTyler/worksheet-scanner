/**
 * tag-selection.js - Verbessertes Handling für Tag-Selektionen
 */

document.addEventListener('DOMContentLoaded', function() {
    // Alle Tag-Checkboxen initialisieren
    initializeTagSelections();
});

/**
 * Initialisiert alle Tag-Selektionen mit verbesserten Interaktionen
 */
function initializeTagSelections() {
    const tagLabels = document.querySelectorAll('.tag-checkbox');
    
    tagLabels.forEach(label => {
        // Click-Event für das Label
        label.addEventListener('click', function(e) {
            // Verhindern, dass das Checkbox-Klick-Event die Standardaktion auslöst
            if (e.target.tagName.toLowerCase() === 'input') {
                e.stopPropagation();
                return;
            }
            
            // Checkbox im Label finden und umschalten
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            // Manuell ein change-Event auslösen
            const changeEvent = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(changeEvent);
        });
        
        // Change-Event für die Checkbox
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                // Visual feedback on selection
                if (this.checked) {
                    label.classList.add('selected');
                } else {
                    label.classList.remove('selected');
                }
            });
        }
    });
}

/**
 * Tag-Auswahl in der Dateiliste aktualisieren
 * Diese Funktion kann verwendet werden, um Tags dynamisch zu aktualisieren
 */
function updateTagDisplay(containerId, tags) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Container leeren
    container.innerHTML = '';
    
    if (tags && tags.length > 0) {
        // Tags anzeigen
        tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = tag;
            container.appendChild(tagSpan);
        });
    } else {
        // "Keine Tags" anzeigen
        const noTagsSpan = document.createElement('span');
        noTagsSpan.className = 'no-tags';
        noTagsSpan.textContent = 'Keine Tags';
        container.appendChild(noTagsSpan);
    }
}

/**
 * Diese Funktion aktualisiert das Styling der Tags nach ihrem Inhalt
 * Sie kann nach dem Laden der Dateiliste aufgerufen werden
 */
function applyTagStyling() {
    document.querySelectorAll('.tag').forEach(tag => {
        const tagText = tag.textContent.trim();
        
        // Klassen zurücksetzen
        tag.className = 'tag';
        
        // Tag-spezifische Klassen hinzufügen
        if (tagText === 'Deutsch') {
            tag.classList.add('tag-deutsch');
        } else if (tagText === 'Mathematik') {
            tag.classList.add('tag-mathematik');
        } else if (tagText === 'Sachunterricht') {
            tag.classList.add('tag-sachunterricht');
        } else if (tagText === 'Englisch') {
            tag.classList.add('tag-englisch');
        } else if (tagText === 'Andere') {
            tag.classList.add('tag-andere');
        }
    });
}