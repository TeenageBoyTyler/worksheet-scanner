<?php
/**
 * login.php - Verarbeitet Login-Anfragen
 */

// Session starten
session_start();

// Content-Type auf JSON setzen
header('Content-Type: application/json');

// Initialisiere die Antwort
$response = ['success' => false, 'message' => ''];

// Prüfe, ob es ein POST-Request ist
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Nur POST-Anfragen sind erlaubt';
    echo json_encode($response);
    exit;
}

// Benutzerdaten aus dem Request holen
$username = isset($_POST['username']) ? trim($_POST['username']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';
$remember = isset($_POST['remember']) && $_POST['remember'] === '1';

// Benutzername und Passwort prüfen
if (empty($username) || empty($password)) {
    $response['message'] = 'Benutzername und Passwort sind erforderlich';
    echo json_encode($response);
    exit;
}

// Benutzer aus der Konfigurationsdatei laden
$configFile = __DIR__ . '/users.json';

if (!file_exists($configFile)) {
    $response['message'] = 'Konfigurationsdatei nicht gefunden';
    echo json_encode($response);
    exit;
}

$usersConfig = json_decode(file_get_contents($configFile), true);

if (!$usersConfig || !isset($usersConfig['users']) || !is_array($usersConfig['users'])) {
    $response['message'] = 'Ungültige Konfigurationsdatei';
    echo json_encode($response);
    exit;
}

// Überprüfe die Anmeldedaten
$authenticated = false;
$user = null;

foreach ($usersConfig['users'] as $configUser) {
    if ($configUser['username'] === $username) {
        // Benutzer gefunden, Passwort überprüfen
        if (password_verify($password, $configUser['password'])) {
            $authenticated = true;
            $user = $configUser;
            break;
        }
    }
}

if (!$authenticated) {
    // Verzögere die Antwort bei falschen Anmeldedaten, um Brute-Force-Angriffe zu erschweren
    sleep(1);
    $response['message'] = 'Ungültiger Benutzername oder Passwort';
    echo json_encode($response);
    exit;
}

// Erfolgreiche Anmeldung
$_SESSION['authenticated'] = true;
$_SESSION['user'] = [
    'username' => $user['username'],
    'name' => $user['name'] ?? $user['username'],
    'role' => $user['role'] ?? 'user',
];
$_SESSION['last_activity'] = time();

// Remember-Me-Cookie setzen, wenn angefordert
if ($remember) {
    $token = bin2hex(random_bytes(32)); // Sicheres Token generieren
    $expires = time() + (86400 * 30); // 30 Tage
    
    // Token in der Datenbank speichern
    $tokensFile = __DIR__ . '/tokens.json';
    $tokens = [];
    
    if (file_exists($tokensFile)) {
        $tokens = json_decode(file_get_contents($tokensFile), true);
    }
    
    // Bestehende abgelaufene Tokens entfernen
    $tokens = array_filter($tokens, function($item) {
        return $item['expires'] > time();
    });
    
    // Neues Token hinzufügen
    $tokens[] = [
        'username' => $user['username'],
        'token' => $token,
        'expires' => $expires
    ];
    
    // Tokens speichern
    file_put_contents($tokensFile, json_encode($tokens, JSON_PRETTY_PRINT));
    
    // Cookie setzen (sichere Einstellungen)
    setcookie('remember_token', $token, [
        'expires' => $expires,
        'path' => '/',
        'secure' => true, // Nur über HTTPS
        'httponly' => true, // Nicht über JS zugänglich
        'samesite' => 'Strict' // Nur von derselben Site
    ]);
}

// Erfolgsantwort
$response['success'] = true;
$response['message'] = 'Login erfolgreich';
echo json_encode($response);
?>