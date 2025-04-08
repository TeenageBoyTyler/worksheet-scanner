<?php
// search_text.php - Durchsucht alle erkannten Texte nach einem Suchbegriff
header('Content-Type: application/json');

$response = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['search'])) {
    $searchTerm = $_GET['search'];
    
    if (empty($searchTerm)) {
        echo json_encode($response);
        exit;
    }
    
    // Suchordner
    $textDir = 'texts/';
    $uploadDir = 'uploads/';
    
    // Alle Textdateien durchsuchen
    $textFiles = glob($textDir . '*.txt');
    
    foreach ($textFiles as $textFile) {
        $text = file_get_contents($textFile);
        
        // Prüfen, ob der Suchbegriff im Text vorkommt (case-insensitive)
        if (stripos($text, $searchTerm) !== false) {
            $basename = basename($textFile, '.txt');
            
            // Passende Bilddatei finden
            $imageFile = null;
            $possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
            
            foreach ($possibleExtensions as $ext) {
                if (file_exists($uploadDir . $basename . '.' . $ext)) {
                    $imageFile = $basename . '.' . $ext;
                    break;
                }
            }
            
            if ($imageFile) {
                // Textkontext um den Suchbegriff herum extrahieren
                $context = extractContext($text, $searchTerm, 50);
                
                $response[] = [
                    'filename' => $imageFile,
                    'text' => $text,
                    'highlight' => $context
                ];
            }
        }
    }
} else {
    // Leeres Array zurückgeben bei ungültiger Anfrage
}

// Funktion zum Extrahieren des Kontexts um den Suchbegriff herum
function extractContext($text, $searchTerm, $contextLength = 50) {
    // Position des Suchbegriffs finden (case-insensitive)
    $pos = stripos($text, $searchTerm);
    if ($pos === false) return '';
    
    $length = strlen($searchTerm);
    
    // Start- und Endposition für den Kontext berechnen
    $start = max(0, $pos - $contextLength);
    $end = min(strlen($text), $pos + $length + $contextLength);
    
    // Text extrahieren
    $context = substr($text, $start, $end - $start);
    
    // Ellipsen hinzufügen, wenn wir nicht am Anfang oder Ende des Textes sind
    if ($start > 0) {
        $context = '...' . $context;
    }
    
    if ($end < strlen($text)) {
        $context .= '...';
    }
    
    return $context;
}

echo json_encode($response);
?>