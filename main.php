<?php
// Authentifizierungsprüfung einbinden
require_once 'auth/check_auth.php';

// Benutzer muss angemeldet sein, um auf diese Seite zuzugreifen
requireLogin();

// Benutzerinformationen abrufen
$user = $_SESSION['user'];
?>
<!DOCTYPE html>
<html lang="de">
    <head>
        <!-- Meta-Tags und Titel -->
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Worksheet-Scanner</title>
        
        <!-- Externe Bibliotheken -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
        
        <!-- Google Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono&display=swap" rel="stylesheet">
        
        <!-- CSS-Dateien -->
        <link rel="stylesheet" href="styles/header.css">
        <link rel="stylesheet" href="styles/main.css">
        <link rel="stylesheet" href="styles/layout.css">
        <link rel="stylesheet" href="styles/components.css">
        <link rel="stylesheet" href="styles/utils.css">
        <link rel="stylesheet" href="styles/batch.css">
        <link rel="stylesheet" href="styles/tag-filter.css">
        <link rel="stylesheet" href="styles/tag-editor.css">
        <link rel="stylesheet" href="styles/language-display.css">
        <link rel="stylesheet" href="styles/drag-drop-upload.css">
    </head>
<body>
    <header class="main-header">
        <div class="header-content">
            <h1>Worksheet-Scanner</h1>
            <div class="user-info">
                <span>Angemeldet als <strong><?php echo htmlspecialchars($user['name']); ?></strong></span>
                <a href="auth/logout.php" class="btn-sm">Abmelden</a>
            </div>
        </div>
    </header>
    
    <div class="upload-container">
        <h2>Neue Datei hochladen</h2>
        
        <form id="uploadForm" action="upload.php" method="post" enctype="multipart/form-data">
            <!-- Hidden file input -->
            <div class="form-group">
                <input type="file" name="imageFile" id="imageFile" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" class="hidden" required>
                <small>Erlaubte Dateitypen: JPG, PNG, GIF, WebP, PDF</small>
            </div>
            
            <!-- Drag and Drop Upload Zone -->
            <div id="upload-zone" class="upload-zone">
                <div class="upload-zone-content">
                    <div class="upload-icon">⬆️</div>
                    <h3 class="upload-text">Dateien hier ablegen</h3>
                    <p class="upload-text-sub">oder mehrere Dateien auswählen</p>
                    
                    <div class="upload-or">oder</div>
                    
                    <div class="file-input-wrapper">
                        <span class="file-input-button">Dateien auswählen</span>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>Bitte wähle den passenden Tag aus</label>
                <div class="tags-selection">
                    <label class="tag-checkbox" for="tag-deutsch">
                        <input type="checkbox" id="tag-deutsch" name="tags[]" value="Deutsch">
                        <span>Deutsch</span>
                    </label>
                    <label class="tag-checkbox" for="tag-mathematik">
                        <input type="checkbox" id="tag-mathematik" name="tags[]" value="Mathematik">
                        <span>Mathematik</span>
                    </label>
                    <label class="tag-checkbox" for="tag-sachunterricht">
                        <input type="checkbox" id="tag-sachunterricht" name="tags[]" value="Sachunterricht">
                        <span>Sachunterricht</span>
                    </label>
                    <label class="tag-checkbox" for="tag-englisch">
                        <input type="checkbox" id="tag-englisch" name="tags[]" value="Englisch">
                        <span>Englisch</span>
                    </label>
                    <label class="tag-checkbox" for="tag-andere">
                        <input type="checkbox" id="tag-andere" name="tags[]" value="Andere">
                        <span>Andere</span>
                    </label>
                </div>
            </div>
            
            <!-- Bulk upload info will be added dynamically via JavaScript -->
            <div id="bulk-upload-info" class="bulk-upload-info" style="display: none;">
                <p>Selected <span id="bulk-file-count">0</span> files for upload</p>
                <p class="bulk-tag-notice">The selected tags will be applied to all files in this batch.</p>
                <div id="file-previews" class="file-previews"></div>
            </div>
            
            <button type="submit" class="btn btn-primary">Hochladen</button>
        </form>
        <div id="uploadProgressBox" class="upload-progress-box">
            <h3>Upload wird verarbeitet</h3>
            <div>
                <div class="progress-container" style="display: block;">
                    <div id="uploadProgress" class="progress-bar">0%</div>
                </div>
                <p id="uploadStatus">Datei wird hochgeladen...</p>
            </div>
        </div>
    </div>
    
    <div class="search-container">
        <h2>Textsuche</h2>
        <form id="searchForm" class="search-form">
            <input type="text" id="searchInput" placeholder="Suchbegriff eingeben...">
            <button type="submit" class="btn btn-primary">Suchen</button>
            <button type="button" class="btn" id="clearSearchBtn" onclick="clearSearch()">Alle Dateien anzeigen</button>
        </form>
        
        <!-- Tag filter section -->
        <div class="tag-filter-container">
            <h3>Nach Tags filtern</h3>
            <div class="tags-selection tag-filter">
                <label class="tag-checkbox" for="filter-tag-deutsch">
                    <input type="checkbox" id="filter-tag-deutsch" name="filter-tags[]" value="Deutsch">
                    <span>Deutsch</span>
                </label>
                <label class="tag-checkbox" for="filter-tag-mathematik">
                    <input type="checkbox" id="filter-tag-mathematik" name="filter-tags[]" value="Mathematik">
                    <span>Mathematik</span>
                </label>
                <label class="tag-checkbox" for="filter-tag-sachunterricht">
                    <input type="checkbox" id="filter-tag-sachunterricht" name="filter-tags[]" value="Sachunterricht">
                    <span>Sachunterricht</span>
                </label>
                <label class="tag-checkbox" for="filter-tag-englisch">
                    <input type="checkbox" id="filter-tag-englisch" name="filter-tags[]" value="Englisch">
                    <span>Englisch</span>
                </label>
                <label class="tag-checkbox" for="filter-tag-andere">
                    <input type="checkbox" id="filter-tag-andere" name="filter-tags[]" value="Andere">
                    <span>Andere</span>
                </label>
            </div>
            <div class="tag-filter-actions">
                <button type="button" class="btn btn-primary" id="applyTagFilterBtn">Filter anwenden</button>
                <button type="button" class="btn" id="clearTagFilterBtn">Filter zurücksetzen</button>
            </div>
        </div>
        
        <div class="search-status" id="searchStatus"></div>
        <div class="tag-filter-status" id="tagFilterStatus"></div>
    </div>
    
    <!-- Batch-Operationen Panel -->
    <div id="batch-operations-panel" class="batch-operations-panel hidden">
        <div class="batch-header">
            <div class="batch-selection">
                <input type="checkbox" id="batch-select-all" class="batch-checkbox">
                <label for="batch-select-all">Alle auswählen</label>
                <span id="selected-count-wrapper">(<span id="selected-count">0</span> ausgewählt)</span>
            </div>
            <div class="batch-actions">
                <button id="batch-download-pdf-button" class="btn btn-success">Als PDF herunterladen</button>
                <button id="batch-delete-button" class="btn btn-danger">Ausgewählte löschen</button>
            </div>
        </div>
        <div id="batch-progress" class="batch-progress hidden">
            <div class="progress-container">
                <div id="batch-progress-bar" class="progress-bar">0%</div>
            </div>
            <p id="batch-progress-text">0/0 Dateien verarbeitet</p>
        </div>
    </div>
    
    <div class="image-grid" id="imageGrid">
        <!-- Bilder werden hier dynamisch eingefügt -->
    </div>

    <!-- JavaScript Dateien einbinden -->
    <script src="js/utils.js"></script>
    <script src="js/pdf-handler.js"></script>
    <script src="js/ocr.js"></script>
    <script src="js/batch-operations.js"></script>
    <script src="js/tag-selection.js"></script>
    <script src="js/tag-filter.js"></script>
    <script src="js/drag-drop-upload.js"></script>
    <script src="js/core.js"></script>
    <script src="js/tag-editor.js"></script>
</body>
</html>