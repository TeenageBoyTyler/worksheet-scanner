<?php
/**
 * OCR Space API Proxy
 * Leitet Anfragen an die OCR.space API weiter und rotiert API-Keys
 */
header('Content-Type: application/json');

// Konfiguration
define('LOG_ENABLED', true);       // Logging aktivieren/deaktivieren
define('CONFIG_FILE', __DIR__ . '/config/ocr_config.json');
define('OCR_API_URL', 'https://api.ocr.space/parse/image');
define('OCR_ENGINE', '2');         // 1 = Legacy, 2 = Deep Learning (präziser)
define('DEFAULT_LANGUAGE', 'ger'); // Standardsprache für OCR

// Logger-Klasse für besseres Logging
class Logger {
    private $logFile;
    
    public function __construct($filename = 'ocr_debug.log') {
        $this->logFile = $filename;
    }
    
    public function log($message, $data = []) {
        if (!LOG_ENABLED) return;
        
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[{$timestamp}] {$message}\n";
        
        if (!empty($data)) {
            $logEntry .= "Daten: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
        }
        
        $logEntry .= "--------------------\n";
        file_put_contents($this->logFile, $logEntry, FILE_APPEND);
    }
}

// API-Key-Manager
class ApiKeyManager {
    private $configFile;
    private $logger;
    
    public function __construct($configFile, Logger $logger) {
        $this->configFile = $configFile;
        $this->logger = $logger;
    }
    
    public function getApiKey() {
        if (!file_exists($this->configFile)) {
            $this->logger->log("Konfigurationsdatei nicht gefunden", ['path' => $this->configFile]);
            return null;
        }
        
        $configContent = file_get_contents($this->configFile);
        $configData = json_decode($configContent, true);
        
        if (!$configData) {
            $this->logger->log("Ungültiges JSON in Konfigurationsdatei", 
                               ['error' => json_last_error_msg()]);
            return null;
        }
        
        // Einzelschlüssel-Modus
        if (isset($configData['space_ocr_api_key'])) {
            $this->logger->log("Einzelner API-Key verwendet");
            return $configData['space_ocr_api_key'];
        }
        
        // Multi-Key-Modus mit Rotation
        if (isset($configData['space_ocr_api_keys']) && 
            is_array($configData['space_ocr_api_keys']) && 
            !empty($configData['space_ocr_api_keys'])) {
            
            $keysCount = count($configData['space_ocr_api_keys']);
            $lastIndex = isset($configData['last_used_index']) ? (int)$configData['last_used_index'] : 0;
            $nextIndex = ($lastIndex + 1) % $keysCount;
            
            $apiKey = $configData['space_ocr_api_keys'][$nextIndex];
            
            // Index aktualisieren
            $configData['last_used_index'] = $nextIndex;
            file_put_contents($this->configFile, json_encode($configData, JSON_PRETTY_PRINT));
            
            $this->logger->log("API-Key rotiert", [
                'total_keys' => $keysCount,
                'current_index' => $nextIndex + 1 // +1 für menschenfreundliche Zählung
            ]);
            
            return $apiKey;
        }
        
        $this->logger->log("Keine API-Keys in Konfiguration gefunden");
        return null;
    }
}

// OCR-Processor Klasse
class OcrProcessor {
    private $logger;
    private $apiKey;
    
    public function __construct($apiKey, Logger $logger) {
        $this->apiKey = $apiKey;
        $this->logger = $logger;
    }
    
    public function processRequest() {
        $response = ['success' => false, 'message' => '', 'text' => ''];
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $response['message'] = 'Nur POST-Anfragen erlaubt';
            return $response;
        }
        
        try {
            // Verarbeitung basierend auf dem Input-Typ
            $ch = null;
            
            // JSON-Input (Base64-Bild)
            $jsonInput = $this->getJsonInput();
            if ($jsonInput && isset($jsonInput['base64Image'])) {
                $ch = $this->prepareBase64Request($jsonInput);
            } 
            // Datei-Upload
            else if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $ch = $this->prepareFileRequest();
            } 
            // Kein gültiger Input
            else {
                $this->logger->log("Kein gültiger Input gefunden");
                $response['message'] = 'Keine Bilddatei oder Base64-Daten gefunden';
                return $response;
            }
            
