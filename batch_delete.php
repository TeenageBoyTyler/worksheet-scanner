<?php
// batch_delete.php - Löscht mehrere hochgeladene Dateien und zugehörige Textdateien
header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'deleted' => [],
    'failed' => []
];

// Authentifizierungsprüfung einbinden (optional, wenn API nur für angemeldete Benutzer sein soll)
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
        $totalSuccess = 0;
        
        foreach ($files as $filename) {
            // Grundlegende Sicherheitsüberprüfung
            if (strpos($filename, '/') !== false || strpos($filename, '\\') !== false) {
                $response['failed'][] = [
                    'filename' => $filename,
                    'reason' => 'Ungültiger Dateiname'
                ];
                continue;
            }
            
            $filepath = 'uploads/' . $filename;
            
            if (file_exists($filepath) && is_file($filepath)) {
                $success = true;
                
                // 1. Bild löschen
                if (!unlink($filepath)) {
                    $success = false;
                    $response['failed'][] = [
                        'filename' => $filename,
                        'reason' => 'Fehler beim Löschen der Bilddatei'
                    ];
                }
                
                // 2. Zugehörige Textdatei löschen, falls vorhanden
                $textFilename = 'texts/' . pathinfo($filename, PATHINFO_FILENAME) . '.txt';
                if (file_exists($textFilename) && is_file($textFilename)) {
                    if (!unlink($textFilename)) {
                        // Nur als Warnung behandeln, nicht als Fehler
                        if ($success) {
                            $response['deleted'][] = [
                                'filename' => $filename,
                                'warning' => 'Die zugehörige Textdatei konnte nicht gelöscht werden'
                            ];
                        }
                    } elseif ($success) {
                        $response['deleted'][] = [
                            'filename' => $filename
                        ];
                    }
                } elseif ($success) {
                    $response['deleted'][] = [
                        'filename' => $filename
                    ];
                }
                
                // 3. Zugehörige Metadatendatei löschen, falls vorhanden
                $metaFilename = 'meta/' . pathinfo($filename, PATHINFO_FILENAME) . '.json';
                if (file_exists($metaFilename) && is_file($metaFilename)) {
                    if (!unlink($metaFilename)) {
                        // Nur als Warnung behandeln, nicht als Fehler
                        if ($success && isset($response['deleted'][count($response['deleted']) - 1])) {
                            if (isset($response['deleted'][count($response['deleted']) - 1]['warning'])) {
                                $response['deleted'][count($response['deleted']) - 1]['warning'] .= ' Die zugehörige Metadatendatei konnte nicht gelöscht werden.';
                            } else {
                                $response['deleted'][count($response['deleted']) - 1]['warning'] = 'Die zugehörige Metadatendatei konnte nicht gelöscht werden.';
                            }
                        }
                    }
                }
                
                if ($success) {
                    $totalSuccess++;
                }
            } else {
                $response['failed'][] = [
                    'filename' => $filename,
                    'reason' => 'Bilddatei nicht gefunden'
                ];
            }
        }
        
        // Prüfen, ob alle, einige oder keine Dateien gelöscht wurden
        if ($totalSuccess === count($files)) {
            $response['success'] = true;
            $response['message'] = 'Alle Dateien wurden erfolgreich gelöscht';
        } elseif ($totalSuccess > 0) {
            $response['success'] = true;
            $response['message'] = $totalSuccess . ' von ' . count($files) . ' Dateien wurden gelöscht';
        } else {
            $response['message'] = 'Keine Dateien konnten gelöscht werden';
        }
    } else {
        $response['message'] = 'Keine Dateien zum Löschen angegeben';
    }
} else {
    $response['message'] = 'Ungültige Anfrage';
}

echo json_encode($response);
?>