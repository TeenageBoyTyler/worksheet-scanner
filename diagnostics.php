<?php
// diagnostics.php - Server environment diagnostics for OCR system

header('Content-Type: text/html; charset=utf-8');

// Start the diagnostic report
echo "<!DOCTYPE html>
<html>
<head>
    <title>OCR System Diagnostics</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .module { margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 5px; }
        .module h2 { margin-top: 0; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        .code { font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>OCR System Diagnostics</h1>
    <p>This script checks your server environment for compatibility with the OCR system.</p>";

echo "<div class='module'>
    <h2>PHP Version</h2>";

// Check PHP version
$phpVersion = phpversion();
$requiredVersion = '7.0.0';
if (version_compare($phpVersion, $requiredVersion, '>=')) {
    echo "<p class='success'>PHP version: {$phpVersion} ✓</p>";
} else {
    echo "<p class='error'>PHP version: {$phpVersion} ✗ (Required: {$requiredVersion} or higher)</p>";
}

echo "</div>";

// Check required PHP extensions
echo "<div class='module'>
    <h2>PHP Extensions</h2>
    <ul>";

$requiredExtensions = ['gd', 'curl', 'json', 'mbstring'];
$missingExtensions = [];

foreach ($requiredExtensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<li class='success'>{$ext} ✓</li>";
    } else {
        echo "<li class='error'>{$ext} ✗</li>";
        $missingExtensions[] = $ext;
    }
}

echo "</ul>";

if (!empty($missingExtensions)) {
    echo "<p class='error'>Missing required extensions: " . implode(', ', $missingExtensions) . "</p>";
}

echo "</div>";

// Check GD capabilities if loaded
if (extension_loaded('gd')) {
    echo "<div class='module'>
        <h2>GD Capabilities</h2>
        <ul>";
    
    $gdInfo = gd_info();
    foreach ($gdInfo as $feature => $supported) {
        $status = $supported ? "<span class='success'>✓</span>" : "<span class='warning'>✗</span>";
        echo "<li>{$feature}: {$status}</li>";
    }
    
    // Test image creation
    echo "<li>Image creation test: ";
    try {
        $testImage = imagecreatetruecolor(100, 100);
        if ($testImage) {
            echo "<span class='success'>✓</span>";
            imagedestroy($testImage);
        } else {
            echo "<span class='error'>✗</span>";
        }
    } catch (Exception $e) {
        echo "<span class='error'>✗ (Exception: {$e->getMessage()})</span>";
    }
    echo "</li>";
    
    echo "</ul></div>";
}

// Check file permissions
echo "<div class='module'>
    <h2>File Permissions</h2>
    <ul>";

$directoriesToCheck = ['uploads', 'texts', 'meta', 'temp'];
foreach ($directoriesToCheck as $dir) {
    if (file_exists($dir)) {
        $writable = is_writable($dir);
        $status = $writable ? "<span class='success'>✓</span>" : "<span class='error'>✗</span>";
        echo "<li>Directory {$dir}: {$status}" . ($writable ? " (Writable)" : " (Not writable)") . "</li>";
    } else {
        echo "<li>Directory {$dir}: <span class='warning'>Not found</span></li>";
    }
}

echo "</ul></div>";

// Check if configuration files exist
echo "<div class='module'>
    <h2>Configuration Files</h2>
    <ul>";

$configFiles = ['config/ocr_config.json'];
foreach ($configFiles as $file) {
    if (file_exists($file)) {
        echo "<li>File {$file}: <span class='success'>✓</span> (Exists)</li>";
        
        // Check if OCR config has an API key
        if ($file === 'config/ocr_config.json') {
            $content = file_get_contents($file);
            $config = json_decode($content, true);
            if ($config && isset($config['space_ocr_api_key']) && !empty($config['space_ocr_api_key'])) {
                echo "<li>OCR API Key: <span class='success'>✓</span> (Found)</li>";
            } else {
                echo "<li>OCR API Key: <span class='error'>✗</span> (Missing or empty)</li>";
            }
        }
    } else {
        echo "<li>File {$file}: <span class='error'>✗</span> (Not found)</li>";
    }
}

echo "</ul></div>";

// Test file operations
echo "<div class='module'>
    <h2>File Operations Test</h2>";

try {
    // Create temp test directories if they don't exist
    $testDirs = ['uploads', 'texts', 'meta'];
    foreach ($testDirs as $dir) {
        if (!file_exists($dir)) {
            if (mkdir($dir, 0755, true)) {
                echo "<p>Created directory {$dir} <span class='success'>✓</span></p>";
            } else {
                echo "<p>Failed to create directory {$dir} <span class='error'>✗</span></p>";
            }
        }
    }
    
    // Test file writing
    $testFile = 'uploads/test_write.tmp';
    if (file_put_contents($testFile, 'Test content')) {
        echo "<p>Write test: <span class='success'>✓</span></p>";
        
        // Test file reading
        $content = file_get_contents($testFile);
        if ($content === 'Test content') {
            echo "<p>Read test: <span class='success'>✓</span></p>";
        } else {
            echo "<p>Read test: <span class='error'>✗</span></p>";
        }
        
        // Test file deletion
        if (unlink($testFile)) {
            echo "<p>Delete test: <span class='success'>✓</span></p>";
        } else {
            echo "<p>Delete test: <span class='error'>✗</span></p>";
        }
    } else {
        echo "<p>Write test: <span class='error'>✗</span></p>";
    }
} catch (Exception $e) {
    echo "<p class='error'>Exception during file operations test: {$e->getMessage()}</p>";
}

echo "</div>";

// Test curl functionality
echo "<div class='module'>
    <h2>cURL Functionality Test</h2>";

if (function_exists('curl_version')) {
    $curlVersion = curl_version();
    echo "<p>cURL version: {$curlVersion['version']} ✓</p>";
    
    // Test a simple curl request
    try {
        $ch = curl_init("https://www.google.com");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if ($response !== false) {
            echo "<p>cURL test request: <span class='success'>✓</span> (HTTP code: {$httpCode})</p>";
        } else {
            echo "<p>cURL test request: <span class='error'>✗</span> (Error: {$error})</p>";
        }
        
        curl_close($ch);
    } catch (Exception $e) {
        echo "<p class='error'>Exception during cURL test: {$e->getMessage()}</p>";
    }
} else {
    echo "<p class='error'>cURL is not available</p>";
}

echo "</div>";

// System recommendations
echo "<div class='module'>
    <h2>Recommendations</h2>
    <ul>";

if (empty($missingExtensions)) {
    echo "<li clas