<?php
// get_ocr_key.php - Returns a randomly selected Space OCR API key
header('Content-Type: application/json');

$response = ['success' => false, 'message' => '', 'key' => ''];

// Path to configuration file
$configFile = __DIR__ . '/ocr_config.json';

if (file_exists($configFile)) {
    $configContent = file_get_contents($configFile);
    $configData = json_decode($configContent, true);
    
    if ($configData && isset($configData['space_ocr_api_keys']) && !empty($configData['space_ocr_api_keys'])) {
        // Get the array of API keys
        $apiKeys = $configData['space_ocr_api_keys'];
        
        // Check if we have valid keys
        if (count($apiKeys) > 0) {
            // Select a random key
            $randomIndex = array_rand($apiKeys);
            $selectedKey = $apiKeys[$randomIndex];
            
            $response['success'] = true;
            $response['key'] = $selectedKey;
            
            // Optional: For debugging purposes
            // $response['key_index'] = $randomIndex;
            // $response['total_keys'] = count($apiKeys);
        } else {
            $response['message'] = 'Error: No valid API keys found in configuration';
        }
    } else {
        $response['message'] = 'Error: Invalid or missing API keys in configuration';
    }
} else {
    $response['message'] = 'Error: Configuration file not found';
}

echo json_encode($response);
?>