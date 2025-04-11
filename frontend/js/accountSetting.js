// Elements from the DOM
// Elements from the DOM
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const birthdayInput = document.getElementById("birthday");
const birthdayContainer = document.getElementById("birthday-container");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const saveButton = document.getElementById("saveButton");
const logoutButton = document.getElementById("logoutButton");
const statusMessage = document.getElementById("statusMessage");
const idContainer = document.getElementById("id-container");
const loadingOverlay = document.getElementById("loading-overlay");
const accountSettingsContainer = document.querySelector(".account-settings-container");

// Coach invitation code related variables
const coachInviteSection = document.getElementById("coach-invite-section");
const createInviteBtn = document.getElementById("createInviteBtn");
const newCodeModal = document.getElementById("new-code-modal");
const newCodeClose = document.getElementById("new-code-close");
const newCodeCancel = document.getElementById("new-code-cancel");
const newCodeCreate = document.getElementById("new-code-create");
const useRandomCodeCheckbox = document.getElementById("use-random-code");
const codeInputContainer = document.getElementById("code-input-container");
const codeValueInput = document.getElementById("code-value");
const expireDaysInput = document.getElementById("expire-days");
const latestCodesContainer = document.getElementById("latest-codes-container");
const latestCodesList = document.getElementById("latest-codes-list");
// Additional elements for active codes modal
const viewActiveCodesBtn = document.getElementById("viewActiveCodesBtn");
const activeCodesModal = document.getElementById("active-codes-modal");
const activeCodesClose = document.getElementById("active-codes-close");
const activeCodesList = document.getElementById("active-codes-list");
const noActiveCodesMsg = document.getElementById("no-active-codes");
const latestCodeCard = document.getElementById("latest-code-card");
const latestCode = document.getElementById("latest-code");


// Firebase references
const db = firebase.firestore();
const auth = firebase.auth();


/**
 * Initialize invitation code functionality
 * This should be called after user data is loaded
 */
function initInvitationCodeFeatures() {
    // Only show for coaches
    if (userRole !== "coach") {
        return;
    }

    // Show the coach invite section
    coachInviteSection.style.display = "block";

    // Set up event listeners
    createInviteBtn.addEventListener("click", openNewCodeModal);
    newCodeClose.addEventListener("click", closeNewCodeModal);
    newCodeCancel.addEventListener("click", closeNewCodeModal);
    newCodeCreate.addEventListener("click", handleAddCode);
    useRandomCodeCheckbox.addEventListener("change", toggleCodeInput);

    // Add listeners for active codes modal
    viewActiveCodesBtn.addEventListener("click", openActiveCodesModal);
    activeCodesClose.addEventListener("click", closeActiveCodesModal);

    // Load latest invitation codes
    fetchLatestInvitationCodes();
}


// Original values for detecting changes
let originalFirstName = "";
let originalLastName = "";
let originalEmail = "";
let originalBirthday = "";
let userRole = null;
let playerId = null;
let coachId = null;

/**
 * Initialize the page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", function () {
    // Initialize the page
    initAccountSettings();
    
    // Set up the logout button handler
    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }
});

/**
 * Initialize account settings by fetching user data
 */
function initAccountSettings() {
    // Add event listeners for form changes
    firstNameInput.addEventListener("input", checkForChanges);
    lastNameInput.addEventListener("input", checkForChanges);
    emailInput.addEventListener("input", checkForChanges);
    birthdayInput.addEventListener("change", checkForChanges);
    currentPasswordInput.addEventListener("input", checkForChanges);
    newPasswordInput.addEventListener("input", checkForChanges);

    // Add event listener for save button
    saveButton.addEventListener("click", handleSaveChanges);
    
    // Check if we have the role in sessionStorage
    const storedRole = sessionStorage.getItem('userRole');
    if (storedRole) {
        // Pre-configure the UI for the correct role before fetching data
        userRole = storedRole;
        
        if (storedRole === "player") {
            // Show birthday field for players
            birthdayContainer.style.display = "block";
            // Hide coach-specific elements if needed
        } else if (storedRole === "coach") {
            // Hide birthday field for coaches
            birthdayContainer.style.display = "none";
            // Show coach-specific elements if needed
        }
    }

    // Fetch user data from Firebase
    fetchUserData();
}


/**
 * Open the active codes modal
 */
function openActiveCodesModal() {
    fetchActiveCodes();
    activeCodesModal.style.display = "block";
}

/**
 * Close the active codes modal
 */
function closeActiveCodesModal() {
    activeCodesModal.style.display = "none";
}

/**
 * Fetch active invitation codes
 */
