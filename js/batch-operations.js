/**
 * batch-operations.js - Funktionen für Batch-Operationen (Löschen, PDF-Download)
 */

// Globaler Status für Batch-Operationen
const batchOperations = {
    selectedItems: [], // Array für ausgewählte Dateien
    selectAll: false,  // Status für "Alle auswählen"
    
    // Initialisierung der Batch-Operationen
    initialize: function() {
        console.log("Initialisiere Batch-Operationen");
        
        // Event-Handler für Batch-Aktionen
        document.getElementById('batch-select-all').addEventListener('change', this.handleSelectAll);
        document.getElementById('batch-download-pdf-button').addEventListener('click', this.handleBatchDownloadPDF);
        document.getElementById('batch-delete-button').addEventListener('click', this.handleBatchDelete);
        
        // Batch-Panel initial ausblenden
        this.updateBatchPanel();
    },
    
    // Alle Elemente auswählen/abwählen
    handleSelectAll: function(e) {
        const isChecked = e.target.checked;
        batchOperations.selectAll = isChecked;
        
        // Alle Checkboxen aktualisieren
        const checkboxes = document.querySelectorAll('.image-select-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            
            // Entsprechenden Dateinamen finden und Auswahl aktualisieren
            const imageCard = checkbox.closest('.image-card');
            const filename = imageCard.dataset.filename;
            
            if (isChecked) {
                batchOperations.addToSelection(filename);
            } else {
                batchOperations.removeFromSelection(filename);
            }
            
            // Selektions-Styling aktualisieren
            batchOperations.updateCardSelection(imageCard, isChecked);
        });
        
        // Batch-Panel aktualisieren
        batchOperations.updateBatchPanel();
    },
    
    // Verarbeitet die Auswahl eines einzelnen Elements
    handleItemSelect: function(e) {
        const checkbox = e.target;
        const imageCard = checkbox.closest('.image-card');
        const filename = imageCard.dataset.filename;
        
        if (checkbox.checked) {
            batchOperations.addToSelection(filename);
        } else {
            batchOperations.removeFromSelection(filename);
            
            // "Alle auswählen" deaktivieren, wenn ein Element abgewählt wird
            const selectAllCheckbox = document.getElementById('batch-select-all');
            if (selectAllCheckbox.checked) {
                selectAllCheckbox.checked = false;
                batchOperations.selectAll = false;
            }
        }
        
        // Selektions-Styling aktualisieren
        batchOperations.updateCardSelection(imageCard, checkbox.checked);
        
        // Batch-Panel aktualisieren
        batchOperations.updateBatchPanel();
    },
    
    // Element zur Auswahl hinzufügen
    addToSelection: function(filename) {
        if (!this.selectedItems.includes(filename)) {
            this.selectedItems.push(filename);
        }
    },
    
    // Element aus der Auswahl entfernen
    removeFromSelection: function(filename) {
        const index = this.selectedItems.indexOf(filename);
        if (index !== -1) {
            this.selectedItems.splice(index, 1);
        }
    },
    
    // Aktualisiert das Styling einer Karte basierend auf dem Selektionsstatus
    updateCardSelection: function(card, isSelected) {
        if (isSelected) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    },
    
    // Batch-Panel aktualisieren (anzeigen/ausblenden)
    updateBatchPanel: function() {
        const batchPanel = document.getElementById('batch-operations-panel');
        const selectedCount = document.getElementById('selected-count');
        
        if (this.selectedItems.length > 0) {
            batchPanel.classList.remove('hidden');
            selectedCount.textContent = this.selectedItems.length;
        } else {
            batchPanel.classList.add('hidden');
        }
    },
    
    // Batch-PDF-Download von ausgewählten Elementen
    handleBatchDownloadPDF: function() {
        if (batchOperations.selectedItems.length === 0) {
            alert('Bitte wählen Sie mindestens eine Datei zum Herunterladen aus.');
            return;
        }
        
        console.log('Erstelle PDF mit ausgewählten Dateien:', batchOperations.selectedItems);
        
        // Fortschrittsanzeige einblenden
        const progressElement = document.getElementById('batch-progress');
        const progressBar = document.getElementById('batch-progress-bar');
        const progressText = document.getElementById('batch-progress-text');
        
        progressElement.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressText.textContent = 'PDF wird erstellt...';
        
        // Anfrage an den Server senden, um PDF zu erstellen
        fetch('generate_pdf.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: batchOperations.selectedItems
            })
        })
        .then(response => response.json())
        .then(data => {
            // Fortschritt aktualisieren
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
            
            if (data.success) {
                progressText.textContent = data.message;
                
                // PDF automatisch herunterladen
                const downloadLink = document.createElement('a');
                downloadLink.href = data.pdfUrl;
                downloadLink.download = data.pdfUrl.split('/').pop();
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                setTimeout(() => {
                    // Fortschrittsanzeige ausblenden
                    progressElement.classList.add('hidden');
                    
                    // Erfolgsmeldung anzeigen, wenn es Fehler gab
                    if (data.errorFiles && data.errorFiles.length > 0) {
                        let errorMessage = 'Einige Dateien konnten nicht zum PDF hinzugefügt werden:\n\n';
                        data.errorFiles.forEach(file => {
                            errorMessage += `- ${file.filename}: ${file.reason}\n`;
                        });
                        alert(errorMessage);
                    }
                }, 1000);
            } else {
                progressText.textContent = data.message;
                
                setTimeout(() => {
                    // Fortschrittsanzeige ausblenden
                    progressElement.classList.add('hidden');
                    
                    // Fehlermeldung anzeigen
                    alert(`Fehler beim Erstellen des PDFs: ${data.message}`);
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Fehler beim Erstellen des PDFs:', error);
            
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
            progressText.textContent = 'Fehler beim Erstellen des PDFs';
            
            setTimeout(() => {
                // Fortschrittsanzeige ausblenden
                progressElement.classList.add('hidden');
                
                // Fehlermeldung anzeigen
                alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
            }, 1000);
        });
    },
    
    // Batch-Löschen von ausgewählten Elementen
    handleBatchDelete: function() {
        if (batchOperations.selectedItems.length === 0) {
            alert('Bitte wählen Sie mindestens eine Datei zum Löschen aus.');
            return;
        }
        
        const fileCount = batchOperations.selectedItems.length;
        const confirmMessage = `Sind Sie sicher, dass Sie ${fileCount} Datei${fileCount !== 1 ? 'en' : ''} löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`;
        
        if (confirm(confirmMessage)) {
            console.log('Lösche ausgewählte Dateien:', batchOperations.selectedItems);
            
            // Fortschrittsanzeige einblenden
            const progressElement = document.getElementById('batch-progress');
            const progressBar = document.getElementById('batch-progress-bar');
            const progressText = document.getElementById('batch-progress-text');
            
            progressElement.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
            progressText.textContent = `0/${fileCount} Dateien gelöscht`;
            
            // Alle Dateien auf einmal mit einem API-Aufruf löschen
            fetch('batch_delete.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: batchOperations.selectedItems
                })
            })
            .then(response => response.json())
            .then(data => {
                // Fortschritt aktualisieren
                progressBar.style.width = '100%';
                progressBar.textContent = '100%';
                
                if (data.success) {
                    progressText.textContent = data.message;
                    
                    // Liste zurücksetzen
                    batchOperations.selectedItems = [];
                    batchOperations.selectAll = false;
                    document.getElementById('batch-select-all').checked = false;
                    
                    // Batch-Panel aktualisieren
                    batchOperations.updateBatchPanel();
                    
                    setTimeout(() => {
                        // Fortschrittsanzeige ausblenden
                        progressElement.classList.add('hidden');
                        
                        // Bilderliste aktualisieren
                        loadImages();
                        
                        // Erfolgsmeldung anzeigen, wenn es Fehler gab
                        if (data.failed && data.failed.length > 0) {
                            const failedCount = data.failed.length;
                            const successCount = data.deleted.length;
                            alert(`${successCount} Datei${successCount !== 1 ? 'en' : ''} erfolgreich gelöscht.\n\n${failedCount} Datei${failedCount !== 1 ? 'en' : ''} konnten nicht gelöscht werden.`);
                        }
                    }, 1000);
                } else {
                    progressText.textContent = data.message;
                    
                    setTimeout(() => {
                        // Fortschrittsanzeige ausblenden
                        progressElement.classList.add('hidden');
                        
                        // Fehlermeldung anzeigen
                        alert(`Fehler beim Löschen der Dateien: ${data.message}`);
                    }, 1000);
                }
            })
            .catch(error => {
                console.error('Fehler beim Löschen der Dateien:', error);
                
                progressBar.style.width = '100%';
                progressBar.textContent = '100%';
                progressText.textContent = 'Fehler beim Löschen der Dateien';
                
                setTimeout(() => {
                    // Fortschrittsanzeige ausblenden
                    progressElement.classList.add('hidden');
                    
                    // Fehlermeldung anzeigen
                    alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
                }, 1000);
            });
        }
    }
};

// Dokument fertig Event
document.addEventListener('DOMContentLoaded', function() {
    batchOperations.initialize();
});