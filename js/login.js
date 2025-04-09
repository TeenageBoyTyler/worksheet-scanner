/**
 * login.js - Funktionen für die Login-Seite
 */

// Login-Manager
class LoginManager {
    /**
     * Initialisiert den Login-Manager
     */
    static initialize() {
        console.log('Login-Formular initialisiert');
        
        // Login-Formular-Handler
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin);
        }
        
        // URL-Parameter prüfen
        this.checkUrlParams();
    }
    
    /**
     * Verarbeitet den Login-Versuch
     * @param {Event} e - Submit-Event
     */
    static handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        if (!username || !password) {
            LoginManager.showMessage('Bitte geben Sie Benutzername und Passwort ein.', 'error');
            return;
        }
        
        // Formular-Daten sammeln
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('remember', remember ? '1' : '0');
        
        // Login-Anfrage senden
        fetch('auth/login.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Erfolgreicher Login: Weiterleitung zur Hauptseite
                window.location.href = 'index.php';
            } else {
                // Fehlgeschlagener Login: Fehlermeldung anzeigen
                LoginManager.showMessage(data.message || 'Login fehlgeschlagen', 'error');
            }
        })
        .catch(error => {
            console.error('Login-Fehler:', error);
            LoginManager.showMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.', 'error');
        });
    }
    
    /**
     * Zeigt eine Nachricht im Login-Formular an
     * @param {string} message - Anzuzeigende Nachricht
     * @param {string} type - Nachrichtentyp ('error' oder 'success')
     */
    static showMessage(message, type = 'error') {
        const messageElement = document.getElementById('login-message');
        if (!messageElement) return;
        
        messageElement.textContent = message;
        messageElement.className = `message ${type}-message`;
    }
    
    /**
     * Prüft URL-Parameter für Statuscodes und Nachrichten
     */
    static checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        
        if (status === 'logout') {
            this.showMessage('Sie wurden erfolgreich abgemeldet.', 'success');
        } else if (status === 'expired') {
            this.showMessage('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.', 'error');
        } else if (status === 'unauthorized') {
            this.showMessage('Bitte melden Sie sich an, um fortzufahren.', 'error');
        }
    }
}

// Dokument fertig Event
document.addEventListener('DOMContentLoaded', function() {
    LoginManager.initialize();
});