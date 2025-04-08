<?php
// delete_image.php - Löscht ein hochgeladenes Bild und die zugehörige Textdatei
header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['filename'])) {
    $filename = $_POST['filename'];
    $filepath = 'uploads/' . $filename;
    
    // Grundlegende Sicherheitsüberprüfung
    if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
        $response['message'] = 'Ungültiger Dateiname';
    } elseif (file_exists($filepath) && is_file($filepath)) {
        $success = true;
        
        // 1. Bild löschen
        if (!unlink($filepath)) {
            $success = false;
            $response['message'] = 'Fehler beim Löschen der Bilddatei';
        }
        
        // 2. Zugehörige Textdatei löschen, falls vorhanden
        $textFilename = 'texts/' . pathinfo($filename, PATHINFO_FILENAME) . '.txt';
        if (file_exists($textFilename) && is_file($textFilename)) {
            if (!unlink($textFilename)) {
                // Nur als Warnung behandeln, nicht als Fehler
                $response['message'] .= ' Hinweis: Die zugehörige Textdatei konnte nicht gelöscht werden.';
            }
        }
        
        if ($success) {
            $response['success'] = true;
            $response['message'] = 'Datei(en) erfolgreich gelöscht';
        }
    } else {
        $response['message'] = 'Bilddatei nicht gefunden';
    }
} else {
    $response['message'] = 'Ungültige Anfrage';
}

echo json_encode($response);
?>