async function fetchActiveCodes() {
    try {
        // Show loading state
        activeCodesList.innerHTML = `
            <tr>
                <td colspan="3" class="loading-cell">Loading codes...</td>
            </tr>
        `;
        noActiveCodesMsg.style.display = "none";
        
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;

        // Get current date for comparison
        const now = new Date();
        
        // Query for non-expired, unused codes
        const codesSnapshot = await db
            .collection("coach_invites")
            .where("used", "==", false)
            .get();

        // Clear loading state
        activeCodesList.innerHTML = "";
        
        if (codesSnapshot.empty) {
            noActiveCodesMsg.style.display = "block";
            return;
        }
        
        // Filter and sort codes
        const activeCodes = [];
        
        codesSnapshot.forEach(doc => {
            const codeData = doc.data();
            // Check if code is expired
            let expired = false;
            if (codeData.expirationDate) {
                const expirationDate = codeData.expirationDate.toDate();
                expired = expirationDate < now;
            }
            
            // Only include non-expired codes
            if (!expired) {
                activeCodes.push({
                    id: doc.id,
                    ...codeData,
                    expired
                });
            }
        });
        
        // Sort by expiration date (soonest first)
        activeCodes.sort((a, b) => {
            if (a.expirationDate && b.expirationDate) {
                return a.expirationDate.seconds - b.expirationDate.seconds;
            }
            return 0;
        });
        
        if (activeCodes.length === 0) {
            noActiveCodesMsg.style.display = "block";
            return;
        }
        
        // Build the table rows
        activeCodes.forEach(code => {
            const row = document.createElement("tr");
            
            // Format expiration date
            let expirationText = "No expiration";
            if (code.expirationDate) {
                expirationText = formatDate(code.expirationDate);
                // Add days remaining
                const daysRemaining = getDaysRemaining(code.expirationDate);
                expirationText += ` (${daysRemaining} days)`;
            }
            
            // Determine status
            let statusClass = "status-active";
            let statusText = "Active";
            
            row.innerHTML = `
                <td><span class="code-value">${code.id}</span></td>
                <td>${expirationText}</td>
                <td><span class="code-status ${statusClass}">${statusText}</span></td>
            `;
            
            // Add copy functionality
            row.querySelector('.code-value').addEventListener('click', () => {
                copyToClipboard(code.id);
            });
            
            activeCodesList.appendChild(row);
        });
        
    } catch (error) {
        console.error("Error fetching active codes:", error);
        activeCodesList.innerHTML = `
            <tr>
                <td colspan="3" class="error-cell">Failed to load codes</td>
            </tr>
        `;
    }
}

/**
 * Calculate days remaining until expiration
 */
function getDaysRemaining(firestoreTimestamp) {
    const expirationDate = firestoreTimestamp.toDate();
    const now = new Date();
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    // Create a temporary element
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    
    // Show copied message
    const messageElement = document.createElement('div');
    messageElement.textContent = 'Code copied to clipboard!';
    messageElement.className = 'copied-message';
    document.body.appendChild(messageElement);
    
    // Remove message after animation completes
    setTimeout(() => {
        document.body.removeChild(messageElement);
    }, 2000);
}

/**
 * Handle user logout
 */
function handleLogout() {
    // Check if the global logout function exists
    if (typeof window.logout === 'function') {
        window.logout();
    } else {
        // Fallback logout implementation
        auth.signOut()
            .then(() => {
                // Clear any stored data
                localStorage.clear();
                sessionStorage.clear();
                sessionStorage.setItem('hasLoggedOut', 'true');
                
                // Redirect to login page
                window.location.href = "../index.html";
            })
            .catch((error) => {
                console.error("Logout error:", error);
                // Still try to redirect even if there's an error
                window.location.href = "../index.html";
            });
    }
}


/**
 * Toggle code input visibility based on random code checkbox
 */
function toggleCodeInput() {
    if (useRandomCodeCheckbox.checked) {
        codeInputContainer.style.display = "none";
    } else {
        codeInputContainer.style.display = "block";
    }
}

/**
 * Open new code modal
 */
function openNewCodeModal() {
    // Reset form
    useRandomCodeCheckbox.checked = true;
    codeValueInput.value = "";
    expireDaysInput.value = "30";
    codeInputContainer.style.display = "none";

    // Show modal
    newCodeModal.style.display = "block";
}

/**
 * Close new code modal
 */
function closeNewCodeModal() {
    newCodeModal.style.display = "none";
}

/**
 * Generate a random invitation code (8 characters)
 */
function generateRandomCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length)
        );
    }
    return result;
}

/**
 * Fetch the latest created code to display
 */
