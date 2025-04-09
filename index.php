<?php
// index.php - Main entry point that checks authentication
require_once 'auth/check_auth.php';

// Check if user is already logged in
if (isLoggedIn()) {
    // User is logged in, load the main application
    include 'main.php';  // This will be your current index.php content
} else {
    // User is not logged in, redirect to login page
    header('Location: login.html');
    exit;
}
?>