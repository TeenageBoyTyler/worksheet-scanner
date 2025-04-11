<?php
// language_detect.php - Simple language detection service for OCR text
header('Content-Type: application/json');

/**
 * Simple language detection for OCR optimization
 */
class LanguageDetector {
    // Language specific common words and characters
    private $language_patterns = [
        'ger' => [
            'characters' => ['ä', 'ö', 'ü', 'ß'],
            'words' => ['der', 'die', 'das', 'und', 'ist', 'nicht', 'mit', 'ein', 'eine']
        ],
        'eng' => [
            'words' => ['the', 'and', 'for', 'that', 'with', 'you', 'this', 'have']
        ],
        'fre' => [
            'characters' => ['é', 'è', 'ê', 'à', 'ç'],
            'words' => ['le', 'la', 'et', 'des', 'les', 'un', 'une']
        ],
        'spa' => [
            'characters' => ['ñ', 'á', 'é', 'í', 'ó', 'ú'],
            'words' => ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'que']
        ]
    ];
    
    /**
     * Detect language from text sample
     * Simplified algorithm
     */
    public function detectLanguage($text) {
        if (empty($text)) {
            return 'ger'; // Default to German if no text
        }
        
        // Convert to lowercase for matching
        $text = strtolower($text);
        
        // Initialize language scores
        $scores = [];
        foreach (array_keys($this->language_patterns) as $lang) {
            $scores[$lang] = 0;
        }
        
        // Check for special characters in each language
        foreach ($this->language_patterns as $lang => $patterns) {
            if (isset($patterns['characters'])) {
                foreach ($patterns['characters'] as $char) {
                    if (strpos($text, $char) !== false) {
                        $scores[$lang] += 2; // Give more weight to special characters
                    }
                }
            }
        }
        
        // Extract individual words
        $words = preg_split('/\s+/', $text);
        
        // Check for common words
        foreach ($words as $word) {
            $word = trim($word);
            if (strlen($word) < 2) continue; // Skip very short words
            
            foreach ($this->language_patterns as $lang => $patterns) {
                if (in_array($word, $patterns['words'])) {
                    $scores[$lang] += 1;
                }
            }
        }
        
        // Find the language with the highest score
        $max_score = -1;
        $detected_lang = 'ger'; // Default
        
        foreach ($scores as $lang => $score) {
            if ($score > $max_score) {
                $max_score = $score;
                $detected_lang = $lang;
            }
        }
        
        return $detected_lang;
    }
}

// Handle API requests - simplified
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $response = ['success' => false, 'language' => 'ger', 'message' => ''];
    
    try {
        // Get input data
        $inputData = file_get_contents('php://input');
        $jsonInput = json_decode($inputData, true);
        
        if ($jsonInput && isset($jsonInput['text'])) {
            $text = $jsonInput['text'];
            
            // Create detector and detect language
            $detector = new LanguageDetector();
            $language = $detector->detectLanguage($text);
            
            $response['success'] = true;
            $response['language'] = $language;
            $response['message'] = 'Language detected successfully';
        } else {
            $response['message'] = 'Invalid request: missing text parameter';
        }
    } catch (Exception $e) {
        $response['message'] = 'Error detecting language: ' . $e->getMessage();
    }
    
    echo json_encode($response);
    exit;
}
?>