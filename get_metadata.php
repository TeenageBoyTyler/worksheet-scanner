<?php
// get_metadata.php - Returns metadata for an image
header('Content-Type: application/json');

$response = ['success' => false, 'metadata' => null];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['filename'])) {
    $filename = $_GET['filename'];
    
    // Basic security check
    if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
        $response['message'] = 'Invalid filename';
    } else {
        $metaFile = 'meta/' . pathinfo($filename, PATHINFO_FILENAME) . '.json';
        
        if (file_exists($metaFile) && is_file($metaFile)) {
            $metadata = json_decode(file_get_contents($metaFile), true);
            $response['success'] = true;
            $response['metadata'] = $metadata;
        } else {
            // Return empty metadata if none exists
            $response['success'] = true;
            $response['metadata'] = [
                'filename' => $filename,
                'tags' => [],
                'language' => null, // Add language field
                'upload_date' => ''
            ];
        }
    }
} else {
    $response['message'] = 'Invalid request';
}

echo json_encode($response);
?>