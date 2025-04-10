<?php
// get_metadata.php - Gibt die Metadaten zu einem Bild zurück
header('Content-Type: application/json');

$response = ['success' => false, 'metadata' => null];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['filename'])) {
    $filename = $_GET['filename'];
    
    // Grundlegende Sicherheitsüberprüfung
    if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
        $response['message'] = 'Ungültiger Dateiname';
    } else {
        $metaFile = 'meta/' . pathinfo($filename, PATHINFO_FILENAME) . '.json';
        
        if (file_exists($metaFile) && is_file($metaFile)) {
            $metadata = json_decode(file_get_contents($metaFile), true);
            $response['success'] = true;
            $response['metadata'] = $metadata;
        } else {
            // Wenn keine Metadaten vorhanden sind, leere Metadaten zurückgeben
            $response['success'] = true;
            $response['metadata'] = [
                'filename' => $filename,
                'tags' => [],
                'upload_date' => ''
            ];
        }
    }
} else {
    $response['message'] = 'Ungültige Anfrage';
}

echo json_encode($response);
?>