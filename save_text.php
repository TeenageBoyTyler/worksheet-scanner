<?php
// save_text.php - Speichert den erkannten Text zu einem Bild
header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['filename']) && isset($_POST['text'])) {
    $filename = $_POST['filename'];
    $text = $_POST['text'];
    
    // Grundlegende Sicherheitsüberprüfung
    if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
        $response['message'] = 'Ungültiger Dateiname';
    } else {
        // Speicherverzeichnis für Texte erstellen, falls es nicht existiert
        $textDir = 'texts/';
        if (!is_dir($textDir)) {
            mkdir($textDir, 0755, true);
        }
        
        // Textdatei erstellen mit gleichem Namen wie das Bild, aber .txt-Endung
        $textFile = $textDir . pathinfo($filename, PATHINFO_FILENAME) . '.txt';
        
        if (file_put_contents($textFile, $text)) {
            $response['success'] = true;
            $response['message'] = 'Text erfolgreich gespeichert';
        } else {
            $response['message'] = 'Fehler beim Speichern des Textes';
        }
    }
} else {
    $response['message'] = 'Ungültige Anfrage';
}

echo json_encode($response);
?>