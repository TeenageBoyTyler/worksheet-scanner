<?php
// search_text.php - Updated to support tag filtering with OR logic
header('Content-Type: application/json');

$response = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $searchTerm = isset($_GET['search']) ? $_GET['search'] : '';
    $tagFilter = isset($_GET['tags']) ? explode(',', $_GET['tags']) : [];
    
    // If we have neither search term nor tags, return empty result
    if (empty($searchTerm) && empty($tagFilter)) {
        echo json_encode($response);
        exit;
    }
    
    // Suchordner
    $textDir = 'texts/';
    $uploadDir = 'uploads/';
    
    // Function to check if a file has at least one of the specified tags (OR logic)
    function fileHasTags($filename, $filterTags) {
        if (empty($filterTags)) return true; // No tag filters means all files pass
        
        $metaFile = 'meta/' . pathinfo($filename, PATHINFO_FILENAME) . '.json';
        
        if (file_exists($metaFile)) {
            $metadata = json_decode(file_get_contents($metaFile), true);
            if (isset($metadata['tags']) && is_array($metadata['tags'])) {
                // Check if file has ANY of the requested tags (OR logic)
                foreach ($filterTags as $tag) {
                    if (in_array($tag, $metadata['tags'])) {
                        return true; // Found at least one matching tag
                    }
                }
            }
        }
        return false; // No matching tags
    }
    
    // Find files based on search and/or tags
    if (!empty($searchTerm)) {
        // Text search with optional tag filtering
        $textFiles = glob($textDir . '*.txt');
        
        foreach ($textFiles as $textFile) {
            $text = file_get_contents($textFile);
            $basename = basename($textFile, '.txt');
            
            // Prüfen, ob der Suchbegriff im Text vorkommt (case-insensitive)
            if (stripos($text, $searchTerm) !== false) {
                // Find matching image file
                $imageFile = null;
                $possibleExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
                
                foreach ($possibleExtensions as $ext) {
                    if (file_exists($uploadDir . $basename . '.' . $ext)) {
                        $imageFile = $basename . '.' . $ext;
                        break;
                    }
                }
                
                if ($imageFile) {
                    // Apply tag filter if needed
                    if (!empty($tagFilter) && !fileHasTags($imageFile, $tagFilter)) {
                        continue; // Skip this file, it doesn't have any of the required tags
                    }
                    
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
    } else if (!empty($tagFilter)) {
        // Tag-only search (no text search)
        $files = scandir($uploadDir);
        
        foreach ($files as $file) {
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if ($file !== '.' && $file !== '..' && in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'])) {
                if (fileHasTags($file, $tagFilter)) {
                    // Get text if available
                    $textFile = $textDir . pathinfo($file, PATHINFO_FILENAME) . '.txt';
                    $text = file_exists($textFile) ? file_get_contents($textFile) : '';
                    
                    $response[] = [
                        'filename' => $file,
                        'text' => $text,
                        'highlight' => ''
                    ];
                }
            }
        }
    }
}

// Funktion zum Extrahieren des Kontexts um den Suchbegriff herum (unchanged)
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