async function fetchLatestCreatedCode() {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
        
        // Query for the most recently created code by this user
        const codeSnapshot = await db
            .collection("coach_invites")
            .where("creatorUid", "==", currentUser.uid)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
            
        if (codeSnapshot.empty) {
            latestCodeCard.style.display = "none";
            return;
        }
        
        // Get the code data
        const codeDoc = codeSnapshot.docs[0];
        const codeData = codeDoc.data();
        
        // Check code status
        const now = new Date();
        let status = "Active";
        let statusClass = "status-active";
        
        if (codeData.used) {
            status = "Used";
            statusClass = "status-used";
        } else if (codeData.expirationDate && codeData.expirationDate.toDate() < now) {
            status = "Expired";
            statusClass = "status-expired";
        }
        
        // Format expiration
        let expirationText = "No expiration";
        if (codeData.expirationDate) {
            expirationText = formatDate(codeData.expirationDate);
        }
        
        // Display the code
        latestCode.innerHTML = `
            <div class="code-display">${codeDoc.id}</div>
            <div class="code-details">
                <span>Expires: ${expirationText}</span>
                <span class="code-status ${statusClass}">${status}</span>
            </div>
            <button class="code-copy-btn" id="copy-latest-code">Copy Code</button>
        `;
        
        // Show the card
        latestCodeCard.style.display = "block";
        
        // Add event listener for copy button
        document.getElementById("copy-latest-code").addEventListener("click", () => {
            copyToClipboard(codeDoc.id);
        });
        
    } catch (error) {
        console.error("Error fetching latest code:", error);
        latestCodeCard.style.display = "none";
    }
}


/**
 * Add a new invitation code
 */
/**
 * Add a new invitation code
 */
async function handleAddCode() {
    try {
        // Validate inputs
        const useRandom = useRandomCodeCheckbox.checked;
        const codeValue = useRandom
            ? generateRandomCode()
            : codeValueInput.value.trim();
        const days = parseInt(expireDaysInput.value);

        if (!useRandom && !codeValue) {
            showErrorMessage("Please enter a code value");
            return;
        }

        if (isNaN(days) || days <= 0) {
            showErrorMessage("Please enter a valid number of days for expiration");
            return;
        }

        // Calculate expiration date
        const currentDate = new Date();
        const expirationDate = new Date();
        expirationDate.setDate(currentDate.getDate() + days);

        // Check if code already exists
        const codeDoc = await db
            .collection("coach_invites")
            .doc(codeValue)
            .get();
        if (codeDoc.exists) {
            showErrorMessage(`Invitation code "${codeValue}" already exists`);
            return;
        }

        // Get current user for the createdBy field
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            showErrorMessage("User not authenticated");
            return;
        }

        // Get coach's full name from their user document
        const userDoc = await db.collection("users").doc(currentUser.uid).get();
        if (!userDoc.exists) {
            showErrorMessage("Could not find your user profile");
            return;
        }

        const userData = userDoc.data();
        const coachFullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();

        // Add code to Firestore
        await db
            .collection("coach_invites")
            .doc(codeValue)
            .set({
                createdBy: coachFullName, // Use coach's full name instead of UID
                creatorEmail: currentUser.email,
                creatorUid: currentUser.uid, // Keep UID as a reference if needed
                used: false,
                expirationDate: firebase.firestore.Timestamp.fromDate(expirationDate),
                createdAt: firebase.firestore.Timestamp.fromDate(currentDate),
            });

        // Close modal
        closeNewCodeModal();
        
        // Refresh the latest code display
        fetchLatestCreatedCode();

        // Show success message
        showSuccessMessage(`New invitation code "${codeValue}" has been created!`);
    } catch (error) {
        console.error("Error adding invitation code:", error);
        showErrorMessage(`Failed to create invitation code: ${error.message}`);
    }
}

/**
 * Format a Firestore timestamp to a readable date
 */
