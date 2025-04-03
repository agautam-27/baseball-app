const db = firebase.firestore();

// Zone name mapping
const getZoneName = (zone) => {
    const zoneMap = {
        1: "High Left",
        2: "High Middle",
        3: "High Right",
        4: "Middle Left",
        5: "Middle Middle",
        6: "Middle Right",
        7: "Low Left",
        8: "Low Middle",
        9: "Low Right",
        11: "Very High Left",
        12: "Very High Right",
        13: "Very Low Left",
        14: "Very Low Right",
    };
    return zoneMap[zone] || "Unknown";
};

// Check if the zone is a strike zone
const isStrikeZone = (zone) => {
    // Zones 1-9 are strikes, 11-14 are balls
    return zone !== undefined && zone >= 1 && zone <= 9;
};

// State management
let pitches = [];
let notes = "";
let playerTryoutID = "";
let playerID = null; // Matched player ID
let activePitchId = null;
let isAddingNewPitch = false;
let previousSpeed = "";
let playerVerificationStatus = null; // To track player verification status

// DOM element references
const container = document.getElementById("pitching-content");
const zoneModal = document.getElementById("zone-modal");

// Function to update Save All button state
function updateSaveButtonState() {
    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) {
        const hasEmptySpeed = pitches.some(
            (pitch) => !pitch.speed || pitch.speed.trim() === ""
        );
        saveBtn.disabled = !playerID || hasEmptySpeed;
    }
}

// Function to check if player exists
async function checkPlayerExists(tryoutID) {
    const saveBtn = document.getElementById("save-btn");
    const statusMessage = document.getElementById("player-status-message");

    try {
        const playerDoc = await getPlayerByTryoutID(tryoutID);
        if (playerDoc) {
            playerID = playerDoc.playerID;
            playerVerificationStatus = "found";
            if (statusMessage) {
                statusMessage.textContent = "Player found";
                statusMessage.className = "player-status-message found";
                statusMessage.style.display = "block";
            }
            if (saveBtn) {
                saveBtn.disabled = false; // Enable save button when player exists
            }
            console.log("✅ Player found, save button enabled.");
            return playerDoc;
        } else {
            playerID = null;
            playerVerificationStatus = "not-found";
            if (statusMessage) {
                statusMessage.textContent = "No player found";
                statusMessage.className = "player-status-message not-found";
                statusMessage.style.display = "block";
            }
            if (saveBtn) {
                saveBtn.disabled = true; // Disable save button when player doesn't exist
            }
            console.log("❌ Player not found, save button disabled.");
            return null;
        }
    } catch (error) {
        console.error("Error checking playerTryoutID:", error);
        playerID = null;
        playerVerificationStatus = "error";
        if (statusMessage) {
            statusMessage.textContent = "Error checking ID";
            statusMessage.className = "player-status-message not-found";
            statusMessage.style.display = "block";
        }
        if (saveBtn) {
            saveBtn.disabled = true; // Disable save button on error
        }
        console.log("❌ Error occurred, save button disabled.");
        return null;
    }
}

// Get player information from Tryout ID
async function getPlayerByTryoutID(tryoutID) {
    const querySnapshot = await db
        .collection("users")
        .where("playerTryoutID", "==", tryoutID)
        .get();
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
    }
    return null;
}

