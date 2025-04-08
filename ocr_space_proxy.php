<?php
// ocr_space_proxy.php - Verbesserter Proxy für Space OCR API-Anfragen
header('Content-Type: application/json');

// Debug-Funktion
function logDebug($message, $data = []) {
    $logFile = 'ocr_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] {$message}\n";
    
    if (!empty($data)) {
        $logEntry .= "Daten: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
    
    $logEntry .= "--------------------\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// Initialisiere die Antwort
$response = ['success' => false, 'message' => '', 'text' => ''];

// Logge den Start der Anfrage
logDebug("Neue OCR-Anfrage empfangen", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'nicht definiert'
]);

// Nur POST-Anfragen akzeptieren
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Nur POST-Anfragen erlaubt';
    echo json_encode($response);
    exit;
}

// Lies den API-Key aus der Konfigurationsdatei
$configFile = __DIR__ . '/config/ocr_config.json';
if (!file_exists($configFile)) {
    logDebug("Konfigurationsdatei nicht gefunden", ['path' => $configFile]);
    $response['message'] = 'Konfigurationsdatei nicht gefunden';
    echo json_encode($response);
    exit;
}

$configContent = file_get_contents($configFile);
$configData = json_decode($configContent, true);

if (!$configData || !isset($configData['space_ocr_api_key']) || empty($configData['space_ocr_api_key'])) {
    logDebug("API-Key nicht gefunden oder ungültig", ['config' => $configData]);
    $response['message'] = 'API-Key nicht gefunden oder ungültig';
    echo json_encode($response);
    exit;
}

$apiKey = $configData['space_ocr_api_key'];
logDebug("API-Key gefunden", ['key_length' => strlen($apiKey)]);

// Prüfe nach JSON-Daten im Body
$jsonInput = null;
$inputData = file_get_contents('php://input');
if (!empty($inputData)) {
    $jsonInput = json_decode($inputData, true);
    logDebug("JSON-Eingabe empfangen", [
        'valid_json' => ($jsonInput !== null),
        'has_base64Image' => isset($jsonInput['base64Image'])
    ]);
}

// Verarbeite die Anfrage je nach Input-Typ
if ($jsonInput && isset($jsonInput['base64Image'])) {
    // Base64-Bildverarbeitung
    $base64Image = $jsonInput['base64Image'];
    $language = isset($jsonInput['language']) ? $jsonInput['language'] : 'ger'; // Default: Deutsch
    
    logDebug("Verarbeite Base64-Bild", [
        'base64_length' => strlen($base64Image),
        'language' => $language
    ]);
    
    // Space OCR API-Anfrage mit Base64-Daten
    $postData = array(
        'apikey' => $apiKey,
        'language' => $language,
        'isOverlayRequired' => 'false',
        'detectOrientation' => 'true',
        'scale' => 'true',
        'OCREngine' => '2', // Engine 2 für bessere Genauigkeit
        'base64Image' => 'data:image/jpeg;base64,' . $base64Image
    );
    
    $ch = curl_init('https://api.ocr.space/parse/image');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    
} elseif (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    // Datei-Upload-Verarbeitung
    $uploadedFile = $_FILES['image']['tmp_name'];
    $language = isset($_POST['language']) ? $_POST['language'] : 'ger'; // Default: Deutsch
    
    logDebug("Verarbeite hochgeladene Datei", [
        'filename' => $_FILES['image']['name'],
        'size' => $_FILES['image']['size'],
        'language' => $language
    ]);
    
    // Space OCR API-Anfrage mit Datei-Upload
    $ch = curl_init('https://api.ocr.space/parse/image');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    
    $postFields = [
        'apikey' => $apiKey,
        'language' => $language,
        'isOverlayRequired' => 'false',
        'detectOrientation' => 'true',
        'scale' => 'true',
        'OCREngine' => '2', // Engine 2 für bessere Genauigkeit
        'file' => new CURLFile($uploadedFile, 'image/jpeg', 'image.jpg')
    ];
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    
} else {
    logDebug("Keine Bild- oder Base64-Daten gefunden", [
        'has_files' => isset($_FILES) ? array_keys($_FILES) : 'keine',
        'post_data' => $_POST,
        'json_input' => $jsonInput
    ]);
    
    $response['message'] = 'Keine Bilddatei oder Base64-Daten gefunden';
    echo json_encode($response);
    exit;
}

// Führe die API-Anfrage aus
logDebug("Sende Anfrage an OCR.space API");
$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

logDebug("API-Antwort erhalten", [
    'http_code' => $httpCode,
    'content_type' => $contentType,
    'response_size' => strlen($result)
]);

if ($result === false) {
    $curlError = curl_error($ch);
    logDebug("cURL-Fehler", ['error' => $curlError, 'errno' => curl_errno($ch)]);
    
    $response['message'] = 'Fehler bei der API-Anfrage: ' . $curlError;
    echo json_encode($response);
    exit;
}

curl_close($ch);

// Verarbeite die API-Antwort
$apiResponse = json_decode($result, true);

if ($apiResponse === null) {
    logDebug("JSON-Parsing-Fehler", ['raw_response' => substr($result, 0, 1000)]);
    
    $response['message'] = 'Ungültige Antwort von der OCR API: ' . json_last_error_msg();
    echo json_encode($response);
    exit;
}

logDebug("API-Antwort geparst", $apiResponse);

if ($httpCode !== 200 || isset($apiResponse['ErrorMessage']) && !empty($apiResponse['ErrorMessage'])) {
    $errorMsg = isset($apiResponse['ErrorMessage']) ? $apiResponse['ErrorMessage'] : 'Unbekannter API-Fehler';
    logDebug("API-Fehler", ['error_message' => $errorMsg]);
    
    $response['message'] = 'API-Fehler: ' . $errorMsg;
    echo json_encode($response);
    exit;
}

// Extrahiere den erkannten Text
$parsedText = '';
if (isset($apiResponse['ParsedResults']) && is_array($apiResponse['ParsedResults'])) {
    foreach ($apiResponse['ParsedResults'] as $parsedResult) {
        if (isset($parsedResult['ParsedText'])) {
            $parsedText .= $parsedResult['ParsedText'];
        }
    }
    
    logDebug("Text extrahiert", ['text_length' => strlen($parsedText)]);
} else {
    logDebug("Keine ParsedResults gefunden", ['response_keys' => array_keys($apiResponse)]);
    
    $response['message'] = 'Keine erkannten Textdaten in der API-Antwort';
    echo json_encode($response);
    exit;
}

if (empty($parsedText)) {
    logDebug("Leerer Text erkannt");
    
    $response['message'] = 'Kein Text erkannt';
    echo json_encode($response);
    exit;
}

// Erfolgreiche Antwort
$response['success'] = true;
$response['text'] = $parsedText;

logDebug("Erfolgreiche Verarbeitung", ['text_length' => strlen($parsedText)]);
echo json_encode($response);
?>