function formatDate(firestoreTimestamp) {
    if (!firestoreTimestamp) return "N/A";

    const date = firestoreTimestamp.toDate();
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

/**
 * Check if a date is expired
 */
function isDateExpired(firestoreTimestamp) {
    if (!firestoreTimestamp) return false;

    const date = firestoreTimestamp.toDate();
    const now = new Date();
    return date < now;
}

/**
 * Fetch the latest invitation codes created by this coach
 */
/**
 * Fetch the latest invitation codes created by this coach
 */
async function fetchLatestInvitationCodes() {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;

        // Query latest 5 codes created by this coach, using creatorUid now
        const codesSnapshot = await db
            .collection("coach_invites")
            .where("creatorUid", "==", currentUser.uid)
            .orderBy("createdAt", "desc")
            .limit(3)
            .get();

        if (codesSnapshot.empty) {
            latestCodesContainer.style.display = "none";
            return;
        }

        // Show the container
        latestCodesContainer.style.display = "block";
        latestCodesList.innerHTML = "";

        // Process and display codes
        codesSnapshot.forEach((doc) => {
            const codeData = doc.data();
            const isExpired = codeData.expirationDate && isDateExpired(codeData.expirationDate);
            
            const codeItem = document.createElement("div");
            codeItem.className = `code-item ${isExpired ? "expired" : ""} ${codeData.used ? "used" : ""}`;
            
            let statusText = "";
            if (codeData.used) {
                statusText = " (Used)";
                if (codeData.assignedTo) {
                    statusText += ` by ${codeData.assignedTo}`;
                }
            } else if (isExpired) {
                statusText = " (Expired)";
            } else {
                statusText = " (Active)";
            }

            codeItem.innerHTML = `
                <div class="code-text">${doc.id}</div>
                <div class="code-date">
                    Expires: ${formatDate(codeData.expirationDate)}${statusText}
                </div>
            `;
            
            latestCodesList.appendChild(codeItem);
        });
    } catch (error) {
        console.error("Error fetching invitation codes:", error);
        // Don't show error message to avoid cluttering the UI
    }
}

// Keep the loading overlay visible until all data is loaded
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
    }
    if (accountSettingsContainer) {
        accountSettingsContainer.style.display = "none";
    }
}

// Hide loading overlay and show the form
function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = "none";
    }
    if (accountSettingsContainer) {
        accountSettingsContainer.style.display = "block";
    }
}

/**
 * Fetch current user data from Firestore
 */
async function fetchUserData() {
    try {
        // Keep loading visible
        showLoading();
        
        // Get current user
        const user = auth.currentUser;
        
        if (!user) {
            // Wait a moment in case auth is still initializing
            setTimeout(async () => {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    showErrorMessage("No user logged in. Please log in again.");
                    setTimeout(() => {
                        window.location.href = "../index.html";
                    }, 2000);
                    return;
                }
                await loadUserData(currentUser);
            }, 1000);
        } else {
            await loadUserData(user);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        showErrorMessage("Failed to load account information");
        hideLoading();
    }
}

/**
 * Load user data from Firestore
 */
// Enhancing the original loadUserData function with the new code
async function loadUserData(user) {
    try {
        const docRef = db.collection("users").doc(user.uid);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            showErrorMessage("User data not found in database");
            hideLoading();
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
            
            // Show birthday field for players
            birthdayContainer.style.display = "block";
            birthdayInput.value = data.birthday || "";
            originalBirthday = data.birthday || "";
            
        } else if (userRole === "coach") {
            coachId = data.coachID || null;
            idContainer.innerHTML = `
                <label class="label">Coach ID</label>
                <input type="text" class="input read-only-input" value="${
                    coachId || ""
                }" readonly />
            `;
            
            // Hide birthday field for coaches
            birthdayContainer.style.display = "none";
            
            // Initialize invitation code features for coaches
            initInvitationCodeFeatures();
        }

        // Populate form fields
        firstNameInput.value = data.firstName || "";
        lastNameInput.value = data.lastName || "";
        emailInput.value = data.email || "";

        // Save original values for change detection
        originalFirstName = data.firstName || "";
        originalLastName = data.lastName || "";
        originalEmail = data.email || "";
        
        // Now that everything is loaded, show the form
        hideLoading();
    } catch (error) {
        console.error("Error loading user data:", error);
        showErrorMessage("Failed to load account information");
        hideLoading();
    }
}

/**
 * Check if any form values have changed from original
 */
function checkForChanges() {
    const emailChanged = emailInput.value !== originalEmail;
    const firstNameChanged = firstNameInput.value !== originalFirstName;
    const lastNameChanged = lastNameInput.value !== originalLastName;
    const birthdayChanged = birthdayInput.value !== originalBirthday;
    const passwordFieldsFilled =
        currentPasswordInput.value.length > 0 &&
        newPasswordInput.value.length > 0;

    const hasChanges =
        emailChanged ||
        firstNameChanged ||
        lastNameChanged ||
        birthdayChanged ||
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
    const newBirthday = birthdayInput.value;
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
        const updateData = {
            firstName: newFirstName,
            lastName: newLastName,
            email: newEmail,
        };
        
        // Update birthday only for players
        if (userRole === "player" && newBirthday !== originalBirthday) {
            updateData.birthday = newBirthday;
            originalBirthday = newBirthday;
        }
        
        await docRef.update(updateData);

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