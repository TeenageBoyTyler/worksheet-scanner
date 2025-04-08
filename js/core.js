/**
 * core.js - Kernfunktionen für die Bildupload-Anwendung
 * Diese Datei sollte als letzte geladen werden, da sie von den anderen JS-Dateien abhängt
 */

// Konfiguration
const CORE_CONFIG = {
    DEBUG: true,               // Debug-Modus
    UPLOAD_PATH: 'uploads/',   // Pfad zu hochgeladenen Dateien
    ENDPOINTS: {
        UPLOAD: 'upload.php',
        GET_IMAGES: 'get_images.php',
        SEARCH: 'search_text.php'
    }
};

// Logger-Klasse
class CoreLogger {
    static log(message, data) {
        if (!CORE_CONFIG.DEBUG) return;
        console.log(`[Core] ${message}`, data || '');
    }
    
    static error(message, error) {
        if (!CORE_CONFIG.DEBUG) return;
        console.error(`[Core Error] ${message}`, error || '');
    }
}

/**
 * UploadManager - Verwaltet Datei-Uploads
 */
class UploadManager {
    /**
     * Initialisiert den Upload-Manager
     */
    static initialize() {
        CoreLogger.log('Initialisiere Upload-Manager');
        
        const uploadForm = document.getElementById('uploadForm');
        if (!uploadForm) {
            CoreLogger.error('Upload-Formular nicht gefunden');
            return;
        }
        
        uploadForm.addEventListener('submit', this.handleUpload);
    }
    
    /**
     * Behandelt den Formular-Submit für Uploads
     * @param {Event} e - Submit-Event
     */
    static handleUpload(e) {
        e.preventDefault();
        CoreLogger.log('Upload-Formular abgesendet');
        
        const formData = new FormData(this);
        const uploadProgressBox = document.getElementById('uploadProgressBox');
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadStatus = document.getElementById('uploadStatus');
        
        if (!uploadProgressBox || !uploadProgress || !uploadStatus) {
            CoreLogger.error('Upload-Fortschrittselemente nicht gefunden');
            alert('Fehler beim Vorbereiten des Uploads');
            return;
        }
        
        // Fortschrittsanzeige vorbereiten
        uploadProgressBox.style.display = 'block';
        uploadProgress.style.width = '0%';
        uploadProgress.textContent = '0%';
        uploadStatus.textContent = 'Datei wird hochgeladen...';
        
        CoreLogger.log('Sende Datei an Server');
        
        // Upload starten
        fetch(CORE_CONFIG.ENDPOINTS.UPLOAD, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            CoreLogger.log('Upload-Antwort erhalten', { status: response.status });
            
            if (!response.ok) {
                throw new Error(`HTTP-Fehler: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            CoreLogger.log('Upload-Antwort verarbeitet', data);
            
            if (data.success) {
                uploadProgress.style.width = '50%';
                uploadProgress.textContent = '50%';
                uploadStatus.textContent = 'Text wird erkannt...';
                
                // Nach erfolgreichem Upload automatisch Text scannen
                scanUploadedFile(data.filename, function(success, message) {
                    CoreLogger.log('Texterkennung abgeschlossen', { success, message });
                    
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
                        uploadStatus.textContent = 'Text konnte nicht erkannt werden: ' + message;
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
            CoreLogger.error('Fehler beim Upload', { error: error.message });
            uploadProgressBox.style.display = 'none';
            alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        });
    }
}

/**
 * ImageGallery - Verwaltet die Bildergalerie
 */
class ImageGallery {
    /**
     * Initialisiert die Bildergalerie
     */
    static initialize() {
        CoreLogger.log('Initialisiere Bildergalerie');
        this.loadImages();
    }
    
    /**
     * Lädt Bilder vom Server und zeigt sie an
     * @param {string|null} searchTerm - Optionaler Suchbegriff
     */
    static loadImages(searchTerm = null) {
        CoreLogger.log('Lade Bilder', { searchTerm });
        
        let url = CORE_CONFIG.ENDPOINTS.GET_IMAGES;
        if (searchTerm) {
            url += '?search=' + encodeURIComponent(searchTerm);
        }
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP-Fehler: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                CoreLogger.log('Bilder geladen', { count: data.length });
                this.renderImageGrid(data, searchTerm);
            })
            .catch(error => {
                CoreLogger.error('Fehler beim Laden der Bilder', { error: error.message });
                const imageGrid = document.getElementById('imageGrid');
                if (imageGrid) {
                    imageGrid.innerHTML = '<p class="no-results">Fehler beim Laden der Bilder.</p>';
                }
            });
    }
    
    /**
     * Rendert das Bildergitter
     * @param {