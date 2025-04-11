<?php
// update_tags.php - Updates tags for an existing document
header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

// Authentifizierungsprüfung einbinden (optional, wenn API nur für angemeldete Benutzer sein soll)
require_once 'auth/check_auth.php';
if (!isLoggedIn()) {
    $response['message'] = 'Nicht autorisiert';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // JSON-Daten aus dem Request-Body parsen
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    if (isset($data['filename']) && isset($data['tags']) && is_array($data['tags'])) {
        $filename = $data['filename'];
        $tags = $data['tags'];
        
        // Grundlegende Sicherheitsüberprüfung
        if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            $response['message'] = 'Ungültiger Dateiname';
            echo json_encode($response);
            exit;
        }
        
        // Metadaten-Datei Pfad
        $metaFile = 'meta/' . pathinfo($filename, PATHINFO_FILENAME) . '.json';
        
        // Prüfen, ob die Metadaten-Datei existiert
        if (file_exists($metaFile)) {
            // Bestehende Metadaten laden
            $metadata = json_decode(file_get_contents($metaFile), true);
            
            // Tags aktualisieren
            $metadata['tags'] = $tags;
            $metadata['last_modified'] = date('Y-m-d H:i:s');
            
            // Metadaten speichern
            if (file_put_contents($metaFile, json_encode($metadata, JSON_PRETTY_PRINT))) {
                $response['success'] = true;
                $response['message'] = 'Tags erfolgreich aktualisiert';
                $response['metadata'] = $metadata;
            } else {
                $response['message'] = 'Fehler beim Speichern der Metadaten';
            }
        } else {
            // Wenn keine Metadaten-Datei existiert, neue erstellen
            $metadata = [
                'filename' => $filename,
                'tags' => $tags,
                'upload_date' => date('Y-m-d H:i:s'),
                'last_modified' => date('Y-m-d H:i:s')
            ];
            
            // Verzeichnis prüfen und ggf. erstellen
            $metaDir = 'meta/';
            if (!is_dir($metaDir)) {
                mkdir($metaDir, 0755, true);
            }
            
            // Metadaten speichern
            if (file_put_contents($metaFile, json_encode($metadata, JSON_PRETTY_PRINT))) {
                $response['success'] = true;
                $response['message'] = 'Tags erfolgreich gespeichert';
                $response['metadata'] = $metadata;
            } else {
                $response['message'] = 'Fehler beim Speichern der Metadaten';
            }
        }
    } else {
        $response['message'] = 'Fehlende Parameter (filename oder tags)';
    }
} else {
    $response['message'] = 'Nur POST-Anfragen erlaubt';
}

echo json_encode($response);
?>