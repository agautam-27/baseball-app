const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Hitting Page JS Loaded");
    renderAttempts();
});

let attempts = [{ id: 1, result: "Hit", hitZone: null, hitType: "N/A" }];
let notes = "";
let playerTryoutID = "";
let playerID = null; // Store matched playerID
let activeAttemptId = null; // To track which attempt is being edited for hit zone

const container = document.getElementById("hitting-content");

function renderAttempts() {
    container.innerHTML = '<h2 class="text-center">Hitting Evaluation</h2>';

    // Player Tryout ID Input
    const playerInputDiv = document.createElement("div");
    playerInputDiv.className = "player-input-div";

    const playerLabel = document.createElement("label");
    playerLabel.textContent = "Player Tryout ID:";
    playerInputDiv.appendChild(playerLabel);

    const playerInput = document.createElement("input");
    playerInput.type = "text";
    playerInput.id = "player-id-input";
    playerInput.placeholder = "Enter Player Tryout ID";
    playerInput.value = playerTryoutID;
    playerInput.oninput = async (e) => {
        playerTryoutID = e.target.value.trim();
        console.log("🔍 Checking playerTryoutID:", playerTryoutID);
        await checkPlayerExists(playerTryoutID);
    };

    playerInputDiv.appendChild(playerInput);
    container.appendChild(playerInputDiv);

    // Error message for invalid playerTryoutID
    const errorMessage = document.createElement("p");
    errorMessage.id = "error-message";
    errorMessage.style.color = "red";
    errorMessage.style.display = "none";
    errorMessage.textContent = "No player found with this tryout ID. Note: ID is case-sensitive.";
    container.appendChild(errorMessage);

    // Render each attempt
    attempts.forEach((attempt) => {
        const card = document.createElement("div");
        card.className = "attempt-card";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "remove-btn";
        deleteBtn.innerHTML = "❌";
        deleteBtn.onclick = () => {
            attempts = attempts.filter((a) => a.id !== attempt.id);
            renderAttempts();
        };

        // Result Row
        const resultRow = document.createElement("div");
        resultRow.className = "result-row";
        resultRow.appendChild(deleteBtn);

        // Result Radio Buttons
        const resultRadioDiv = document.createElement("div");
        resultRadioDiv.className = "result-radio";

        ["Hit", "Strike"].forEach((result) => {
            const label = document.createElement("label");
            label.textContent = result;

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = `result-${attempt.id}`;
            radio.value = result;
            radio.checked = attempt.result === result;
            radio.onchange = () => {
                attempt.result = result;
            };

            label.appendChild(radio);
            resultRadioDiv.appendChild(label);
        });

        card.appendChild(resultRow);
        card.appendChild(resultRadioDiv);

        // Hit Zone selection
        const hitZoneDiv = document.createElement("div");
        hitZoneDiv.className = "hit-zone-div";
        const hitZoneButton = document.createElement("button");
        hitZoneButton.className = "zone-select-button";
        hitZoneButton.textContent = attempt.hitZone ? attempt.hitZone : "Select Hit Zone";
        hitZoneButton.onclick = () => {
            activeAttemptId = attempt.id;
            showHitZoneMatrix();
        };
        hitZoneDiv.appendChild(hitZoneButton);
        card.appendChild(hitZoneDiv);

        // Hit Type Dropdown
        const hitTypeLabel = document.createElement("label");
        hitTypeLabel.textContent = "Type of Hit";
        const hitTypeSelect = document.createElement("select");
        ["N/A", "Line Drive", "Ground Ball", "Fly Ball"].forEach((hitType) => {
            const option = document.createElement("option");
            option.value = hitType;
            option.textContent = hitType;
            if (attempt.hitType === hitType) option.selected = true;
            hitTypeSelect.appendChild(option);
        });
        hitTypeSelect.onchange = (e) => (attempt.hitType = e.target.value);
        card.appendChild(hitTypeLabel);
        card.appendChild(hitTypeSelect);

        container.appendChild(card);
    });

    renderExtras();
}

