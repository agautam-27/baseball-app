/**
 * Auth and UI handling for Baseball App login/signup page
 * This file implements the functionality for:
 * - Switching between player/coach roles
 * - Toggling between login/signup modes
 * - Handling form submissions for all auth flows
 */

// Firebase instance
const db = firebase.firestore();

// Element references
const tabButtons = document.querySelectorAll(".tab-button");
const loginRadio = document.getElementById("login-radio");
const signupRadio = document.getElementById("signup-radio");
const loginForm = document.getElementById("login-form");
const playerSignupForm = document.getElementById("player-signup-form");
const coachSignupForm = document.getElementById("coach-signup-form");
const authMessage = document.getElementById("auth-message");

// State tracking
let selectedRole = "player"; // Default role

// Firebase error messages for better UX
const firebaseErrorMessages = {
    "auth/invalid-email": "Invalid email format. Please try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No user found with this email address.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "This email address is already registered.",
    "auth/weak-password": "Password must be at least 6 characters long.",
};

// Custom message templates
const messages = {
    coachIdRequired: "❌ Coach invitation code is required.",
    invalidCoachId: "❌ Invalid invitation code.",
    coachIdUsed: "❌ This invitation code has already been used.",
    coachIdExpired: "❌ This invitation code has expired.",
    userDataNotFound: "❌ User data not found.",
    roleMismatch: (actualRole) =>
        `❌ Role mismatch. This account is registered as ${actualRole}.`,
    passwordMismatch: "❌ Passwords do not match.",
    signupSuccess: (role) =>
        `✅ Successfully registered as ${
            role === "player" ? "Player" : "Coach"
        }!`,
    loginSuccess: (role) =>
        `✅ Successfully logged in as ${
            role === "player" ? "Player" : "Coach"
        }!`,
    unknownError: "❌ An error occurred.",
};

/**
 * Display message with appropriate styling
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 */
function displayAuthMessage(message, isError = false) {
    // Clear any existing classes
    authMessage.classList.remove("error-message", "success-message");

    // Add appropriate class
    if (isError) {
        authMessage.classList.add("error-message");
    } else {
        authMessage.classList.add("success-message");
    }

    // Set the message text
    authMessage.textContent = message;
}

/**
 * Get appropriate error message from error object
 */
function getErrorMessage(error) {
    // Check if error is a Firebase Auth error with known code
    if (error && typeof error === "object") {
        // Handle Firebase error codes using our predefined messages
        if (error.code && firebaseErrorMessages[error.code]) {
            return firebaseErrorMessages[error.code];
        }

        // Handle Firebase's auth/invalid-login-credentials error
        if (error.code === "auth/invalid-login-credentials") {
            return "Incorrect email/ID or password.";
        }

        // Handle case where error is in JSON format
        if (typeof error === "string") {
            try {
                const parsedError = JSON.parse(error);
                if (parsedError.error && parsedError.error.message) {
                    // Extract only the message part from JSON
                    if (
                        parsedError.error.message ===
                        "INVALID_LOGIN_CREDENTIALS"
                    ) {
                        return "Incorrect email/ID or password.";
                    }
                    return parsedError.error.message;
                }
            } catch (e) {
                // Not valid JSON, continue to next checks
            }
        }

        // For other errors with a message property
        if (error.message) {
            // Check if message is "INVALID_LOGIN_CREDENTIALS"
            if (error.message === "INVALID_LOGIN_CREDENTIALS") {
                return "Incorrect email/ID or password.";
            }

            // If message appears to be JSON, try to parse it
            if (error.message.includes("{") && error.message.includes("}")) {
                try {
                    const parsedMessage = JSON.parse(error.message);
                    if (parsedMessage.error && parsedMessage.error.message) {
                        if (
                            parsedMessage.error.message ===
                            "INVALID_LOGIN_CREDENTIALS"
                        ) {
                            return "Incorrect email/ID or password.";
                        }
                        return parsedMessage.error.message;
                    }
                } catch (e) {
                    // Not valid JSON, use message as is
                }
            }

            return error.message;
        }
    }

    // Default fallback message
    return messages.unknownError;
}

