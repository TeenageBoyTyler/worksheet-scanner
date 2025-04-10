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
    // Verbesserte Selektoren verwenden
    const tagLabels = document.querySelectorAll('.tag-checkbox');
    console.log("Found tag labels:", tagLabels.length);
    
    tagLabels.forEach(label => {
        // Direktes Click-Event für das gesamte Label
        label.addEventListener('click', function(e) {
            // Nur verhindern, wenn direkt auf das input geklickt wurde
            // um Doppelauslösung zu vermeiden
            if (e.target.tagName.toLowerCase() === 'input') {
                // Kein e.stopPropagation() hier, da wir das Event verarbeiten wollen
                console.log("Direct checkbox click");
                return;
            }
            
            console.log("Label or span click");
            // Checkbox im Label finden
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (!checkbox) return;
            
            // Zustand umschalten
            checkbox.checked = !checkbox.checked;
            
            // Manuell ein change-Event auslösen
            const changeEvent = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(changeEvent);
            
            // Visuelles Feedback direkt anwenden
            updateTagAppearance(label, checkbox.checked);
            
            // Standard-Verhalten verhindern, um Doppelauslösung zu vermeiden
            e.preventDefault();
        });
        
        // Change-Event für die Checkbox
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                // Visual feedback on selection
                updateTagAppearance(label, this.checked);
            });
            
            // Initialen Zustand anwenden
            updateTagAppearance(label, checkbox.checked);
        }
    });
    
    console.log("Tag selection initialization complete");
}

/**
 * Aktualisiert das Erscheinungsbild eines Tag-Labels basierend auf dem Auswahlstatus
 */
function updateTagAppearance(label, isSelected) {
    if (isSelected) {
        label.classList.add('selected');
    } else {
        label.classList.remove('selected');
    }
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
            
            // Spezifische Klasse basierend auf dem Tag-Inhalt hinzufügen
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