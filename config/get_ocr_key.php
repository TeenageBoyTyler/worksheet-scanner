<?php
// get_ocr_key.php - Gibt den Space OCR API-Key zurück
header('Content-Type: application/json');

$response = ['success' => false, 'message' => '', 'key' => ''];

// Pfad zur Konfigurations-Datei
$configFile = __DIR__ . '/ocr_config.json';

if (file_exists($configFile)) {
    $configContent = file_get_contents($configFile);
    $configData = json_decode($configContent, true);
    
    if ($configData && isset($configData['space_ocr_api_key']) && !empty($configData['space_ocr_api_key'])) {
        $response['success'] = true;
        $response['key'] = $configData['space_ocr_api_key'];
    } else {
        $response['message'] = 'Fehler: Ungültiger oder fehlender API-Key in der Konfigurationsdatei';
    }
} else {
    $response['message'] = 'Fehler: Konfigurationsdatei nicht gefunden';
}

echo json_encode($response);
?>