/**
 * Auth and UI handling for Baseball App login/signup page
 * This file implements the functionality for:
 * - Switching between player/coach roles
 * - Toggling between login/signup modes
 * - Handling form submissions for all auth flows
 */

// Silence console logs and alerts for mobile experience
if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent)) {
    console.log = console.error = console.warn = function() {};
    window.alert = function() {};
}
  
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
const allForms = [loginForm, playerSignupForm, coachSignupForm];

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
    "auth/invalid-login-credentials": "Incorrect email/ID or password."
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

    // Set the message text with animation
    authMessage.style.opacity = '0';
    setTimeout(() => {
        authMessage.textContent = message;
        authMessage.style.opacity = '1';
    }, 150);
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
 * Toggle between auth modes and show relevant forms with animation
 */
function updateFormVisibility() {
    const isLogin = loginRadio.checked;

    // Remove active class from all forms
    allForms.forEach(form => {
        form.classList.remove('active');
    });

    // Update login form placeholder based on role
    const emailOrIdField = document.getElementById("login-email-or-id");
    // Find the actual label element by using the for attribute
    const emailOrIdLabel = document.querySelector(`label[for="login-email-or-id"]`);
    
    // Set placeholder to just "Player Email" or "Coach Email" without "or ID"
    const placeholderText = selectedRole === "player" ? "Player Email" : "Coach Email";
    emailOrIdField.placeholder = placeholderText;
    if (emailOrIdLabel) {
        emailOrIdLabel.textContent = placeholderText;
    }

    // Show appropriate form with animation
    if (isLogin) {
        loginForm.classList.add('active');
    } else if (selectedRole === "player") {
        playerSignupForm.classList.add('active');
    } else {
        coachSignupForm.classList.add('active');
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
 * Navigate to another page with smooth transition
 */
function navigateWithTransition(url) {
    window.location.href = url;

    const pageTransition = document.querySelector(".page-transition");
    if (pageTransition) {
        // Just add active class, no role-specific classes
        pageTransition.classList.add("active");
        
        // Reduce the delay before navigation
        setTimeout(() => {
            window.location.href = url;
        }, 300); // Faster transition (300ms instead of 400ms)
    } else {
        // Fallback if transition element doesn't exist
        window.location.href = url;
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    // Don't show "Processing..." anymore
    const submitButton = loginForm.querySelector('.submit-button');
    
    const emailOrId = document.getElementById("login-email-or-id").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        let loginEmail = emailOrId;

        // Check if input is numeric (ID) or email
        const isNumeric = /^\d+$/.test(emailOrId);

        if (isNumeric) {
            // User is logging in with ID - need to find email
            const fieldName = selectedRole === "player" ? "playerID" : "coachID";
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

        // Start page transition right away
        const pageTransition = document.querySelector(".page-transition");
        if (pageTransition) {
            pageTransition.classList.add("active");
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
            // Hide transition if there was an error
            if (pageTransition) pageTransition.classList.remove("active");
            return;
        }

        const userData = userDoc.data();

        // Verify role matches selected role
        if (userData.role !== selectedRole) {
            displayAuthMessage(messages.roleMismatch(userData.role), true);
            await firebase.auth().signOut();
            // Hide transition if there was an error
            if (pageTransition) pageTransition.classList.remove("active");
            return;
        }

        // Navigate immediately
        window.location.href = selectedRole === "player" 
            ? "pages/playerDashboard.html" 
            : "pages/coachDashboard.html";
            
    } catch (error) {
        // Hide transition if there was an error
        const pageTransition = document.querySelector(".page-transition");
        if (pageTransition) pageTransition.classList.remove("active");
        
        displayAuthMessage(getErrorMessage(error), true);
    }
}

/**
 * Handle player signup form submission
 */
async function handlePlayerSignup(e) {
    e.preventDefault();
    
    // No more "Processing..." text changes
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
        // Start page transition right away
        const pageTransition = document.querySelector(".page-transition");
        if (pageTransition) {
            pageTransition.classList.add("active");
        }
        
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
                playerID: playerId, // Use consistent naming convention (playerID, not playerId)
                birthday: birthday || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

        // Navigate immediately
        window.location.href = "pages/playerDashboard.html";
    } catch (error) {
        // Hide transition if there was an error
        const pageTransition = document.querySelector(".page-transition");
        if (pageTransition) pageTransition.classList.remove("active");
        
        displayAuthMessage(getErrorMessage(error), true);
    }
}

/**
 * Handle coach signup form submission
 */
async function handleCoachSignup(e) {
    e.preventDefault();
    
    // No more "Processing..." text changes
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

        // Start page transition right away
        const pageTransition = document.querySelector(".page-transition");
        if (pageTransition) {
            pageTransition.classList.add("active");
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
            coachID: coachId, // Use consistent naming convention
            invitationCode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Mark invitation code as used
        await db.collection("coach_invites").doc(invitationCode).update({
            used: true,
            assignedTo: email,
        });

        // Navigate immediately 
        window.location.href = "pages/coachDashboard.html";
    } catch (error) {
        // Hide transition if there was an error
        const pageTransition = document.querySelector(".page-transition");
        if (pageTransition) pageTransition.classList.remove("active");
        
        displayAuthMessage(getErrorMessage(error), true);
    }
}

// Function for animated form visibility updates
function updateFormVisibilityWithAnimation() {
    const isLogin = document.getElementById("login-radio").checked;
    const selectedRole = document.querySelector(".tab-button.active").dataset.role;

    // Get current active form
    const currentForm = document.querySelector("form.active");

    // Determine which form should be shown
    let nextForm;
    if (isLogin) {
        nextForm = document.getElementById("login-form");
    } else if (selectedRole === "player") {
        nextForm = document.getElementById("player-signup-form");
    } else {
        nextForm = document.getElementById("coach-signup-form");
    }

    // Don't animate if the same form is already active
    if (currentForm === nextForm) return;

    // Apply exit animation to current form
    if (currentForm) {
        currentForm.classList.add("form-exit");

        // After exit animation, hide current and show next
        setTimeout(() => {
            currentForm.classList.remove("active", "form-exit");

            // Update login form placeholder based on role
            if (nextForm === document.getElementById("login-form")) {
                const emailOrIdField = document.getElementById("login-email-or-id");
                const emailOrIdLabel = document.querySelector('label[for="login-email-or-id"]');
                // Set placeholder to just "Player Email" or "Coach Email" without "or ID"
                const placeholderText = selectedRole === "player" ? "Player Email" : "Coach Email";

                emailOrIdField.placeholder = placeholderText;
                if (emailOrIdLabel) {
                    emailOrIdLabel.textContent = placeholderText;
                }
            }

            // Show and animate in the next form
            nextForm.classList.add("active", "form-enter");

            // Remove the animation class after it completes
            setTimeout(() => {
                nextForm.classList.remove("form-enter");
            }, 300);
        }, 300);
    }
}

// === Event Listeners ===

// Tab button click handlers
tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        // Update active tab styling
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        
        // Update selected role
        selectedRole = button.dataset.role;

        // Update login form placeholder immediately when role changes
        const emailOrIdField = document.getElementById("login-email-or-id");
        const emailOrIdLabel = document.querySelector('label[for="login-email-or-id"]');
        
        // Set placeholder to just "Player Email" or "Coach Email" without "or ID"
        const placeholderText = selectedRole === "player" ? "Player Email" : "Coach Email";
        emailOrIdField.placeholder = placeholderText;
        if (emailOrIdLabel) {
            emailOrIdLabel.textContent = placeholderText;
        }

        // Then update forms
        updateFormVisibilityWithAnimation();
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
    
    // Ensure the body has the right display property
    document.body.style.display = "block";
    
    // Prevent back button issues
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function() {
      window.history.go(1);
    };
});