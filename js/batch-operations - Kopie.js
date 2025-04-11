/**
 * batch-operations.js - Funktionen für Batch-Operationen (Löschen, Drucken, PDF-Download)
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
        document.getElementById('batch-print-button').addEventListener('click', this.handleBatchPrint);
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
    
    // Batch-Drucken von ausgewählten Elementen
    handleBatchPrint: function() {
        if (batchOperations.selectedItems.length === 0) {
            alert('Bitte wählen Sie mindestens eine Datei zum Drucken aus.');
            return;
        }
        
        console.log('Drucke ausgewählte Dateien:', batchOperations.selectedItems);
        
        // Druckfenster erstellen
        const printWin = window.open('', '_blank');
        printWin.document.write('<html><head><title>Batch-Druck</title>');
        printWin.document.write('<style>');
        printWin.document.write(`
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .print-header { text-align: center; margin-bottom: 20px; }
            .print-item { margin-bottom: 40px; page-break-after: always; }
            .print-item:last-child { page-break-after: avoid; }
            .print-item h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .print-item img { max-width: 100%; height: auto; }
            .print-item .text-content { margin-top: 10px; border: 1px solid #eee; padding: 10px; background: #f9f9f9; }
            @media print {
                .print-item { page-break-after: always; }
                .no-print { display: none; }
            }
        `);
        printWin.document.write('</style></head><body>');
        printWin.document.write('<div class="print-header">');
        printWin.document.write('<h1>Batch-Druck: ' + batchOperations.selectedItems.length + ' Dateien</h1>');
        printWin.document.write('<div class="no-print"><button onclick="window.print()">Drucken</button></div>');
        printWin.document.write('</div>');
        
        // Für jede ausgewählte Datei
        batchOperations.selectedItems.forEach(filename => {
            const fileExtension = filename.split('.').pop().toLowerCase();
            const isPdf = fileExtension === 'pdf';
            
            printWin.document.write('<div class="print-item">');
            printWin.document.write('<h2>' + filename + '</h2>');
            
            // Bei PDFs nur einen Link anzeigen
            if (isPdf) {
                printWin.document.write('<p>PDF-Dokument: <a href="uploads/' + filename + '" target="_blank">' + filename + '</a></p>');
                printWin.document.write('<p class="no-print">PDF-Dokumente müssen separat geöffnet werden.</p>');
            } else {
                // Bei Bildern das Bild direkt einbinden
                printWin.document.write('<img src="uploads/' + filename + '" alt="' + filename + '">');
            }
            
            // Text-Inhalt hinzufügen (asynchron geladen)
            printWin.document.write('<div class="text-content" id="text_' + filename.replace(/\./g, '_') + '">Text wird geladen...</div>');
            
            printWin.document.write('</div>');
        });
        
        printWin.document.write('</body></html>');
        printWin.document.close();
        
        // Text für jede Datei laden
        batchOperations.selectedItems.forEach(filename => {
            const textElementId = 'text_' + filename.replace(/\./g, '_');
            
            // AJAX-Anfrage zum Laden des Textes
            fetch('get_text.php?filename=' + encodeURIComponent(filename))
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.text) {
                        printWin.document.getElementById(textElementId).textContent = data.text;
                    } else {
                        printWin.document.getElementById(textElementId).textContent = 'Kein Text verfügbar';
                    }
                })
                .catch(error => {
                    console.error('Fehler beim Laden des Textes:', error);
                    printWin.document.getElementById(textElementId).textContent = 'Fehler beim Laden des Textes';
                });
        });
        
        // Fokus auf das Druckfenster setzen
        printWin.focus();
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