// UI function: Render pitching evaluation page
function renderPitchingPage() {
    // Don't remove the main html elements as they are in the HTML template
    const pitchesContainer = document.getElementById("pitches-container");
    if (!pitchesContainer) return;
    
    pitchesContainer.innerHTML = '';
    
    // Player Tryout ID input - handle the existing input field
    const playerInput = document.getElementById("player-id-input");
    if (playerInput) {
        playerInput.value = playerTryoutID;
        playerInput.oninput = async (e) => {
            playerTryoutID = e.target.value.trim();
            console.log("🔍 Checking playerTryoutID:", playerTryoutID);

            // Set 500ms delay when input changes (debounce)
            if (playerInput.debounceTimer) {
                clearTimeout(playerInput.debounceTimer);
            }

            playerInput.debounceTimer = setTimeout(async () => {
                await checkPlayerExists(playerTryoutID);
            }, 500);
        };
    }
    
    // Status message - use the existing element
    const statusMessage = document.getElementById("player-status-message");
    if (statusMessage) {
        if (playerVerificationStatus === "found") {
            statusMessage.textContent = "Player found";
            statusMessage.className = "player-status-message found";
            statusMessage.style.display = "block";
        } else if (playerVerificationStatus === "not-found") {
            statusMessage.textContent = "No player found";
            statusMessage.className = "player-status-message not-found";
            statusMessage.style.display = "block";
        } else {
            statusMessage.style.display = "none";
        }
    }

    // Pitches rendering
    pitches.forEach((pitch) => {
        const pitchRow = document.createElement("div");
        pitchRow.className = "pitch-row";

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "remove-btn";
        deleteBtn.innerHTML = "❌";
        deleteBtn.onclick = () => {
            pitches = pitches.filter((p) => p.id !== pitch.id);
            renderPitchingPage();
        };
        pitchRow.appendChild(deleteBtn);

        // Speed input
        const speedInput = document.createElement("input");
        speedInput.className = "speed-input";
        speedInput.type = "number";
        speedInput.placeholder = "Speed";
        speedInput.value = pitch.speed || "";
        speedInput.oninput = (e) => {
            pitch.speed = e.target.value;
            // Update Save All button state whenever speed is changed
            updateSaveButtonState();
        };
        pitchRow.appendChild(speedInput);

        // Unit display
        const unitText = document.createElement("span");
        unitText.className = "unit-text";
        unitText.textContent = "km/h";
        pitchRow.appendChild(unitText);

        // If zone is selected, show unified zone badge
        if (pitch.zone) {
            // Create unified badge with strike/ball and zone info
            const isStrike = isStrikeZone(pitch.zone);
            const zoneName = getZoneName(pitch.zone);
            const badge = document.createElement("div");
            badge.className = `unified-badge ${
                isStrike ? "strike-badge" : "ball-badge"
            }`;
            
            // Badge content section
            const badgeContent = document.createElement("div");
            badgeContent.className = "badge-content";
            
            // Badge text - split into two parts with different styling
            const badgeTextMain = document.createElement("span");
            badgeTextMain.className = "badge-text-main";
            badgeTextMain.textContent = isStrike ? "Strike" : "Ball";
            badgeContent.appendChild(badgeTextMain);
            
            const badgeTextZone = document.createElement("span");
            badgeTextZone.className = "badge-text-zone";
            badgeTextZone.textContent = ` - ${zoneName}`;
            badgeContent.appendChild(badgeTextZone);
            
            // Edit button
            const editText = document.createElement("span");
            editText.className = "badge-edit";
            editText.textContent = "Edit";
            editText.onclick = (e) => {
                e.stopPropagation();
                editPitchZone(pitch.id);
            };
            badgeContent.appendChild(editText);
            
            badge.appendChild(badgeContent);
            pitchRow.appendChild(badge);
        } else {
            // Zone selection button
            const zoneSelectButton = document.createElement("button");
            zoneSelectButton.className = "zone-select-button";
            zoneSelectButton.innerHTML =
                '<span class="zone-select-text">Select Zone</span>';
            zoneSelectButton.onclick = () => showZoneMatrix(pitch.id);
            pitchRow.appendChild(zoneSelectButton);
        }

        pitchesContainer.appendChild(pitchRow);
    });

    // Connect event handlers to buttons defined in HTML
    const addPitchBtn = document.getElementById("add-pitch-btn");
    if (addPitchBtn) {
        addPitchBtn.onclick = addPitch;
    }

    // Notes field handling
    const notesInput = document.getElementById("notes");
    if (notesInput) {
        notesInput.value = notes;
        notesInput.oninput = (e) => {
            notes = e.target.value;
        };
    }

    // Update the save button's disabled state
    const saveBtn = document.getElementById("save-btn");
    if (saveBtn) {
        const hasEmptySpeed = pitches.some(
            (pitch) => !pitch.speed || pitch.speed.trim() === ""
        );
        saveBtn.disabled = !playerID || hasEmptySpeed;
        
        // Add the event listener to the button in the footer
        saveBtn.onclick = saveAll;
    }
}

// Add a new pitch
function addPitch() {
    // Save the speed value of the last pitch
    previousSpeed = pitches.length > 0 ? pitches[pitches.length - 1].speed : "";

    // Turn on new addition mode
    isAddingNewPitch = true;

    // Show zone selection modal (don't create new pitch yet)
    activePitchId = null;
    showZoneMatrix();
}

// Edit the zone of an existing pitch
function editPitchZone(pitchId) {
    isAddingNewPitch = false; // Indicate edit mode
    showZoneMatrix(pitchId);
}

// Display zone matrix
function showZoneMatrix(pitchId = null) {
    activePitchId = pitchId;
    zoneModal.classList.add("show");
}

// Hide zone matrix
function hideZoneMatrix() {
    zoneModal.classList.remove("show");
    activePitchId = null;
    isAddingNewPitch = false;
}

// Select zone
function selectZone(zone) {
    if (isAddingNewPitch) {
        // In new addition mode, create a new pitch here
        const newPitch = {
            id: Date.now(),
            speed: previousSpeed,
            zone: zone,
        };
        pitches.push(newPitch);

        // Turn off new addition mode
        isAddingNewPitch = false;
    } else if (activePitchId) {
        // Edit existing pitch (original process)
        const pitchToUpdate = pitches.find((p) => p.id === activePitchId);
        if (pitchToUpdate) {
            pitchToUpdate.zone = zone;
        }
    }

    // Close the modal
    hideZoneMatrix();

    // Display updated pitch list
    renderPitchingPage();
}

