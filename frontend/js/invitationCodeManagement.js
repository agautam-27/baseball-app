// Database reference
const db = firebase.firestore();

// DOM Elements
const codeListEl = document.getElementById("code-list");
const emptyTextEl = document.getElementById("empty-text");
const createNewBtn = document.getElementById("create-new-btn");

// New code modal elements
const newCodeModal = document.getElementById("new-code-modal");
const newCodeClose = document.getElementById("new-code-close");
const newCodeCancel = document.getElementById("new-code-cancel");
const newCodeCreate = document.getElementById("new-code-create");
const useRandomCodeCheckbox = document.getElementById("use-random-code");
const codeInputContainer = document.getElementById("code-input-container");
const codeValueInput = document.getElementById("code-value");
const expireDaysInput = document.getElementById("expire-days");

// Edit code modal elements
const editCodeModal = document.getElementById("edit-code-modal");
const editCodeClose = document.getElementById("edit-code-close");
const editCodeCancel = document.getElementById("edit-code-cancel");
const editCodeUpdate = document.getElementById("edit-code-update");
const editCodeValueInput = document.getElementById("edit-code-value");
const editExpireDaysInput = document.getElementById("edit-expire-days");

// Current code being edited
let currentEditingCode = null;

// Load invitation codes when the page loads
document.addEventListener("DOMContentLoaded", () => {
    fetchInvitationCodes();

    // Setup event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // New code modal events
    createNewBtn.addEventListener("click", openNewCodeModal);
    newCodeClose.addEventListener("click", closeNewCodeModal);
    newCodeCancel.addEventListener("click", closeNewCodeModal);
    newCodeCreate.addEventListener("click", handleAddCode);
    useRandomCodeCheckbox.addEventListener("change", toggleCodeInput);

    // Edit code modal events
    editCodeClose.addEventListener("click", closeEditCodeModal);
    editCodeCancel.addEventListener("click", closeEditCodeModal);
    editCodeUpdate.addEventListener("click", handleUpdateCode);
}

// Toggle code input visibility based on random code checkbox
function toggleCodeInput() {
    if (useRandomCodeCheckbox.checked) {
        codeInputContainer.style.display = "none";
    } else {
        codeInputContainer.style.display = "block";
    }
}

// Open new code modal
function openNewCodeModal() {
    // Reset form
    useRandomCodeCheckbox.checked = true;
    codeValueInput.value = "";
    expireDaysInput.value = "30";
    codeInputContainer.style.display = "none";

    // Show modal
    newCodeModal.style.display = "block";
}

// Close new code modal
function closeNewCodeModal() {
    newCodeModal.style.display = "none";
}

// Open edit code modal
function openEditCodeModal(code) {
    currentEditingCode = code;

    // Calculate days remaining until expiration
    const today = new Date();
    const expirationDate = code.expirationDate.toDate();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Set form values
    editCodeValueInput.value = code.id; // Using ID as the code value
    editExpireDaysInput.value = diffDays > 0 ? diffDays : 1;

    // Show modal
    editCodeModal.style.display = "block";
}

// Close edit code modal
function closeEditCodeModal() {
    editCodeModal.style.display = "none";
    currentEditingCode = null;
}

// Fetch invitation codes from Firestore
async function fetchInvitationCodes() {
    try {
        codeListEl.innerHTML = "";
        emptyTextEl.textContent = "Loading...";

        const codesSnapshot = await db.collection("coach_invites").get();

        if (codesSnapshot.empty) {
            emptyTextEl.textContent = "No invitation codes available";
            return;
        }

        emptyTextEl.style.display = "none";

        // Process and display codes
        const codes = [];
        codesSnapshot.forEach((doc) => {
            const data = doc.data();
            codes.push({
                id: doc.id,
                ...data,
            });
        });

        // Sort by expiration date (if available)
        codes.sort((a, b) => {
            if (a.expirationDate && b.expirationDate) {
                return b.expirationDate.seconds - a.expirationDate.seconds;
            }
            return 0;
        });

        // Render the codes
        renderCodes(codes);
    } catch (error) {
        console.error("Error fetching invitation codes:", error);
        alert(`Failed to fetch invitation codes: ${error.message}`);
        emptyTextEl.textContent = "Error loading codes";
    }
}

// Render invitation codes to the DOM
function renderCodes(codes) {
    codeListEl.innerHTML = "";

    codes.forEach((code) => {
        // Determine if code is expired
        const isExpired =
            code.expirationDate && isDateExpired(code.expirationDate);

        // Create code item element
        const codeItem = document.createElement("div");
        codeItem.className = `code-item ${isExpired ? "expired-item" : ""} ${
            code.used ? "used-item" : ""
        }`;

        // Create code info
        const codeInfo = document.createElement("div");
        codeInfo.className = "code-info";

        const codeText = document.createElement("div");
        codeText.className = "code-text";
        codeText.textContent = code.id;

        const codeDate = document.createElement("div");
        codeDate.className = "code-date";

        if (code.expirationDate) {
            codeDate.textContent = `Expiration Date: ${formatDate(
                code.expirationDate
            )}`;
            if (isExpired) {
                codeDate.textContent += " (Expired)";
            }
        } else {
            codeDate.textContent = "No expiration date set";
        }

        if (code.used) {
            codeDate.textContent += " (Used)";
            if (code.assignedTo) {
                codeDate.textContent += ` - Assigned to: ${code.assignedTo}`;
            }
        }

        codeInfo.appendChild(codeText);
        codeInfo.appendChild(codeDate);

        // Create code actions
        const codeActions = document.createElement("div");
        codeActions.className = "code-actions";

        const editButton = document.createElement("button");
        editButton.className = "action-button edit-button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => openEditCodeModal(code));

        const deleteButton = document.createElement("button");
        deleteButton.className = "action-button delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => confirmDeleteCode(code));

        codeActions.appendChild(editButton);
        codeActions.appendChild(deleteButton);

        // Assemble code item
        codeItem.appendChild(codeInfo);
        codeItem.appendChild(codeActions);

        codeListEl.appendChild(codeItem);
    });
}

// Generate a random invitation code (8 characters)
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

// Check if a date is expired
function isDateExpired(firestoreTimestamp) {
    if (!firestoreTimestamp) return false;

    const date = firestoreTimestamp.toDate();
    const now = new Date();
    return date < now;
}

// Format a Firestore timestamp to a readable date
function formatDate(firestoreTimestamp) {
    if (!firestoreTimestamp) return "N/A";

    const date = firestoreTimestamp.toDate();
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

// Add a new invitation code
async function handleAddCode() {
    try {
        // Validate inputs
        const useRandom = useRandomCodeCheckbox.checked;
        const codeValue = useRandom
            ? generateRandomCode()
            : codeValueInput.value.trim();
        const days = parseInt(expireDaysInput.value);

        if (!useRandom && !codeValue) {
            alert("Please enter a code");
            return;
        }

        if (isNaN(days) || days <= 0) {
            alert("Please enter a valid number of days for expiration");
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
            alert(`Invitation code "${codeValue}" already exists`);
            return;
        }

        // Get current user for the assignedTo field
        const currentUser = firebase.auth().currentUser;

        // Add code to Firestore
        await db
            .collection("coach_invites")
            .doc(codeValue)
            .set({
                assignedTo: currentUser ? currentUser.email : "Unknown",
                used: false,
                expirationDate:
                    firebase.firestore.Timestamp.fromDate(expirationDate),
                createdAt: firebase.firestore.Timestamp.fromDate(currentDate),
            });

        // Close modal and refresh list
        closeNewCodeModal();
        fetchInvitationCodes();

        alert(`New invitation code "${codeValue}" has been created`);
    } catch (error) {
        console.error("Error adding invitation code:", error);
        alert(`Failed to create invitation code: ${error.message}`);
    }
}

// Update an existing invitation code
async function handleUpdateCode() {
    try {
        if (!currentEditingCode) {
            return;
        }

        // Validate inputs
        const newCodeValue = editCodeValueInput.value.trim();
        const days = parseInt(editExpireDaysInput.value);

        if (!newCodeValue) {
            alert("Please enter a code");
            return;
        }

        if (isNaN(days) || days <= 0) {
            alert("Please enter a valid number of days for expiration");
            return;
        }

        // Calculate expiration date
        const currentDate = new Date();
        const expirationDate = new Date();
        expirationDate.setDate(currentDate.getDate() + days);

        // Check if we're changing the code ID and if the new ID already exists
        if (newCodeValue !== currentEditingCode.id) {
            const existingDoc = await db
                .collection("coach_invites")
                .doc(newCodeValue)
                .get();
            if (existingDoc.exists) {
                alert(`Invitation code "${newCodeValue}" already exists`);
                return;
            }

            // If changing the code ID, we need to create a new document and delete the old one
            await db.runTransaction(async (transaction) => {
                // Get current document data
                const currentDoc = await transaction.get(
                    db.collection("coach_invites").doc(currentEditingCode.id)
                );
                if (!currentDoc.exists) {
                    throw new Error("Document does not exist!");
                }

                // Create new document with updated data
                const currentData = currentDoc.data();
                transaction.set(
                    db.collection("coach_invites").doc(newCodeValue),
                    {
                        ...currentData,
                        expirationDate:
                            firebase.firestore.Timestamp.fromDate(
                                expirationDate
                            ),
                    }
                );

                // Delete old document
                transaction.delete(
                    db.collection("coach_invites").doc(currentEditingCode.id)
                );
            });
        } else {
            // Just update the expiration date
            await db
                .collection("coach_invites")
                .doc(currentEditingCode.id)
                .update({
                    expirationDate:
                        firebase.firestore.Timestamp.fromDate(expirationDate),
                });
        }

        // Close modal and refresh list
        closeEditCodeModal();
        fetchInvitationCodes();

        alert("Invitation code has been updated");
    } catch (error) {
        console.error("Error updating invitation code:", error);
        alert(`Failed to update invitation code: ${error.message}`);
    }
}

// Confirm deletion of a code
function confirmDeleteCode(code) {
    if (
        confirm(
            `Are you sure you want to delete the invitation code "${code.id}"?`
        )
    ) {
        handleDeleteCode(code);
    }
}

// Delete an invitation code
async function handleDeleteCode(code) {
    try {
        await db.collection("coach_invites").doc(code.id).delete();
        fetchInvitationCodes();
        alert(`Invitation code "${code.id}" has been deleted`);
    } catch (error) {
        console.error("Error deleting invitation code:", error);
        alert(`Failed to delete invitation code: ${error.message}`);
    }
}
