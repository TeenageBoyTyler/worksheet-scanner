<?php
// get_images.php - Gibt Liste aller hochgeladenen Bilder und PDFs zurück
header('Content-Type: application/json');

$uploadDir = 'uploads/';
$images = [];

if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    
    foreach ($files as $file) {
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if ($file !== '.' && $file !== '..' && in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'])) {
            $images[] = $file;
        }
    }
}

echo json_encode($images);
?>