/**
 * Toggle between auth modes and show relevant forms
 */
function updateFormVisibility() {
    const isLogin = loginRadio.checked;

    // Hide all forms first
    loginForm.style.display = "none";
    playerSignupForm.style.display = "none";
    coachSignupForm.style.display = "none";

    if (isLogin) {
        // Update login form placeholder based on role
        const emailOrIdField = document.getElementById("login-email-or-id");
        emailOrIdField.placeholder =
            selectedRole === "player"
                ? "Player ID or Email"
                : "Coach ID or Email";

        // Show login form
        loginForm.style.display = "block";
    } else {
        // Show the appropriate signup form based on role
        if (selectedRole === "player") {
            playerSignupForm.style.display = "block";
        } else {
            coachSignupForm.style.display = "block";
        }
    }
}

/**
 * Get the next ID for user type using a counter collection
 */
async function getNextIdForUserType(type) {
    const counterRef = db
        .collection(type === "player" ? "playercounter" : "coachcounter")
        .doc("counter");

    const result = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextId = 1;

        if (counterDoc.exists) {
            nextId = counterDoc.data().count + 1;
        }

        transaction.set(counterRef, { count: nextId });
        return nextId;
    });

    return result;
}

/**
 * Handle player signup form submission
 */
async function handlePlayerSignup(e) {
    e.preventDefault();

    const firstName = document.getElementById("player-first-name").value.trim();
    const lastName = document.getElementById("player-last-name").value.trim();
    const email = document.getElementById("player-email").value.trim();
    const password = document.getElementById("player-password").value;
    const reEnterPassword = document.getElementById(
        "player-reenter-password"
    ).value;
    const birthday = document.getElementById("player-birthday").value;

    // Validate passwords match
    if (password !== reEnterPassword) {
        displayAuthMessage(messages.passwordMismatch, true);
        return;
    }

    try {
        // Create Firebase Auth user
        const userCredential = await firebase
            .auth()
            .createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Get next player ID
        const playerId = await getNextIdForUserType("player");

        // Create user document
        await db
            .collection("users")
            .doc(user.uid)
            .set({
                firstName,
                lastName,
                email,
                role: "player",
                playerId,
                birthday: birthday || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        // Show success message
        displayAuthMessage(
            messages.signupSuccess("player") + ` (ID: ${playerId})`,
            false
        );
        playerSignupForm.reset();

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = "pages/playerDashboard.html";
        }, 1500);
    } catch (error) {
        displayAuthMessage(getErrorMessage(error), true);
    }
}

/**
 * Handle coach signup form submission
 */
