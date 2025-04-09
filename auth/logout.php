<?php
/**
 * logout.php - Meldet den Benutzer ab
 */

// Authentifizierungsprüfung einbinden
require_once 'check_auth.php';

// Benutzer abmelden
logout();

// Zur Login-Seite weiterleiten
header('Location: ../login.html?status=logout');
exit;
?>