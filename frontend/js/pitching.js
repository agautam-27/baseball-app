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
    container.innerHTML =
        '<h2 class="text-center compact-title">Pitching Evaluation</h2>';

    // Player Tryout ID input section
    const playerInputDiv = document.createElement("div");
    playerInputDiv.className = "player-input-div";

    const playerInputContainer = document.createElement("div");
    playerInputContainer.className = "player-input-container";

    const playerInput = document.createElement("input");
    playerInput.type = "text";
    playerInput.id = "player-id-input";
    playerInput.placeholder = "Enter Player Tryout ID";
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

    playerInputContainer.appendChild(playerInput);

    // Status message for player verification
    const statusMessage = document.createElement("div");
    statusMessage.id = "player-status-message";
    statusMessage.className = "player-status-message";

    // Show status message based on previous verification result
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

    playerInputContainer.appendChild(statusMessage);
    playerInputDiv.appendChild(playerInputContainer);
    container.appendChild(playerInputDiv);

    // Pitches rendering
    const pitchesContainer = document.createElement("div");
    pitchesContainer.id = "pitches-container";

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

        // If zone is selected, show strike/ball badge and zone display
        if (pitch.zone) {
            // Strike/Ball badge
            const badge = document.createElement("div");
            badge.className = `badge ${
                isStrikeZone(pitch.zone) ? "strike-badge" : "ball-badge"
            }`;
            badge.textContent = isStrikeZone(pitch.zone) ? "Strike" : "Ball";
            pitchRow.appendChild(badge);

            // Zone display
            const zoneDisplay = document.createElement("div");
            zoneDisplay.className = "zone-display";

            const zoneText = document.createElement("span");
            zoneText.className = "zone-display-text";
            zoneText.textContent = getZoneName(pitch.zone);
            zoneDisplay.appendChild(zoneText);

            const editText = document.createElement("span");
            editText.className = "zone-edit-text";
            editText.textContent = "Edit";
            editText.onclick = () => editPitchZone(pitch.id);
            zoneDisplay.appendChild(editText);

            pitchRow.appendChild(zoneDisplay);
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

    container.appendChild(pitchesContainer);

    // "Add Pitch" button
    const addPitchBtn = document.createElement("button");
    addPitchBtn.id = "add-pitch-btn";
    addPitchBtn.className = "btn";
    addPitchBtn.textContent = "+ Add Pitch";
    addPitchBtn.onclick = addPitch;
    container.appendChild(addPitchBtn);

    // Notes field
    const notesLabel = document.createElement("label");
    notesLabel.htmlFor = "notes";
    notesLabel.className = "block mt-4";
    notesLabel.textContent = "Notes:";
    container.appendChild(notesLabel);

    const notesInput = document.createElement("textarea");
    notesInput.id = "notes";
    notesInput.rows = 4;
    notesInput.placeholder = "Enter notes...";
    notesInput.className = "w-full mt-1";
    notesInput.value = notes;
    notesInput.oninput = (e) => {
        notes = e.target.value;
    };
    container.appendChild(notesInput);

    // "Save All" button
    const saveBtn = document.createElement("button");
    saveBtn.id = "save-btn";
    saveBtn.className = "btn mt-4";
    saveBtn.textContent = "Save All";

    // Disable the button if there is a pitch with an empty speed
    const hasEmptySpeed = pitches.some(
        (pitch) => !pitch.speed || pitch.speed.trim() === ""
    );
    saveBtn.disabled = !playerID || hasEmptySpeed;

    saveBtn.onclick = saveAll;
    container.appendChild(saveBtn);
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

    if (!playerID) {
        alert(
            "No player found with this tryout ID. Note: ID is case-sensitive."
        );
        console.log("❌ No player found, aborting save.");
        return;
    }

    // speedが空のpitchがある場合は保存しない
    const hasEmptySpeed = pitches.some(
        (pitch) => !pitch.speed || pitch.speed.trim() === ""
    );
    if (hasEmptySpeed) {
        alert("すべてのピッチにスピードを入力してください。");
        return;
    }

    if (pitches.length === 0) {
        alert("Please add at least one pitch data.");
        return;
    }

    // Format the data
    const formattedPitches = pitches.map((pitch) => ({
        speed: pitch.speed ? Number(pitch.speed) : null, // 文字列から数値型に変換
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
        alert("Pitching data saved!");

        // Clear the form after saving
        pitches = [];
        notes = "";
        renderPitchingPage();
    } catch (error) {
        console.error("❌ Error saving pitching data:", error);
        alert(`Failed to save. Error: ${error.message}`);
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
