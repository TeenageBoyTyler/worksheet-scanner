<?php
// get_images.php - Updated to support tag filtering with OR logic
header('Content-Type: application/json');

$uploadDir = 'uploads/';
$images = [];
$filteredImages = [];

// Function to check if a file has at least one of the specified tags (OR logic)
function fileHasTags($filename, $filterTags) {
    $metaFile = 'meta/' . pathinfo($filename, PATHINFO_FILENAME) . '.json';
    
    if (file_exists($metaFile)) {
        $metadata = json_decode(file_get_contents($metaFile), true);
        if (isset($metadata['tags']) && is_array($metadata['tags'])) {
            // Check if file has ANY of the requested tags (OR logic)
            foreach ($filterTags as $tag) {
                if (in_array($tag, $metadata['tags'])) {
                    return true; // Found at least one matching tag
                }
            }
        }
    }
    return false; // No matching tags found
}

if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    
    // Filter by file extension first
    foreach ($files as $file) {
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if ($file !== '.' && $file !== '..' && in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'])) {
            $images[] = $file;
        }
    }
    
    // Apply tag filtering if specified
    if (isset($_GET['tags']) && !empty($_GET['tags'])) {
        $filterTags = explode(',', $_GET['tags']);
        
        foreach ($images as $file) {
            if (fileHasTags($file, $filterTags)) {
                $filteredImages[] = $file;
            }
        }
        
        // Use filtered images if tag filter was applied
        $images = $filteredImages;
    }
}

echo json_encode($images);
?>