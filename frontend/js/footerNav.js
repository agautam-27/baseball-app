/**
 * Footer Navigation Functions
 * Handles navigation between pages based on user role
 */

// Firebase references
const auth = firebase.auth();
const db = firebase.firestore();

/**
 * Navigate to the appropriate dashboard based on user role
 */
function goToDashboard() {
    // Get current user
    const user = auth.currentUser;
    
    if (!user) {
        console.error("No user logged in");
        window.location.href = "../index.html";
        return;
    }

    // Get user role from Firestore
    db.collection("users").doc(user.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const role = userData.role;

                // Redirect based on role
                if (role === "player") {
                    window.location.href = "../pages/playerDashboard.html";
                } else if (role === "coach") {
                    window.location.href = "../pages/coachDashboard.html";
                } else {
                    console.error("Unknown user role:", role);
                    window.location.href = "../index.html";
                }
            } else {
                console.error("User document not found");
                window.location.href = "../index.html";
            }
        })
        .catch((error) => {
            console.error("Error getting user data:", error);
            window.location.href = "../index.html";
        });
}

/**
 * Navigate to account settings page
 */
function goToAccountSettings() {
    window.location.href = "../pages/accountSetting.html";
}

/**
 * Go back to previous page
 */
function goBack() {
    window.history.back();
}

// Make functions available globally
window.goToDashboard = goToDashboard;
window.goToAccountSettings = goToAccountSettings;
window.goBack = goBack;