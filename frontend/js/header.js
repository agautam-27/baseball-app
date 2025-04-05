/**
 * Logout function - redirects to the login page
 */
function logout() {
    if (typeof firebase !== "undefined" && firebase.auth) {
        firebase
            .auth()
            .signOut()
            .then(() => {
                window.location.href = "../index.html";
            })
            .catch((error) => {
                console.error("Logout error:", error);
            });
    } else {
        // Fallback for testing
        window.location.href = "../index.html";
    }
}

// Make logout function available globally
window.logout = logout;