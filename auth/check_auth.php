<?php
/**
 * check_auth.php - Überprüft den Authentifizierungsstatus des Benutzers
 *
 * Diese Datei sollte zu Beginn jeder geschützten Seite eingebunden werden.
 */

// Sitzung starten, wenn noch nicht gestartet
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Überprüft, ob der Benutzer angemeldet ist
 * @return bool True, wenn der Benutzer angemeldet ist, sonst false
 */
function isLoggedIn() {
    // Prüfe, ob die Authentifizierungsinformationen in der Sitzung vorhanden sind
    if (isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true) {
        // Prüfe, ob die Sitzung abgelaufen ist (Timeout nach 2 Stunden Inaktivität)
        $timeout = 7200; // 2 Stunden
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
            // Sitzung ist abgelaufen, Benutzer abmelden
            logout();
            return false;
        }
        
        // Aktualisiere den letzten Aktivitätszeitstempel
        $_SESSION['last_activity'] = time();
        return true;
    }
    
    // Wenn kein Sitzungs-Login, prüfe auf Remember-Me-Cookie
    if (isset($_COOKIE['remember_token'])) {
        $token = $_COOKIE['remember_token'];
        
        // Token aus der Datenbank abrufen
        $tokensFile = __DIR__ . '/tokens.json';
        if (file_exists($tokensFile)) {
            $tokens = json_decode(file_get_contents($tokensFile), true);
            
            foreach ($tokens as $key => $storedToken) {
                if ($storedToken['token'] === $token) {
                    // Prüfe, ob das Token abgelaufen ist
                    if ($storedToken['expires'] > time()) {
                        // Token ist gültig, Benutzer automatisch anmelden
                        
                        // Benutzerinformationen aus der Benutzerdatenbank laden
                        $configFile = __DIR__ . '/users.json';
                        if (file_exists($configFile)) {
                            $usersConfig = json_decode(file_get_contents($configFile), true);
                            
                            foreach ($usersConfig['users'] as $user) {
                                if ($user['username'] === $storedToken['username']) {
                                    $_SESSION['authenticated'] = true;
                                    $_SESSION['user'] = [
                                        'username' => $user['username'],
                                        'name' => $user['name'] ?? $user['username'],
                                        'role' => $user['role'] ?? 'user',
                                    ];
                                    $_SESSION['last_activity'] = time();
                                    
                                    return true;
                                }
                            }
                        }
                    } else {
                        // Token ist abgelaufen, aus der Liste entfernen
                        unset($tokens[$key]);
                        file_put_contents($tokensFile, json_encode($tokens, JSON_PRETTY_PRINT));
                    }
                    
                    break;
                }
            }
        }
        
        // Token nicht gefunden oder abgelaufen, Cookie entfernen
        setcookie('remember_token', '', time() - 3600, '/');
    }
    
    return false;
}

/**
 * Meldet den Benutzer ab
 */
function logout() {
    // Entferne das Remember-Me-Token, falls vorhanden
    if (isset($_COOKIE['remember_token'])) {
        $token = $_COOKIE['remember_token'];
        
        // Token aus der Datenbank entfernen
        $tokensFile = __DIR__ . '/tokens.json';
        if (file_exists($tokensFile)) {
            $tokens = json_decode(file_get_contents($tokensFile), true);
            
            $tokens = array_filter($tokens, function($storedToken) use ($token) {
                return $storedToken['token'] !== $token;
            });
            
            file_put_contents($tokensFile, json_encode($tokens, JSON_PRETTY_PRINT));
        }
        
        // Cookie entfernen
        setcookie('remember_token', '', time() - 3600, '/');
    }
    
    // Sitzung zurücksetzen
    $_SESSION = [];
    
    // Sitzungs-Cookie löschen
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Sitzung beenden
    session_destroy();
}

/**
 * Stellt sicher, dass der Benutzer angemeldet ist oder leitet ihn zur Login-Seite weiter
 */
function requireLogin() {
    if (!isLoggedIn()) {
        $redirect = isset($_SERVER['REQUEST_URI']) ? urlencode($_SERVER['REQUEST_URI']) : '';
        header('Location: /login.html?status=unauthorized&redirect=' . $redirect);
        exit;
    }
}
?>