            // API-Anfrage ausführen
            $result = $this->executeRequest($ch);
            if ($result === false) {
                $curlError = curl_error($ch);
                $this->logger->log("cURL-Fehler", ['error' => $curlError]);
                $response['message'] = 'Fehler bei der API-Anfrage: ' . $curlError;
                curl_close($ch);
                return $response;
            }
            
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            // API-Antwort verarbeiten
            return $this->processApiResponse($result, $httpCode);
            
        } catch (Exception $e) {
            $this->logger->log("Ausnahme bei der Verarbeitung", ['error' => $e->getMessage()]);
            $response['message'] = 'Fehler: ' . $e->getMessage();
            return $response;
        }
    }
    
    private function getJsonInput() {
        $inputData = file_get_contents('php://input');
        if (empty($inputData)) return null;
        
        $jsonInput = json_decode($inputData, true);
        $this->logger->log("JSON-Eingabe empfangen", [
            'valid_json' => ($jsonInput !== null),
            'has_base64Image' => isset($jsonInput['base64Image'])
        ]);
        
        return $jsonInput;
    }
    
    private function prepareBase64Request($jsonInput) {
        $base64Image = $jsonInput['base64Image'];
        $language = isset($jsonInput['language']) ? $jsonInput['language'] : DEFAULT_LANGUAGE;
        
        $this->logger->log("Verarbeite Base64-Bild", [
            'base64_length' => strlen($base64Image),
            'language' => $language
        ]);
        
        $postData = [
            'apikey' => $this->apiKey,
            'language' => $language,
            'isOverlayRequired' => 'false',
            'detectOrientation' => 'true',
            'scale' => 'true',
            'OCREngine' => OCR_ENGINE,
            'base64Image' => 'data:image/jpeg;base64,' . $base64Image
        ];
        
        $ch = curl_init(OCR_API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        
        return $ch;
    }
    
    private function prepareFileRequest() {
        $uploadedFile = $_FILES['image']['tmp_name'];
        $language = isset($_POST['language']) ? $_POST['language'] : DEFAULT_LANGUAGE;
        
        $this->logger->log("Verarbeite hochgeladene Datei", [
            'filename' => $_FILES['image']['name'],
            'size' => $_FILES['image']['size'],
            'language' => $language
        ]);
        
        $ch = curl_init(OCR_API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        
        $postFields = [
            'apikey' => $this->apiKey,
            'language' => $language,
            'isOverlayRequired' => 'false',
            'detectOrientation' => 'true',
            'scale' => 'true',
            'OCREngine' => OCR_ENGINE,
            'file' => new CURLFile($uploadedFile, 'image/jpeg', 'image.jpg')
        ];
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        
        return $ch;
    }
    
    private function executeRequest($ch) {
        $this->logger->log("Sende Anfrage an OCR.space API");
        return curl_exec($ch);
    }
    
    private function processApiResponse($result, $httpCode) {
        $response = ['success' => false, 'message' => '', 'text' => ''];
        
        $this->logger->log("API-Antwort erhalten", [
            'http_code' => $httpCode,
            'response_size' => strlen($result)
        ]);
        
        $apiResponse = json_decode($result, true);
        
        if ($apiResponse === null) {
            $this->logger->log("JSON-Parsing-Fehler", [
                'raw_response' => substr($result, 0, 1000)
            ]);
            
            $response['message'] = 'Ungültige Antwort von der OCR API: ' . json_last_error_msg();
            return $response;
        }
        
        if ($httpCode !== 200 || 
            (isset($apiResponse['ErrorMessage']) && !empty($apiResponse['ErrorMessage']))) {
            $errorMsg = isset($apiResponse['ErrorMessage']) 
                      ? $apiResponse['ErrorMessage'] 
                      : 'Unbekannter API-Fehler';
            
            $this->logger->log("API-Fehler", ['error_message' => $errorMsg]);
            $response['message'] = 'API-Fehler: ' . $errorMsg;
            return $response;
        }
        
        // Text extrahieren
        $parsedText = $this->extractText($apiResponse);
        
        if (empty($parsedText)) {
            $this->logger->log("Leerer Text erkannt");
            $response['message'] = 'Kein Text erkannt';
            return $response;
        }
        
        // Erfolgreiche Antwort
        $response['success'] = true;
        $response['text'] = $parsedText;
        
        $this->logger->log("Erfolgreiche Verarbeitung", [
            'text_length' => strlen($parsedText)
        ]);
        
        return $response;
    }
    
    private function extractText($apiResponse) {
        $parsedText = '';
        
        if (isset($apiResponse['ParsedResults']) && is_array($apiResponse['ParsedResults'])) {
            foreach ($apiResponse['ParsedResults'] as $parsedResult) {
                if (isset($parsedResult['ParsedText'])) {
                    $parsedText .= $parsedResult['ParsedText'];
                }
            }
            
            $this->logger->log("Text extrahiert", [
                'text_length' => strlen($parsedText)
            ]);
        } else {
            $this->logger->log("Keine ParsedResults gefunden", [
                'response_keys' => array_keys($apiResponse)
            ]);
        }
        
        return $parsedText;
    }
}

// Skript ausführen
try {
    $logger = new Logger();
    $logger->log("Neue OCR-Anfrage empfangen", [
        'method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'nicht definiert'
    ]);
    
    $keyManager = new ApiKeyManager(CONFIG_FILE, $logger);
    $apiKey = $keyManager->getApiKey();
    
    if (!$apiKey) {
        $response = ['success' => false, 'message' => 'API-Key konnte nicht abgerufen werden'];
        echo json_encode($response);
        exit;
    }
    
    $processor = new OcrProcessor($apiKey, $logger);
    $result = $processor->processRequest();
    
    echo json_encode($result);
} catch (Exception $e) {
    $response = ['success' => false, 'message' => 'Unerwarteter Fehler: ' . $e->getMessage()];
    echo json_encode($response);
}
?>