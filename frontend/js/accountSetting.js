// Elements from the DOM
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const saveButton = document.getElementById("saveButton");
const statusMessage = document.getElementById("statusMessage");
const idContainer = document.getElementById("id-container");

// Firebase references
const db = firebase.firestore();
const auth = firebase.auth();

// Original values for detecting changes
let originalFirstName = "";
let originalLastName = "";
let originalEmail = "";
let userRole = null;
let playerId = null;
let coachId = null;

/**
 * Load components (header and footer) into the page
 */
document.addEventListener("DOMContentLoaded", function () {
    // Load header
    const headerPlaceholder = document.getElementById("header-placeholder");
    fetch("../components/header.html")
        .then((response) => response.text())
        .then((html) => {
            headerPlaceholder.innerHTML = html;
            // After header is loaded, create the overlay
            if (!document.getElementById("menu-overlay")) {
                const overlay = document.createElement("div");
                overlay.id = "menu-overlay";
                document.body.appendChild(overlay);
            }

            // Setup toggleMenu function in global scope
            window.toggleMenu = function () {
                const sideMenu = document.getElementById("side-menu");
                if (sideMenu) {
                    sideMenu.classList.toggle("hidden");
                }
            };

            // Setup logout function
            window.logout = function () {
                firebase
                    .auth()
                    .signOut()
                    .then(() => {
                        window.location.href = "../index.html";
                    })
                    .catch((error) => {
                        console.error("Logout error:", error);
                    });
            };
        });

    // Load footer
    const footerPlaceholder = document.getElementById("footer-placeholder");
    fetch("../components/footer.html")
        .then((response) => response.text())
        .then((html) => {
            footerPlaceholder.innerHTML = html;
        });

    // Initialize the page
    initAccountSettings();
});

/**
 * Initialize account settings by fetching user data
 */
function initAccountSettings() {
    // Add event listeners for form changes
    firstNameInput.addEventListener("input", checkForChanges);
    lastNameInput.addEventListener("input", checkForChanges);
    emailInput.addEventListener("input", checkForChanges);
    currentPasswordInput.addEventListener("input", checkForChanges);
    newPasswordInput.addEventListener("input", checkForChanges);

    // Add event listener for save button
    saveButton.addEventListener("click", handleSaveChanges);

    // Fetch user data from Firebase
    fetchUserData();
}

/**
 * Fetch current user data from Firestore
 */
async function fetchUserData() {
    try {
        // Wait for auth state to be ready
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                showErrorMessage("No user logged in. Please log in again.");
                setTimeout(() => {
                    window.location.href = "../index.html";
                }, 2000);
                return;
            }

            const docRef = db.collection("users").doc(user.uid);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                showErrorMessage("User data not found in database");
                return;
            }

            const data = docSnap.data();
            userRole = data.role;

            // Set up the ID field based on role
            if (userRole === "player") {
                playerId = data.playerID || null;
                idContainer.innerHTML = `
          <label class="label">Player ID</label>
          <input type="text" class="input read-only-input" value="${
              playerId || ""
          }" readonly />
        `;
            } else if (userRole === "coach") {
                coachId = data.coachID || null;
                idContainer.innerHTML = `
          <label class="label">Coach ID</label>
          <input type="text" class="input read-only-input" value="${
              coachId || ""
          }" readonly />
        `;
            }

            // Populate form fields
            firstNameInput.value = data.firstName || "";
            lastNameInput.value = data.lastName || "";
            emailInput.value = data.email || "";

            // Save original values for change detection
            originalFirstName = data.firstName || "";
            originalLastName = data.lastName || "";
            originalEmail = data.email || "";
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        showErrorMessage("Failed to load account information");
    }
}

/**
 * Check if any form values have changed from original
 */
function checkForChanges() {
    const emailChanged = emailInput.value !== originalEmail;
    const firstNameChanged = firstNameInput.value !== originalFirstName;
    const lastNameChanged = lastNameInput.value !== originalLastName;
    const passwordFieldsFilled =
        currentPasswordInput.value.length > 0 &&
        newPasswordInput.value.length > 0;

    const hasChanges =
        emailChanged ||
        firstNameChanged ||
        lastNameChanged ||
        passwordFieldsFilled;

    // Enable/disable save button based on changes
    saveButton.disabled = !hasChanges;
}

/**
 * Handle saving changes to user account
 */
async function handleSaveChanges() {
    // Clear any previous messages
    clearStatusMessage();

    const user = auth.currentUser;
    if (!user) {
        showErrorMessage("No user is logged in. Please log in again.");
        setTimeout(() => {
            window.location.href = "../index.html";
        }, 2000);
        return;
    }

    // Get current values
    const newFirstName = firstNameInput.value.trim();
    const newLastName = lastNameInput.value.trim();
    const newEmail = emailInput.value.trim();
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;

    try {
        // 1) If changing password or email, re-authenticate first
        if (currentPassword && (newPassword || newEmail !== originalEmail)) {
            await reauthenticateUser(user.email, currentPassword);
        }

        // 2) Update password if requested
        if (currentPassword && newPassword) {
            await user.updatePassword(newPassword);
        }

        // 3) Update email if changed
        if (newEmail !== originalEmail) {
            await user.updateEmail(newEmail);
        }

        // 4) Update Firestore user document
        const docRef = db.collection("users").doc(user.uid);
        await docRef.update({
            firstName: newFirstName,
            lastName: newLastName,
            email: newEmail,
        });

        // Show success message
        showSuccessMessage("Your account information has been updated!");

        // Reset password fields
        currentPasswordInput.value = "";
        newPasswordInput.value = "";

        // Update original values
        originalFirstName = newFirstName;
        originalLastName = newLastName;
        originalEmail = newEmail;

        // Disable save button
        saveButton.disabled = true;
    } catch (error) {
        console.error("Error updating account:", error);
        showErrorMessage(
            error.message || "Failed to update account information"
        );
    }
}

/**
 * Re-authenticate user with email and password
 */
async function reauthenticateUser(email, password) {
    const credential = firebase.auth.EmailAuthProvider.credential(
        email,
        password
    );
    try {
        await auth.currentUser.reauthenticateWithCredential(credential);
        return true;
    } catch (error) {
        console.error("Re-authentication failed:", error);
        throw new Error("Current password is incorrect. Please try again.");
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message success-message";
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    statusMessage.textContent = message;
    statusMessage.className = "status-message error-message";
}

/**
 * Clear status message
 */
function clearStatusMessage() {
    statusMessage.textContent = "";
    statusMessage.className = "status-message";
}
