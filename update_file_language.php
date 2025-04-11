<?php
// update_file_language.php - Updates the detected language for a file in its metadata
header('Content-Type: application/json');

$response = ['success' => false, 'message' => ''];

// Include authentication check (optional, if API is only for logged-in users)
require_once 'auth/check_auth.php';
if (!isLoggedIn()) {
    $response['message'] = 'Not authorized';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Parse JSON data from request body
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    if (isset($data['filename']) && isset($data['language'])) {
        $filename = $data['filename'];
        $language = $data['language'];
        
        // Basic security check
        if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
            $response['message'] = 'Invalid filename';
            echo json_encode($response);
            exit;
        }
        
        // Metadata file path
        $metaFile = 'meta/' . pathinfo($filename, PATHINFO_FILENAME) . '.json';
        
        // Check if metadata file exists
        if (file_exists($metaFile)) {
            // Load existing metadata
            $metadata = json_decode(file_get_contents($metaFile), true);
            
            // Update language
            $metadata['language'] = $language;
            $metadata['last_modified'] = date('Y-m-d H:i:s');
            
            // Save metadata
            if (file_put_contents($metaFile, json_encode($metadata, JSON_PRETTY_PRINT))) {
                $response['success'] = true;
                $response['message'] = 'Language successfully updated';
                $response['metadata'] = $metadata;
            } else {
                $response['message'] = 'Error saving metadata';
            }
        } else {
            // If no metadata file exists, create new one
            $metadata = [
                'filename' => $filename,
                'language' => $language,
                'tags' => [],
                'upload_date' => date('Y-m-d H:i:s'),
                'last_modified' => date('Y-m-d H:i:s')
            ];
            
            // Check directory and create if needed
            $metaDir = 'meta/';
            if (!is_dir($metaDir)) {
                mkdir($metaDir, 0755, true);
            }
            
            // Save metadata
            if (file_put_contents($metaFile, json_encode($metadata, JSON_PRETTY_PRINT))) {
                $response['success'] = true;
                $response['message'] = 'Language successfully saved';
                $response['metadata'] = $metadata;
            } else {
                $response['message'] = 'Error saving metadata';
            }
        }
    } else {
        $response['message'] = 'Missing parameters (filename or language)';
    }
} else {
    $response['message'] = 'Only POST requests allowed';
}

echo json_encode($response);
?>