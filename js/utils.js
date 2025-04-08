/**
 * utils.js - Optimierte Hilfsfunktionen für die Bildupload-Anwendung
 */

// Konfiguration
const UTILS_CONFIG = {
    DEBUG: true,
    TEXT_ENDPOINTS: {
        SAVE: 'save_text.php',
        GET: 'get_text.php',
    },
    IMAGE_ENDPOINTS: {
        DELETE: 'delete_image.php'
    }
};

// Logger-Klasse
class UtilsLogger {
    static log(message, data) {
        if (!UTILS_CONFIG.DEBUG) return;
        console.log(`[Utils] ${message}`, data || '');
    }
    
    static error(message, error) {
        if (!UTILS_CONFIG.DEBUG) return;
        console.error(`[Utils Error] ${message}`, error || '');
    }
}

/**
 * TextTools - Klasse für Textverarbeitung
 */
class TextTools {
    /**
     * Hebt einen Suchbegriff in einem Text hervor
     * @param {string} text - Der Ausgangstext
     * @param {string} searchTerm - Der zu markierende Suchbegriff
     * @returns {string} - HTML mit hervorgehobenem Suchbegriff
     */
    static highlightText(text, searchTerm) {
        if (!text || !searchTerm) return text;
        
        try {
            // Case-insensitive Regex für die Suche
            const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            return text.replace(regex, match => `<span class="highlight">${match}</span>`);
        } catch (error) {
            UtilsLogger.error('Fehler bei Texthervorhebung', error);
            return text; // Originaltext zurückgeben bei Fehler
        }
    }
    
    /**
     * Formatiert Text für bessere Lesbarkeit
     * @param {string} text - Rohtext
     * @returns {string} - Formatierter Text
     */
    static formatText(text) {
        if (!text) return '';
        
        try {
            // Mehrfache Leerzeichen reduzieren
            let formattedText = text.replace(/\s+/g, ' ');
            
            // Mehrfache Zeilenumbrüche reduzieren
            formattedText = formattedText.replace(/\n\s*\n\s*\n/g, '\n\n');
            
            // Absätze erkennen und formatieren
            formattedText = formattedText.replace(/([.!?])\s+(\w)/g, '$1\n\n$2');
            
            // Listen erkennen und formatieren
            formattedText = formattedText.replace(/(\d+\.\s*\w)/g, '\n$1');
            
            // Bindestrich am Zeilenende erkennen und zusammenführen
            formattedText = formattedText.replace(/(\w+)-\n(\w+)/g, '$1$2');
            
            return formattedText.trim();
        } catch (error) {
            UtilsLogger.error('Fehler bei Textformatierung', error);
            return text.trim(); // Fallback: nur getrimmten Text zurückgeben
        }
    }
}

/**
 * ApiService - Klasse für API-Anfragen
 */
class ApiService {
    /**
     * Speichert erkannten Text auf dem Server
     * @param {string} filename - Dateiname des Bildes
     * @param {string} text - Erkannter Text
     * @returns {Promise<Object>} - Antwort vom Server
     */
    static async saveText(filename, text) {
        UtilsLogger.log('Speichere Text', { filename, textLength: text.length });
        
        try {
            const formData = new URLSearchParams();
            formData.append('filename', filename);
            formData.append('text', text);
            
            const response = await fetch(UTILS_CONFIG.TEXT_ENDPOINTS.SAVE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Fehler beim Speichern des Textes');
            }
            
            UtilsLogger.log('Text erfolgreich gespeichert', { filename });
            return data;
        } catch (error) {
            UtilsLogger.error('Fehler beim Speichern des Textes', error);
            throw error;
        }
    }
    
    /**
     * Lädt Text vom Server
     * @param {string} filename - Dateiname des Bildes
     * @returns {Promise<string>} - Geladener Text
     */
    static async loadText(filename) {
        UtilsLogger.log('Lade Text', { filename });
        
        try {
            const response = await fetch(`${UTILS_CONFIG.TEXT_ENDPOINTS.GET}?filename=${encodeURIComponent(filename)}`);
            const data = await response.json();
            
            if (data.success && data.text) {
                UtilsLogger.log('Text geladen', { 
                    filename, 
                    textLength: data.text.length 
                });
                return data.text;
            } else {
                throw new Error(data.message || 'Fehler beim Laden des Textes');
            }
        } catch (error) {
            UtilsLogger.error('Fehler beim Laden des Textes', error);
            return '';
        }
    }
    
