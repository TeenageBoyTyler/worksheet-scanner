<?php
// get_images_by_tags.php - Gibt Liste der Bilder gefiltert nach Tags zurück
header('Content-Type: application/json');

$response = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['tags'])) {
    $requestedTags = json_decode($_GET['tags'], true);
    
    if (!is_array($requestedTags) || empty($requestedTags)) {
        echo json_encode($response);
        exit;
    }
    
    // Verzeichnisse
    $metaDir = 'meta/';
    $uploadDir = 'uploads/';
    
    // Alle Metadatendateien durchsuchen
    $metaFiles = glob($metaDir . '*.json');
    
    foreach ($metaFiles as $metaFile) {
        $metadata = json_decode(file_get_contents($metaFile), true);
        
        if ($metadata && isset($metadata['filename']) && isset($metadata['tags'])) {
            $filename = $metadata['filename'];
            $fileTags = $metadata['tags'];
            
            // Prüfen, ob das Bild die angeforderten Tags hat (mindestens eines davon)
            $hasMatchingTag = false;
            foreach ($requestedTags as $tag) {
                if (in_array($tag, $fileTags)) {
                    $hasMatchingTag = true;
                    break;
                }
            }
            
            // Wenn Tags übereinstimmen und die Datei existiert, zur Antwort hinzufügen
            if ($hasMatchingTag && file_exists($uploadDir . $filename)) {
                $response[] = [
                    'filename' => $filename,
                    'tags' => $fileTags
                ];
            }
        }
    }
}

echo json_encode($response);
?>