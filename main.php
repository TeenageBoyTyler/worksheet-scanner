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
        <title>Datei Upload & Texterkennung</title>
        
        <!-- Externe Bibliotheken -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
       <!-- CSS-Dateien -->
       <link rel="stylesheet" href="styles/main.css">
       <link rel="stylesheet" href="styles/layout.css">
       <link rel="stylesheet" href="styles/components.css">
       <link rel="stylesheet" href="styles/utils.css">
       <style>
       /* Inline-Styles für die Benutzerinfo */
       .main-header {
           background-color: #f5f5f5;
           border-bottom: 1px solid #ddd;
           margin-bottom: 20px;
           padding: 10px 0;
       }
       
       .header-content {
           display: flex;
           justify-content: space-between;
           align-items: center;
           max-width: 1200px;
           margin: 0 auto;
           padding: 0 20px;
       }
       
       .main-header h1 {
           margin: 0;
           font-size: 24px;
           text-align: left;
       }
       
       .user-info {
           display: flex;
           align-items: center;
           gap: 10px;
           font-size: 14px;
           color: #666;
       }
       
       .btn-sm {
           padding: 5px 10px;
           font-size: 12px;
           background-color: #f44336;
           color: white;
           border-radius: 4px;
           text-decoration: none;
           border: none;
       }
       
       .btn-sm:hover {
           background-color: #d32f2f;
       }
       </style>
</head>
<body>
    <header class="main-header">
        <div class="header-content">
            <h1>Datei Upload & Texterkennung</h1>
            <div class="user-info">
                <span>Angemeldet als <strong><?php echo htmlspecialchars($user['name']); ?></strong></span>
                <a href="auth/logout.php" class="btn btn-sm">Abmelden</a>
            </div>
        </div>
    </header>
    
    <div class="upload-container">
        <h2>Neue Datei hochladen</h2>
        <form id="uploadForm" action="upload.php" method="post" enctype="multipart/form-data">
            <div class="form-group">
                <input type="file" name="imageFile" id="imageFile" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" required>
                <small>Erlaubte Dateitypen: JPG, PNG, GIF, WebP, PDF</small>
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
            <input type="text" id="searchInput" placeholder="Suchbegriff eingeben..." required>
            <button type="submit" class="btn btn-primary">Suchen</button>
            <button type="button" class="btn" id="clearSearchBtn" onclick="clearSearch()">Alle Dateien anzeigen</button>
        </form>
        <div class="search-status" id="searchStatus"></div>
    </div>
    
    <h2>Meine Dateien</h2>
    <div class="image-grid" id="imageGrid">
        <!-- Bilder werden hier dynamisch eingefügt -->
    </div>

        <!-- Am Ende des body-Tags die eigenen JS-Dateien einbinden -->
        <script src="js/utils.js"></script>
        <script src="js/pdf-handler.js"></script>
        <script src="js/ocr.js"></script>
        <script src="js/core.js"></script>

</body>
</html>