// Save all data
async function saveAll() {
    console.log("📝 Save button clicked");

    // Log output (for debugging)
    console.log("🔍 Current playerTryoutID:", playerTryoutID);
    console.log("🔍 Matched playerID:", playerID);

    // Display error messages container if it doesn't exist
    let errorMessageContainer = document.getElementById("error-message-container");
    if (!errorMessageContainer) {
        errorMessageContainer = document.createElement("div");
        errorMessageContainer.id = "error-message-container";
        errorMessageContainer.className = "error-message-container";
        // Insert before the pitches container
        const pitchesContainer = document.getElementById("pitches-container");
        if (pitchesContainer) {
            pitchesContainer.parentNode.insertBefore(errorMessageContainer, pitchesContainer);
        }
    }
    
    // Clear previous error messages
    errorMessageContainer.innerHTML = "";
    errorMessageContainer.style.display = "none";
    
    // Function to show error message
    const showErrorMessage = (message) => {
        errorMessageContainer.textContent = message;
        errorMessageContainer.style.display = "block";
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorMessageContainer.style.display = "none";
        }, 5000);
    };

    if (!playerID) {
        showErrorMessage("No player found with this tryout ID. Note: ID is case-sensitive.");
        console.log("❌ No player found, aborting save.");
        return;
    }

    // Do not save if there are pitches with empty speed values
    const hasEmptySpeed = pitches.some(
        (pitch) => !pitch.speed || pitch.speed.trim() === ""
    );
    if (hasEmptySpeed) {
        showErrorMessage("Please enter speed for all pitches.");
        return;
    }

    if (pitches.length === 0) {
        showErrorMessage("Please add at least one pitch data.");
        return;
    }

    // Format the data
    const formattedPitches = pitches.map((pitch) => ({
        speed: pitch.speed ? Number(pitch.speed) : null, // Convert string to number type
        outcome: isStrikeZone(pitch.zone) ? "Strike" : "Ball",
        pitchingZone: pitch.zone,
    }));

    console.log("📊 Pitches to be saved:", formattedPitches);
    console.log("🗒️ Notes:", notes);

    try {
        console.log("📤 Attempting to save data to Firestore...");

        // Using add() method to ensure a new document is created each time
        // This will create a new record for each pitching evaluation session,
        // even for the same player (identified by playerTryoutID)
        const docRef = await db.collection("pitching").add({
            playerTryoutID: playerTryoutID,
            playerID: playerID,
            attempts: formattedPitches,
            notes: notes,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            // Adding a session ID to clearly identify this as a separate evaluation
            sessionID: Date.now().toString(),
        });

        console.log(
            "✅ Data successfully saved to Firestore. Document ID:",
            docRef.id
        );
        
        // Show save confirmation
        const saveConfirmation = document.getElementById("save-confirmation");
        if (saveConfirmation) {
            saveConfirmation.style.display = "block";
            // Hide the confirmation after 3 seconds
            setTimeout(() => {
                saveConfirmation.style.display = "none";
            }, 3000);
        }

        // Clear the form after saving
        pitches = [];
        notes = "";
        renderPitchingPage();
    } catch (error) {
        console.error("❌ Error saving pitching data:", error);
        
        // Use the error message container to display the error
        const errorMessageContainer = document.getElementById("error-message-container");
        if (errorMessageContainer) {
            errorMessageContainer.textContent = `Failed to save. Error: ${error.message}`;
            errorMessageContainer.style.display = "block";
            // Auto hide after 5 seconds
            setTimeout(() => {
                errorMessageContainer.style.display = "none";
            }, 5000);
        }
    }
}

// Processing at initial load and component loading
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Pitching Page JS Loaded");

    // Load header and footer
    fetch("../components/header.html")
        .then((response) => response.text())
        .then((data) => {
            document.getElementById("header-container").innerHTML = data;

            // Header menu event handler setup
            window.toggleMenu = function () {
                const menu = document.getElementById("side-menu");
                menu.classList.toggle("hidden");
            };

            // Logout functionality
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

    fetch("../components/footer.html")
        .then((response) => response.text())
        .then((data) => {
            document.getElementById("footer-container").innerHTML = data;
        });

    // Don't add initial pitch
    // Removed: if (pitches.length === 0) {
    //   pitches.push({ id: 1, speed: '', zone: null });
    // }

    renderPitchingPage();

    // Expose zone selection to global scope
    window.selectZone = selectZone;
    window.hideZoneMatrix = hideZoneMatrix;
});
