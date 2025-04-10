<?php
// search_text_by_tags.php - Durchsucht Texte nach Suchbegriff, gefiltert nach Tags
header('Content-Type: application/json');

$response = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['search'])) {
    $searchTerm = $_GET['search'];
    $requestedTags = isset($_GET['tags']) ? json_decode($_GET['tags'], true) : [];
    
    if (empty($searchTerm)) {
        echo json_encode($response);
        exit;
    }
    
    // Verzeichnisse
    $textDir = 'texts/';
    $uploadDir = 'uploads/';
    $metaDir = 'meta/';
    
    // Alle Textdateien durchsuchen
    $textFiles = glob($textDir . '*.txt');
    
    foreach ($textFiles as $textFile) {
        $basename = basename($textFile, '.txt');
        $text = file_get_contents($textFile);
        
        // Prüfen, ob der Suchbegriff im Text vorkommt (case-insensitive)
        if (stripos($text, $searchTerm) === false) {
            continue; // Text enthält nicht den Suchbegriff, überspringen
        }
        
        // Wenn Tags gefiltert werden sollen
        if (!empty($requestedTags)) {
            $metaFile = $metaDir . $basename . '.json';
            
            // Wenn keine Metadaten vorhanden sind, Datei überspringen
            if (!file_exists($metaFile)) {
                continue;
            }
            
            // Metadaten laden
            $metadata = json_decode(file_get_contents($metaFile), true);
            
            // Prüfen, ob mindestens ein Tag übereinstimmt
            $hasMatchingTag = false;
            if (isset($metadata['tags']) && is_array($metadata['tags'])) {
                foreach ($requestedTags as $tag) {
                    if (in_array($tag, $metadata['tags'])) {
                        $hasMatchingTag = true;
                        break;
                    }
                }
            }
            
            // Wenn kein Tag übereinstimmt, Datei überspringen
            if (!$hasMatchingTag) {
                continue;
            }
        }
        
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
            
            // Ergebnis zur Antwort hinzufügen
            $response[] = [
                'filename' => $imageFile,
                'text' => $text,
                'highlight' => $context
            ];
        }
    }
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