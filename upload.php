<?php
// upload.php - Verarbeitet Bilduploads
header('Content-Type: application/json');

// Stellen Sie sicher, dass das Upload-Verzeichnis existiert
$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['imageFile']) && $_FILES['imageFile']['error'] === UPLOAD_ERR_OK) {
        $fileInfo = pathinfo($_FILES['imageFile']['name']);
        $extension = strtolower($fileInfo['extension']);
        
        // Erweiterte erlaubte Dateitypen
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
        
        if (in_array($extension, $allowedExtensions)) {
            // Eindeutigen Dateinamen erstellen
            $filename = uniqid() . '.' . $extension;
            $destination = $uploadDir . $filename;
            
            if (move_uploaded_file($_FILES['imageFile']['tmp_name'], $destination)) {
                $response['success'] = true;
                $response['message'] = 'Datei erfolgreich hochgeladen';
                $response['filename'] = $filename;
                $response['extension'] = $extension;
            } else {
                $response['message'] = 'Fehler beim Speichern der Datei';
            }
        } else {
            $response['message'] = 'Nur JPG, JPEG, PNG, GIF, WebP und PDF Dateien sind erlaubt';
        }
    } else {
        $response['message'] = 'Keine Datei hochgeladen oder Fehler beim Upload';
    }
} else {
    $response['message'] = 'Ungültige Anfrage';
}

echo json_encode($response);
?>
