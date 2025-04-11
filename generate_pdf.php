<?php
// generate_pdf.php - Generates a PDF with selected images and PDFs
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
        
        // Include FPDF and FPDI
        require_once 'fpdf/fpdf.php';
        require_once 'fpdi/src/autoload.php';
        
        // Create temporary directory if it doesn't exist
        $tempDir = 'temp/';
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        
        // Generate unique filename for the PDF
        $pdfFilename = 'selected_documents_' . uniqid() . '.pdf';
        $pdfPath = $tempDir . $pdfFilename;
        
        try {
            // Create a new PDF document using FPDI
            $pdf = new \setasign\Fpdi\Fpdi('P', 'mm', 'A4');
            
            // Disable auto page break to prevent unexpected page breaks
            $pdf->SetAutoPageBreak(false);
            
            // Image counter for valid files
            $fileCount = 0;
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
                
                // Handle PDF files
                if ($extension === 'pdf') {
                    try {
                        // Get page count from the PDF
                        $pageCount = $pdf->setSourceFile($filepath);
                        
                        if ($pageCount === 0) {
                            $errorFiles[] = [
                                'filename' => $filename,
                                'reason' => 'Leere PDF-Datei'
                            ];
                            continue;
                        }
                        
                        // Import all pages from the PDF
                        for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                            // Import a page
                            $templateId = $pdf->importPage($pageNo);
                            
                            // Add a blank page to the output PDF
                            $pdf->AddPage();
                            
                            // Use the imported page (without any footer)
                            $pdf->useTemplate($templateId);
                            
                            $fileCount++;
                        }
                    } catch (Exception $e) {
                        $errorFiles[] = [
                            'filename' => $filename,
                            'reason' => 'Fehler beim Verarbeiten der PDF-Datei: ' . $e->getMessage()
                        ];
                        continue;
                    }
                } 
                // Handle image files
                else if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                    try {
                        // Check if image is readable
                        if (!@getimagesize($filepath)) {
                            $errorFiles[] = [
                                'filename' => $filename,
                                'reason' => 'Bild konnte nicht gelesen werden'
                            ];
                            continue;
                        }
                        
                        // Get image dimensions
                        list($imgWidth, $imgHeight) = getimagesize($filepath);
                        
                        // Calculate aspect ratio
                        $imgRatio = $imgWidth / $imgHeight;
                        
                        // Determine if we should use landscape or portrait orientation based on image aspect ratio
                        $isLandscape = $imgRatio > 1;
                        
                        // Add a new page with the proper orientation
                        if ($isLandscape) {
                            $pdf->AddPage('L'); // Landscape
                            $availableWidth = 297;   // Swapped dimensions for landscape
                            $availableHeight = 210;
                        } else {
                            $pdf->AddPage('P'); // Portrait
                            $availableWidth = 210;
                            $availableHeight = 297;
                        }
                        
                        // Calculate scaling to fit image on page while maintaining aspect ratio
                        $widthRatio = $availableWidth / $imgWidth;
                        $heightRatio = $availableHeight / $imgHeight;
                        
                        // Use the smaller ratio to ensure image fits completely on the page
                        $ratio = min($widthRatio, $heightRatio);
                        
                        // Calculate the new dimensions that preserve aspect ratio
                        $newWidth = $imgWidth * $ratio;
                        $newHeight = $imgHeight * $ratio;
                        
                        // Calculate positioning to center the image on the page
                        $x = ($availableWidth - $newWidth) / 2;
                        $y = ($availableHeight - $newHeight) / 2;
                        
                        // Add the image to the PDF, centered and with original aspect ratio
                        $pdf->Image($filepath, $x, $y, $newWidth, $newHeight);
                        
                        $fileCount++;
                    } catch (Exception $e) {
                        $errorFiles[] = [
                            'filename' => $filename,
                            'reason' => 'Fehler beim Hinzufügen des Bildes zum PDF: ' . $e->getMessage()
                        ];
                        continue;
                    }
                } else {
                    $errorFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Nicht unterstützter Dateityp'
                    ];
                    continue;
                }
            }
            
            if ($fileCount === 0) {
                // No valid files were added
                $response['message'] = 'Keine gültigen Dateien zum Hinzufügen zum PDF';
                echo json_encode($response);
                exit;
            }
            
            // Save the PDF file
            $pdf->Output('F', $pdfPath);
            
            if (file_exists($pdfPath)) {
                $response['success'] = true;
                $response['message'] = 'PDF erfolgreich erstellt mit ' . $fileCount . ' Seiten';
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