async function handleCoachSignup(e) {
    e.preventDefault();

    const firstName = document.getElementById("coach-first-name").value.trim();
    const lastName = document.getElementById("coach-last-name").value.trim();
    const email = document.getElementById("coach-email").value.trim();
    const password = document.getElementById("coach-password").value;
    const reEnterPassword = document.getElementById(
        "coach-reenter-password"
    ).value;
    const invitationCode = document
        .getElementById("coach-invitation-code")
        .value.trim();

    // Validate passwords match
    if (password !== reEnterPassword) {
        displayAuthMessage(messages.passwordMismatch, true);
        return;
    }

    // Validate invitation code
    if (!invitationCode) {
        displayAuthMessage(messages.coachIdRequired, true);
        return;
    }

    try {
        // Special hardcoded invitation code for development/testing
        if (invitationCode !== "COACH2025") {
            // Verify invitation code in database
            const inviteDoc = await db
                .collection("coach_invites")
                .doc(invitationCode)
                .get();

            if (!inviteDoc.exists) {
                displayAuthMessage(messages.invalidCoachId, true);
                return;
            }

            if (inviteDoc.data().used) {
                displayAuthMessage(messages.coachIdUsed, true);
                return;
            }

            // Check expiration if present
            if (inviteDoc.data().expirationDate) {
                const expirationDate = inviteDoc.data().expirationDate.toDate();
                if (expirationDate < new Date()) {
                    displayAuthMessage(messages.coachIdExpired, true);
                    return;
                }
            }
        }

        // Create Firebase Auth user
        const userCredential = await firebase
            .auth()
            .createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Get next coach ID
        const coachId = await getNextIdForUserType("coach");

        // Save user data
        await db.collection("users").doc(user.uid).set({
            firstName,
            lastName,
            email,
            role: "coach",
            coachId,
            invitationCode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Mark invitation code as used (except for hardcoded one)
        if (invitationCode !== "COACH2025") {
            await db.collection("coach_invites").doc(invitationCode).update({
                used: true,
                assignedTo: email,
            });
        }

        // Show success message
        displayAuthMessage(
            messages.signupSuccess("coach") + ` (ID: ${coachId})`,
            false
        );
        coachSignupForm.reset();

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = "pages/coachDashboard.html";
        }, 1500);
    } catch (error) {
        displayAuthMessage(getErrorMessage(error), true);
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();

    const emailOrId = document.getElementById("login-email-or-id").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        let loginEmail = emailOrId;

        // Check if input is numeric (ID) or email
        const isNumeric = /^\d+$/.test(emailOrId);

        if (isNumeric) {
            // User is logging in with ID - need to find email
            const fieldName =
                selectedRole === "player" ? "playerId" : "coachId";
            const idValue = parseInt(emailOrId, 10);

            // Query for user with this ID
            const querySnapshot = await db
                .collection("users")
                .where(fieldName, "==", idValue)
                .where("role", "==", selectedRole)
                .get();

            if (querySnapshot.empty) {
                displayAuthMessage(
                    `No ${selectedRole} found with ID: ${emailOrId}`,
                    true
                );
                return;
            }

            // Get email from found user
            loginEmail = querySnapshot.docs[0].data().email;

            if (!loginEmail) {
                displayAuthMessage(
                    "No email registered for this account.",
                    true
                );
                return;
            }
        }

        // Log in with Firebase Auth
        const userCredential = await firebase
            .auth()
            .signInWithEmailAndPassword(loginEmail, password);
        const user = userCredential.user;

        // Check user role in Firestore
        const userDoc = await db.collection("users").doc(user.uid).get();

        if (!userDoc.exists) {
            displayAuthMessage(messages.userDataNotFound, true);
            await firebase.auth().signOut();
            return;
        }

        const userData = userDoc.data();

        // Verify role matches selected role
        if (userData.role !== selectedRole) {
            displayAuthMessage(messages.roleMismatch(userData.role), true);
            await firebase.auth().signOut();
            return;
        }

        // Success - redirect to appropriate dashboard
        displayAuthMessage(messages.loginSuccess(selectedRole), false);
        loginForm.reset();

        setTimeout(() => {
            window.location.href =
                selectedRole === "player"
                    ? "pages/playerDashboard.html"
                    : "pages/coachDashboard.html";
        }, 800);
    } catch (error) {
        displayAuthMessage(getErrorMessage(error), true);
    }
}

// === Event Listeners ===

// Tab button clicks (Player/Coach toggle)
tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        // Update active tab styling
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // Update selected role
        selectedRole = button.dataset.role;

        // Update form visibility based on new role and current auth mode
        updateFormVisibility();
    });
});

// Auth mode radio button change (Login/Signup)
loginRadio.addEventListener("change", updateFormVisibility);
signupRadio.addEventListener("change", updateFormVisibility);

// Form submissions
loginForm.addEventListener("submit", handleLogin);
playerSignupForm.addEventListener("submit", handlePlayerSignup);
coachSignupForm.addEventListener("submit", handleCoachSignup);

// Initialize UI on page load
document.addEventListener("DOMContentLoaded", () => {
    // Show the default form (login as player)
    updateFormVisibility();
});
