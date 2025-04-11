<?php
/**
 * cleanup_temp_pdfs.php - Removes old temporary PDF files
 * 
 * This script can be run via cron job to clean up the temp directory
 * Example cron: 0 3 * * * php /path/to/cleanup_temp_pdfs.php
 */

// Directory to clean
$tempDir = __DIR__ . '/temp/';

// Maximum age of files in seconds (24 hours)
$maxAge = 86400;

// Get current time
$now = time();

// Check if directory exists
if (!is_dir($tempDir)) {
    exit("Temp directory does not exist.\n");
}

// Initialize counters
$totalFiles = 0;
$deletedFiles = 0;

// Get all PDF files in the temp directory
$files = glob($tempDir . '*.pdf');

foreach ($files as $file) {
    $totalFiles++;
    
    // Get file modification time
    $fileTime = filemtime($file);
    
    // Check if file is older than max age
    if (($now - $fileTime) > $maxAge) {
        // Delete file
        if (unlink($file)) {
            $deletedFiles++;
        }
    }
}

// Output results
echo "Cleanup complete.\n";
echo "Total PDF files: $totalFiles\n";
echo "Deleted files: $deletedFiles\n";
?>