    /**
     * Löscht ein Bild und den zugehörigen Text
     * @param {string} filename - Dateiname des Bildes
     * @returns {Promise<Object>} - Antwort vom Server
     */
    static async deleteImage(filename) {
        UtilsLogger.log('Lösche Bild', { filename });
        
        try {
            const formData = new URLSearchParams();
            formData.append('filename', filename);
            
            const response = await fetch(UTILS_CONFIG.IMAGE_ENDPOINTS.DELETE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Fehler beim Löschen des Bildes');
            }
            
            UtilsLogger.log('Bild erfolgreich gelöscht', { filename });
            return data;
        } catch (error) {
            UtilsLogger.error('Fehler beim Löschen des Bildes', error);
            throw error;
        }
    }
}

/**
 * DocumentTools - Hilfsfunktionen für Dokumente und Dateien
 */
class DocumentTools {
    /**
     * Druckt eine Datei
     * @param {string} filename - Dateiname
     */
    static printFile(filename) {
        UtilsLogger.log('Drucke Datei', { filename });
        
        const fileExtension = filename.split('.').pop().toLowerCase();
        const isPdf = fileExtension === 'pdf';
        const fileUrl = 'uploads/' + filename;
        
        // Für PDFs: Im neuen Tab öffnen (Browser übernimmt Drucken)
        if (isPdf) {
            window.open(fileUrl, '_blank');
            return;
        }
        
        // Für Bilder: Eigenes Druckfenster erstellen
        try {
            const printWin = window.open('', '_blank');
            printWin.document.write('<html><head><title>Drucken</title>');
            printWin.document.write('<style>body{margin:0;padding:0;text-align:center;}img{max-width:100%;height:auto;}</style>');
            printWin.document.write('</head><body>');
            printWin.document.write(`<img src="${fileUrl}" alt="${filename}">`);
            printWin.document.write('</body></html>');
            printWin.document.close();
            
            printWin.onload = function() {
                printWin.focus();
                printWin.print();
            };
        } catch (error) {
            UtilsLogger.error('Fehler beim Drucken', error);
            alert('Fehler beim Drucken: ' + error.message);
        }
    }
}

// Exportiere Funktionen für globale Verwendung

/**
 * Hebt einen Suchbegriff in einem Text hervor
 * @param {string} text - Der Ausgangstext
 * @param {string} searchTerm - Der zu markierende Suchbegriff
 * @returns {string} - HTML mit hervorgehobenem Suchbegriff
 */
function highlightText(text, searchTerm) {
    return TextTools.highlightText(text, searchTerm);
}

/**
 * Formatiert Text für bessere Lesbarkeit
 * @param {string} text - Rohtext
 * @returns {string} - Formatierter Text
 */
function formatText(text) {
    return TextTools.formatText(text);
}

/**
 * Speichert erkannten Text auf dem Server
 * @param {string} filename - Dateiname des Bildes
 * @param {string} text - Erkannter Text
 */
function saveScannedText(filename, text) {
    ApiService.saveText(filename, text)
        .catch(error => {
            UtilsLogger.error('Fehler beim Speichern des Textes', error);
        });
}

/**
 * Lädt Text vom Server und fügt ihn in das Element ein
 * @param {string} filename - Dateiname des Bildes
 * @param {HTMLElement} textElement - DOM-Element für den Text
 */
function loadText(filename, textElement) {
    ApiService.loadText(filename)
        .then(text => {
            if (text && textElement) {
                textElement.textContent = text;
                textElement.classList.remove('hidden');
            }
        })
        .catch(() => {
            // Stille Fehlerbehandlung
        });
}

/**
 * Druckt eine Datei
 * @param {string} filename - Dateiname der zu druckenden Datei
 */
function printFile(filename) {
    DocumentTools.printFile(filename);
}

/**
 * Suche zurücksetzen und alle Dateien anzeigen
 */
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchStatus').textContent = '';
    loadImages(); // Diese Funktion ist in core.js definiert
}

/**
 * Bild löschen
 * @param {string} filename - Dateiname des zu löschenden Bildes
 */
function deleteImage(filename) {
    if (!confirm('Sind Sie sicher, dass Sie diese Datei löschen möchten?')) {
        return;
    }
    
    ApiService.deleteImage(filename)
        .then(data => {
            if (data.success) {
                // Suche aktualisieren, falls eine Suche aktiv ist
                const searchInput = document.getElementById('searchInput');
                if (searchInput.value.trim()) {
                    // searchFiles ist in core.js definiert
                    if (typeof searchFiles === 'function') {
                        searchFiles(searchInput.value.trim());
                    }
                } else {
                    // loadImages ist in core.js definiert
                    if (typeof loadImages === 'function') {
                        loadImages();
                    }
                }
            } else {
                alert('Fehler beim Löschen der Datei: ' + data.message);
            }
        })
        .catch(error => {
            alert('Fehler beim Löschen der Datei: ' + error.message);
        });
}