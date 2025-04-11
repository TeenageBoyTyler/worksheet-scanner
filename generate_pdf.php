<?php
// generate_pdf.php - Generates a PDF with selected images
header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'pdfUrl' => ''
];

// Authentifizierungsprüfung einbinden
require_once 'auth/check_auth.php';
if (!isLoggedIn()) {
    $response['message'] = 'Nicht autorisiert';
    echo json_encode($response);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // JSON-Daten aus dem Request-Body parsen
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    if (isset($data['files']) && is_array($data['files']) && !empty($data['files'])) {
        $files = $data['files'];
        
        // Include FPDF
        require_once 'fpdf/fpdf.php';
        
        // Create temporary directory if it doesn't exist
        $tempDir = 'temp/';
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        
        // Generate unique filename for the PDF
        $pdfFilename = 'selected_images_' . uniqid() . '.pdf';
        $pdfPath = $tempDir . $pdfFilename;
        
        try {
            // Create a new PDF document
            $pdf = new FPDF('P', 'mm', 'A4');
            $pdf->SetAutoPageBreak(true, 10);
            
            // Image counter for valid images
            $imageCount = 0;
            $errorFiles = [];
            
            foreach ($files as $filename) {
                // Grundlegende Sicherheitsüberprüfung
                if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
                    $errorFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Ungültiger Dateiname'
                    ];
                    continue;
                }
                
                $filepath = 'uploads/' . $filename;
                
                if (!file_exists($filepath)) {
                    $errorFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Datei nicht gefunden'
                    ];
                    continue;
                }
                
                // Check file type
                $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
                
                // Skip PDF files - FPDF can't embed PDFs
                if ($extension === 'pdf') {
                    $errorFiles[] = [
                        'filename' => $filename,
                        'reason' => 'PDF-Dateien können nicht in das PDF eingebettet werden'
                    ];
                    continue;
                }
                
                // Add a new page for each image
                $pdf->AddPage();
                
                // Get image dimensions
                list($imgWidth, $imgHeight) = getimagesize($filepath);
                
                // Calculate dimensions to fit the image on the page
                $pageWidth = 210 - 20; // A4 width minus margins
                $pageHeight = 297 - 20; // A4 height minus margins
                
                // Calculate scaling to fit image on page while maintaining aspect ratio
                $widthRatio = $pageWidth / $imgWidth;
                $heightRatio = $pageHeight / $imgHeight;
                $ratio = min($widthRatio, $heightRatio);
                
                $newWidth = $imgWidth * $ratio;
                $newHeight = $imgHeight * $ratio;
                
                // Center the image on the page
                $x = (210 - $newWidth) / 2;
                $y = (297 - $newHeight) / 2;
                
                // Add the image to the PDF
                try {
                    $pdf->Image($filepath, $x, $y, $newWidth, $newHeight);
                    $imageCount++;
                } catch (Exception $e) {
                    $errorFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Fehler beim Hinzufügen des Bildes zum PDF: ' . $e->getMessage()
                    ];
                    continue;
                }
                
                // Add caption with filename at the bottom of the page
                $pdf->SetY(-15); // 15mm from bottom
                $pdf->SetFont('Arial', 'I', 8);
                $pdf->Cell(0, 10, $filename, 0, 0, 'C');
            }
            
            if ($imageCount === 0) {
                // No valid images were added
                $response['message'] = 'Keine gültigen Bilder zum Hinzufügen zum PDF';
                echo json_encode($response);
                exit;
            }
            
            // Save the PDF file
            $pdf->Output('F', $pdfPath);
            
            if (file_exists($pdfPath)) {
                $response['success'] = true;
                $response['message'] = 'PDF erfolgreich erstellt mit ' . $imageCount . ' Bildern';
                $response['pdfUrl'] = $tempDir . $pdfFilename;
                
                // Add error files information if any
                if (!empty($errorFiles)) {
                    $response['errorFiles'] = $errorFiles;
                    $response['message'] .= ' (' . count($errorFiles) . ' Dateien konnten nicht hinzugefügt werden)';
                }
            } else {
                $response['message'] = 'Fehler beim Speichern der PDF-Datei';
            }
        } catch (Exception $e) {
            $response['message'] = 'Fehler bei der PDF-Erstellung: ' . $e->getMessage();
        }
    } else {
        $response['message'] = 'Keine Dateien zum Hinzufügen ausgewählt';
    }
} else {
    $response['message'] = 'Nur POST-Anfragen sind erlaubt';
}

echo json_encode($response);
?>