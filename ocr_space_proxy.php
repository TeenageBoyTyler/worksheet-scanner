<?php
// ocr_space_proxy.php - Enhanced proxy for Space OCR API with random key selection and language handling
header('Content-Type: application/json');

// Debug function - write messages to ocr_debug.log
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

// Initialize response
$response = ['success' => false, 'message' => '', 'text' => ''];

// Log start of request
logDebug("Neue OCR-Anfrage empfangen", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'nicht definiert'
]);

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Nur POST-Anfragen erlaubt';
    echo json_encode($response);
    exit;
}

// Read API key from configuration file
$configFile = __DIR__ . '/config/ocr_config.json';
if (!file_exists($configFile)) {
    logDebug("Konfigurationsdatei nicht gefunden", ['path' => $configFile]);
    $response['message'] = 'Konfigurationsdatei nicht gefunden';
    echo json_encode($response);
    exit;
}

$configContent = file_get_contents($configFile);
$configData = json_decode($configContent, true);

// Check if we have valid configuration
if (!$configData) {
    logDebug("Ungültige Konfigurationsdatei", ['error' => json_last_error_msg()]);
    $response['message'] = 'Ungültige Konfigurationsdatei';
    echo json_encode($response);
    exit;
}

// Determine which API key to use
// New format with multiple keys
if (isset($configData['space_ocr_api_keys']) && is_array($configData['space_ocr_api_keys']) && !empty($configData['space_ocr_api_keys'])) {
    // Get all available keys
    $apiKeys = $configData['space_ocr_api_keys'];
    
    // Select a random key
    $randomIndex = array_rand($apiKeys);
    $apiKey = $apiKeys[$randomIndex];
    
    logDebug("API-Key ausgewählt", [
        'key_length' => strlen($apiKey),
        'key_index' => $randomIndex,
        'total_keys' => count($apiKeys)
    ]);
} 
// Fallback to old format with single key
else if (isset($configData['space_ocr_api_key']) && !empty($configData['space_ocr_api_key'])) {
    $apiKey = $configData['space_ocr_api_key'];
    logDebug("Alter Konfigurationsformat gefunden - einzelner API-Key verwendet", ['key_length' => strlen($apiKey)]);
} 
// No valid keys found
else {
    logDebug("Keine gültigen API-Keys gefunden", ['config' => array_keys($configData)]);
    $response['message'] = 'Keine gültigen API-Keys gefunden';
    echo json_encode($response);
    exit;
}

// Check for JSON data in the request body
$jsonInput = null;
$inputData = file_get_contents('php://input');
if (!empty($inputData)) {
    $jsonInput = json_decode($inputData, true);
    logDebug("JSON-Eingabe empfangen", [
        'valid_json' => ($jsonInput !== null),
        'has_base64Image' => isset($jsonInput['base64Image'])
    ]);
}

// Process the request based on input type
if ($jsonInput && isset($jsonInput['base64Image'])) {
    // Base64 image processing
    $base64Image = $jsonInput['base64Image'];
    
    // Get language from request or use default from config
    $language = isset($jsonInput['language']) ? $jsonInput['language'] : null;
    
    // If language is not specified, use default from config
    if (!$language && isset($configData['settings']['default_language'])) {
        $language = $configData['settings']['default_language'];
    }
    
    // Final fallback to German if no language is specified anywhere
    if (!$language) {
        $language = 'ger';
    }
    
    logDebug("Verarbeite Base64-Bild", [
        'base64_length' => strlen($base64Image),
        'language' => $language,
        'language_source' => isset($jsonInput['language']) ? 'request' : 'config_default'
    ]);
    
    // Send request to Space OCR API with Base64 data
    $postData = array(
        'apikey' => $apiKey,
        'language' => $language,
        'isOverlayRequired' => 'false',
        'detectOrientation' => 'true',
        'scale' => 'true',
        'OCREngine' => '2', // Engine 2 for better accuracy
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
    // File upload processing
    $uploadedFile = $_FILES['image']['tmp_name'];
    
    // Get language from request or use default from config
    $language = isset($_POST['language']) ? $_POST['language'] : null;
    
    // If language is not specified, use default from config
    if (!$language && isset($configData['settings']['default_language'])) {
        $language = $configData['settings']['default_language'];
    }
    
    // Final fallback to German if no language is specified anywhere
    if (!$language) {
        $language = 'ger';
    }
    
    logDebug("Verarbeite hochgeladene Datei", [
        'filename' => $_FILES['image']['name'],
        'size' => $_FILES['image']['size'],
        'language' => $language
    ]);
    
    // Create OCR request with file
    $ch = curl_init('https://api.ocr.space/parse/image');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    
    $postFields = [
        'apikey' => $apiKey,
        'language' => $language,
        'isOverlayRequired' => 'false',
        'detectOrientation' => 'true',
        'scale' => 'true',
        'OCREngine' => '2',
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

// Execute the API request
logDebug("Sende Anfrage an OCR.space API");
$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

if ($result === false) {
    $curlError = curl_error($ch);
    logDebug("cURL-Fehler", ['error' => $curlError, 'errno' => curl_errno($ch)]);
    
    $response['message'] = 'Fehler bei der API-Anfrage: ' . $curlError;
    echo json_encode($response);
    exit;
}

curl_close($ch);

// Log the API response details
logDebug("API-Antwort erhalten", [
    'http_code' => $httpCode,
    'content_type' => $contentType,
    'response_size' => strlen($result)
]);

// Process the API response
$apiResponse = json_decode($result, true);

if ($apiResponse === null) {
    logDebug("JSON-Parsing-Fehler", ['raw_response' => substr($result, 0, 1000)]);
    
    $response['message'] = 'Ungültige Antwort von der OCR API: ' . json_last_error_msg();
    echo json_encode($response);
    exit;
}

// Log the parsed response
logDebug("API-Antwort geparst", $apiResponse);

// Check for API errors
if ($httpCode !== 200 || (isset($apiResponse['ErrorMessage']) && !empty($apiResponse['ErrorMessage']))) {
    $errorMsg = isset($apiResponse['ErrorMessage']) ? $apiResponse['ErrorMessage'] : 'Unbekannter API-Fehler';
    logDebug("API-Fehler", ['error_message' => $errorMsg]);
    
    $response['message'] = 'API-Fehler: ' . $errorMsg;
    echo json_encode($response);
    exit;
}

// Extract recognized text
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

// Successful response
$response['success'] = true;
$response['text'] = $parsedText;
if (isset($language)) {
    $response['language'] = $language; // Return the language that was used
}

logDebug("Erfolgreiche Verarbeitung", [
    'text_length' => strlen($parsedText),
    'language' => $language ?? 'nicht angegeben'
]);

echo json_encode($response);
?>