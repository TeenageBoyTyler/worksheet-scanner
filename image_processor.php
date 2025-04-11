<?php
// image_processor.php - Simplified preprocessing class for OCR image enhancement
// Requires only basic GD functions

/**
 * Image preprocessing for OCR optimization - Simplified version
 * Enhances image quality to improve OCR text recognition
 */
class ImageProcessor {
    // Configuration settings
    private $config = [
        'resize_max_width' => 2000,
        'resize_max_height' => 2000,
        'quality' => 90
    ];
    
    /**
     * Constructor with optional custom configuration
     */
    public function __construct($custom_config = []) {
        // Merge custom configuration with defaults
        if (!empty($custom_config)) {
            $this->config = array_merge($this->config, $custom_config);
        }
        
        // Check if required extensions are available
        if (!extension_loaded('gd')) {
            throw new Exception('GD extension is required for image processing');
        }
    }
    
    /**
     * Process image from base64 string for OCR optimization
     */
    public function processImageBase64($base64_image) {
        try {
            // Remove data URI prefix if present
            if (strpos($base64_image, 'data:image') === 0) {
                $base64_image = preg_replace('/^data:image\/\w+;base64,/', '', $base64_image);
            }
            
            // Decode base64 to binary
            $image_data = base64_decode($base64_image);
            
            // Create image from binary data
            $image = @imagecreatefromstring($image_data);
            
            if (!$image) {
                // If image creation fails, return original base64
                return $base64_image;
            }
            
            // Apply minimal preprocessing (just resize)
            $processed_image = $this->resizeImage($image);
            
            // Convert back to base64
            $result_base64 = $this->imageToBase64($processed_image);
            
            // Clean up
            imagedestroy($image);
            imagedestroy($processed_image);
            
            return $result_base64;
        } catch (Exception $e) {
            // On any error, return the original image
            return $base64_image;
        }
    }
    
    /**
     * Process image from file for OCR optimization
     */
    public function processImageFile($file_path) {
        try {
            // Get file extension
            $extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));
            
            // Skip unsupported formats
            if (!in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
                // Return file content as base64
                return base64_encode(file_get_contents($file_path));
            }
            
            // Load image from file
            $image = $this->loadImageFromFile($file_path);
            
            if (!$image) {
                // Return file content as base64 if loading fails
                return base64_encode(file_get_contents($file_path));
            }
            
            // Apply minimal preprocessing (just resize)
            $processed_image = $this->resizeImage($image);
            
            // Convert to base64
            $result_base64 = $this->imageToBase64($processed_image);
            
            // Clean up
            imagedestroy($image);
            imagedestroy($processed_image);
            
            return $result_base64;
        } catch (Exception $e) {
            // On any error, return the original file as base64
            return base64_encode(file_get_contents($file_path));
        }
    }
    
    /**
     * Load image from file based on extension
     */
    private function loadImageFromFile($file_path) {
        $extension = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));
        
        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                return @imagecreatefromjpeg($file_path);
            case 'png':
                return @imagecreatefrompng($file_path);
            case 'gif':
                return @imagecreatefromgif($file_path);
            case 'webp':
                if (function_exists('imagecreatefromwebp')) {
                    return @imagecreatefromwebp($file_path);
                }
                return false;
            default:
                return false;
        }
    }
    
    /**
     * Resize image while maintaining aspect ratio
     */
    private function resizeImage($image) {
        $width = imagesx($image);
        $height = imagesy($image);
        
        // If image is already smaller than the max dimensions, return a copy
        if ($width <= $this->config['resize_max_width'] && $height <= $this->config['resize_max_height']) {
            $resized = imagecreatetruecolor($width, $height);
            imagecopy($resized, $image, 0, 0, 0, 0, $width, $height);
            return $resized;
        }
        
        // Calculate new dimensions
        $ratio = min($this->config['resize_max_width'] / $width, $this->config['resize_max_height'] / $height);
        $new_width = round($width * $ratio);
        $new_height = round($height * $ratio);
        
        // Create new image
        $resized = imagecreatetruecolor($new_width, $new_height);
        
        // Copy and resize
        imagecopyresampled(
            $resized, $image, 
            0, 0, 0, 0, 
            $new_width, $new_height, $width, $height
        );
        
        return $resized;
    }
    
    /**
     * Convert image resource to base64 string
     */
    private function imageToBase64($image) {
        // Start output buffering
        ob_start();
        
        // Output image to buffer
        imagejpeg($image, null, $this->config['quality']);
        
        // Get buffer content
        $image_data = ob_get_clean();
        
        // Encode to base64
        return base64_encode($image_data);
    }
}

// Simplified API Endpoint - Only process if explicitly requested
if (isset($_GET['process']) && $_GET['process'] === 'true') {
    $response = ['success' => false, 'message' => '', 'base64Image' => ''];
    
    try {
        // Process based on input type
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            // File upload
            $processor = new ImageProcessor();
            $processed_base64 = $processor->processImageFile($_FILES['image']['tmp_name']);
            
            $response['success'] = true;
            $response['message'] = 'Image processed successfully';
            $response['base64Image'] = $processed_base64;
        } else {
            // JSON input with base64 image
            $input_data = file_get_contents('php://input');
            $json_input = json_decode($input_data, true);
            
            if ($json_input && isset($json_input['base64Image'])) {
                $processor = new ImageProcessor();
                $processed_base64 = $processor->processImageBase64($json_input['base64Image']);
                
                $response['success'] = true;
                $response['message'] = 'Image processed successfully';
                $response['base64Image'] = $processed_base64;
            } else {
                $response['message'] = 'No image data provided';
            }
        }
    } catch (Exception $e) {
        $response['message'] = 'Error processing image: ' . $e->getMessage();
    }
    
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}
?>