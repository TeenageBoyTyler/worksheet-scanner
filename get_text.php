<?php
// get_text.php - Gibt den erkannten Text zu einem Bild zurück
header('Content-Type: application/json');

$response = ['success' => false, 'text' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['filename'])) {
    $filename = $_GET['filename'];
    
    // Grundlegende Sicherheitsüberprüfung
    if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
        $response['message'] = 'Ungültiger Dateiname';
    } else {
        $textFile = 'texts/' . pathinfo($filename, PATHINFO_FILENAME) . '.txt';
        
        if (file_exists($textFile) && is_file($textFile)) {
            $text = file_get_contents($textFile);
            $response['success'] = true;
            $response['text'] = $text;
        } else {
            $response['message'] = 'Keine Textdaten gefunden';
        }
    }
} else {
    $response['message'] = 'Ungültige Anfrage';
}

echo json_encode($response);
?>