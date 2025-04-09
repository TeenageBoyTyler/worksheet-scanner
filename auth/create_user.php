<?php
/**
 * create_user.php - Kommandozeilenprogramm zum Erstellen neuer Benutzer
 * 
 * Verwendung:
 * php create_user.php username password [name] [role]
 */

// Prüfen, ob die notwendigen Parameter vorhanden sind
if ($argc < 3) {
    echo "Fehler: Zu wenige Parameter.\n";
    echo "Verwendung: php create_user.php username password [name] [role]\n";
    exit(1);
}

// Parameter abrufen
$username = $argv[1];
$password = $argv[2];
$name = $argc >= 4 ? $argv[3] : $username;
$role = $argc >= 5 ? $argv[4] : 'user';

// Prüfen, ob der Benutzername gültig ist
if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
    echo "Fehler: Ungültiger Benutzername. Der Benutzername darf nur Buchstaben, Zahlen und Unterstriche enthalten und muss zwischen 3 und 20 Zeichen lang sein.\n";
    exit(1);
}

// Prüfen, ob das Passwort stark genug ist
if (strlen($password) < 8) {
    echo "Fehler: Das Passwort muss mindestens 8 Zeichen lang sein.\n";
    exit(1);
}

// Prüfen, ob die Rolle gültig ist
$validRoles = ['admin', 'user'];
if (!in_array($role, $validRoles)) {
    echo "Fehler: Ungültige Rolle. Gültige Rollen sind: " . implode(', ', $validRoles) . "\n";
    exit(1);
}

// Benutzer aus der Konfigurationsdatei laden
$configFile = __DIR__ . '/users.json';
$users = [];

if (file_exists($configFile)) {
    $usersConfig = json_decode(file_get_contents($configFile), true);
    
    if ($usersConfig && isset($usersConfig['users']) && is_array($usersConfig['users'])) {
        $users = $usersConfig['users'];
        
        // Prüfen, ob der Benutzername bereits existiert
        foreach ($users as $user) {
            if ($user['username'] === $username) {
                echo "Fehler: Der Benutzername existiert bereits.\n";
                exit(1);
            }
        }
    }
}

// Passwort hashen
$hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

// Neuen Benutzer hinzufügen
$users[] = [
    'username' => $username,
    'password' => $hashedPassword,
    'name' => $name,
    'role' => $role
];

// Konfigurationsdatei aktualisieren
$usersConfig = ['users' => $users];
$json = json_encode($usersConfig, JSON_PRETTY_PRINT);

// Verzeichnis erstellen, falls es nicht existiert
if (!is_dir(__DIR__)) {
    mkdir(__DIR__, 0755, true);
}

// Konfigurationsdatei schreiben
if (file_put_contents($configFile, $json) === false) {
    echo "Fehler: Konnte die Konfigurationsdatei nicht schreiben.\n";
    exit(1);
}

echo "Benutzer '$username' erfolgreich erstellt.\n";
echo "Name: $name\n";
echo "Rolle: $role\n";
?>