function renderExtras() {
    const addBtn = document.createElement("button");
    addBtn.id = "add-attempt-btn";
    addBtn.textContent = "➕ Add New Attempt";
    addBtn.onclick = () => {
        const newId = attempts.length ? attempts[attempts.length - 1].id + 1 : 1;
        attempts.push({ id: newId, result: "Hit", hitZone: null, hitType: "N/A" });
        renderAttempts();
    };

    const notesInput = document.createElement("textarea");
    notesInput.id = "notes-input";
    notesInput.placeholder = "Enter notes here...";
    notesInput.value = notes;
    notesInput.oninput = (e) => (notes = e.target.value);

    let saveBtn = document.getElementById("save-btn");
    if (!saveBtn) {
        saveBtn = document.createElement("button");
        saveBtn.id = "save-btn";
        saveBtn.textContent = "Save";
        saveBtn.disabled = true;
        console.log("🔍 Save button initially disabled:", saveBtn.disabled);
        saveBtn.addEventListener("click", async () => {
            console.log("📝 Save button clicked");
            console.log("🔍 Current playerTryoutID:", playerTryoutID);
            console.log("🔍 Matched playerID:", playerID);

            if (!playerID) {
                alert("No player found with this tryout ID. Note: ID is case-sensitive.");
                console.log("❌ No player found, aborting save.");
                return;
            }

            const cleanedAttempts = attempts.map((a) => ({
                result: a.result,
                hitZone: a.hitZone || "N/A",
                hitType: a.hitType
            }));

            console.log("📊 Attempts to be saved:", cleanedAttempts);
            console.log("🗒️ Notes:", notes);

            try {
                console.log("📤 Attempting to save data to Firestore...");
                const docRef = await db.collection("hitting").add({
                    playerTryoutID: playerTryoutID,
                    playerID: playerID,
                    attempts: cleanedAttempts,
                    notes: notes,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log("✅ Data successfully saved to Firestore. Document ID:", docRef.id);
                alert("Hitting data saved!");

                // Reset the form for the next entry
                resetForm();

            } catch (err) {
                console.error("❌ Error saving hitting data:", err);
                alert("Failed to save. Check console.");
            }
        });
    }

    container.appendChild(addBtn);
    container.appendChild(notesInput);
    container.appendChild(saveBtn);

    console.log("🔍 Save button enabled state after render:", saveBtn.disabled);
    setTimeout(() => {
        if (saveBtn) {
            saveBtn.disabled = false;
            console.log("🔍 Save button re-enabled after reflow.");
        }
    }, 0);
}

// Reset the form after saving data so that inputs and attempts are cleared
function resetForm() {
    // Reset globals to default values
    attempts = [{ id: 1, result: "Hit", hitZone: null, hitType: "N/A" }];
    notes = "";
    playerTryoutID = "";
    playerID = null;
    activeAttemptId = null;

    // Re-render the form, which will recreate the inputs in their default state
    renderAttempts();
}

// Check if the entered playerTryoutID exists in Firestore
async function checkPlayerExists(tryoutID) {
    const saveBtn = document.getElementById("save-btn");
    const errorMessage = document.getElementById("error-message");

    try {
        const playerDoc = await getPlayerByTryoutID(tryoutID);
        if (playerDoc) {
            playerID = playerDoc.playerID;
            errorMessage.style.display = "none";
            saveBtn.disabled = false;
            console.log("✅ Player found, save button enabled.");
        } else {
            playerID = null;
            errorMessage.style.display = "block";
            saveBtn.disabled = true;
            console.log("❌ Player not found, save button disabled.");
        }
    } catch (error) {
        console.error("Error checking playerTryoutID:", error);
        playerID = null;
        saveBtn.disabled = true;
        console.log("❌ Error occurred, save button disabled.");
    }
}

// Fetch player document based on playerTryoutID
async function getPlayerByTryoutID(tryoutID) {
    const querySnapshot = await db.collection("users").where("playerTryoutID", "==", tryoutID).get();
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
    }
    return null;
}

// Show the hit zone modal
function showHitZoneMatrix() {
    const modal = document.getElementById("hit-zone-modal");
    modal.classList.add("show");
}

// Hide the hit zone modal
function hideHitZoneMatrix() {
    const modal = document.getElementById("hit-zone-modal");
    modal.classList.remove("show");
    activeAttemptId = null;
}

// Set the selected hit zone for the active attempt
function selectHitZone(zone) {
    const attempt = attempts.find(a => a.id === activeAttemptId);
    if (attempt) {
        attempt.hitZone = zone;
    }
    hideHitZoneMatrix();
    renderAttempts();
}

document.addEventListener("DOMContentLoaded", renderAttempts);
