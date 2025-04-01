const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    console.log("Hitting page loaded");
    renderAttempts();
    setupSaveButton();
    setupLivePlayerIdValidation();
});

console.log("Hitting Page JS Loaded");

// State variables
let attempts = [
    { id: 1, result: "Hit", hitZone: null, hitType: "N/A" }
];
let activeAttemptId = null; // To track which attempt is being edited for hit zone

function showError(msg, persistent = false) {
    const errorDiv = document.getElementById("error-message");
    errorDiv.textContent = msg;
    errorDiv.style.display = "block";

    if (!persistent) {
        setTimeout(() => {
            errorDiv.style.display = "none";
            errorDiv.textContent = "";
        }, 2500);
    }
}

function clearError() {
    const errorDiv = document.getElementById("error-message");
    errorDiv.textContent = "";
    errorDiv.style.display = "none";
}

function renderAttempts() {
    const attemptsContainer = document.getElementById("attempts-container");
    attemptsContainer.innerHTML = "";

    const fallbackBtn = document.getElementById("add-first-attempt-btn");

    // If no attempts, show fallback Add Attempt button
    if (attempts.length === 0) {
        fallbackBtn.style.display = "block";

        document.getElementById("add-attempt-btn").onclick = () => {
            attempts.push({
                id: 1,
                result: "Hit",
                hitZone: null,
                hitType: "N/A"
            });
            renderAttempts();
        };

        return; // stop here — don't render cards
    } else {
        fallbackBtn.style.display = "none"; // hide if there are attempts
    }

    attempts.forEach((attempt) => {
        const card = document.createElement("div");
        card.className = "attempt-card";

        // Result Row with Delete Button
        const resultRow = document.createElement("div");
        resultRow.className = "timer-row";

        const resultText = document.createElement("span");
        resultText.className = "timer-text";
        resultText.textContent = attempt.result;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "remove-btn";
        deleteBtn.innerHTML = "❌";
        deleteBtn.onclick = () => {
            attempts = attempts.filter(a => a.id !== attempt.id);
            renderAttempts();
        };

        resultRow.appendChild(resultText);
        resultRow.appendChild(deleteBtn);
        card.appendChild(resultRow);

        // Result Radio Buttons
        const resultToggle = document.createElement("div");
        resultToggle.className = "result-toggle";

        ["Hit", "Strike"].forEach((result) => {
            const option = document.createElement("div");
            option.className = "result-toggle-option";
            if (attempt.result === result) {
                option.classList.add("selected");
            }
            option.textContent = result;
            option.onclick = () => {
                // Update the UI
                resultToggle.querySelectorAll(".result-toggle-option").forEach(opt => {
                    opt.classList.remove("selected");
                });
                option.classList.add("selected");

                // Update the data
                attempt.result = result;
                resultText.textContent = result;
            };
            resultToggle.appendChild(option);
        });
        card.appendChild(resultToggle);

        // Hit Zone Button
        const hitZoneBtn = document.createElement("button");
        hitZoneBtn.className = "zone-select-button";
        hitZoneBtn.textContent = attempt.hitZone ? attempt.hitZone : "Select Hit Zone";
        hitZoneBtn.onclick = () => {
            activeAttemptId = attempt.id;
            showHitZoneMatrix();
        };
        card.appendChild(hitZoneBtn);

        // Hit Type Dropdown (Custom Dropdown)
        const hitTypeLabel = document.createElement("div");
        hitTypeLabel.textContent = "Type of Hit";
        hitTypeLabel.style.marginBottom = "6px";
        hitTypeLabel.style.fontSize = "1rem";
        card.appendChild(hitTypeLabel);

        // ✅ Custom dropdown for hit type
        const dropdown = document.createElement("div");
        dropdown.className = "custom-dropdown";

        const selected = document.createElement("div");
        selected.className = "dropdown-selected";
        selected.textContent = attempt.hitType || "N/A";

        const options = document.createElement("ul");
        options.className = "dropdown-options";

        ["N/A", "Line Drive", "Ground Ball", "Fly Ball"].forEach((hitType) => {
            const li = document.createElement("li");
            li.textContent = hitType;
            li.dataset.value = hitType;

            if (attempt.hitType === hitType) {
                li.classList.add("selected");
            }

            li.onclick = () => {
                attempt.hitType = hitType;
                selected.textContent = hitType;

                const allOptions = options.querySelectorAll("li");
                allOptions.forEach(opt => opt.classList.remove("selected"));
                li.classList.add("selected");

                dropdown.classList.remove("open");
            };

            options.appendChild(li);
        });

        selected.onclick = () => {
            dropdown.classList.toggle("open");
        };

        document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("open");
            }
        });

        dropdown.appendChild(selected);
        dropdown.appendChild(options);
        card.appendChild(dropdown);

        attemptsContainer.appendChild(card);

        // ➕ Add button for more attempts
        if (attempt.id === attempts[attempts.length - 1].id) {
            const addBtnContainer = document.createElement("div");
            addBtnContainer.className = "inline-add-btn";

            const addBtn = document.createElement("button");
            addBtn.textContent = "+";
            addBtn.onclick = () => {
                const newId = attempts.length ? attempts[attempts.length - 1].id + 1 : 1;
                attempts.push({
                    id: newId,
                    result: "Hit",
                    hitZone: null,
                    hitType: "N/A"
                });
                renderAttempts();
            };

            addBtnContainer.appendChild(addBtn);
            attemptsContainer.appendChild(addBtnContainer);
        }
    });
}

function setupLivePlayerIdValidation() {
    const input = document.getElementById("player-id");
    let lastValidatedId = "";

    input.addEventListener("input", async () => {
        const enteredId = input.value.trim();

        if (enteredId === lastValidatedId) return;
        lastValidatedId = enteredId;

        if (!enteredId) {
            clearError();
            return;
        }

        try {
            const snapshot = await db
                .collection("users")
                .where("playerTryoutID", "==", enteredId)
                .get();

            if (snapshot.empty) {
                showError("❌ No player found with that tryout ID.", true); // ✅ Show live error
            } else {
                clearError(); // ✅ Clear error when valid
            }
        } catch (err) {
            console.error("Live validation error:", err);
            showError("Something went wrong. Try again.", true);
        }
    });
}

function setupSaveButton() {
    const saveBtn = document.getElementById("save-btn");

    saveBtn.onclick = async () => {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                showError("You must be logged in.");
                return;
            }

            const playerTryoutID = document.getElementById("player-id").value.trim();
            const notesValue = document.getElementById("notes-input").value.trim();
            const tryoutID = localStorage.getItem("selectedTryoutId");

            if (!playerTryoutID || !tryoutID) {
                showError("Missing Player ID or Tryout ID.");
                return;
            }

            const querySnapshot = await db
                .collection("users")
                .where("playerTryoutID", "==", playerTryoutID)
                .get();

            if (querySnapshot.empty) {
                showError("No player found with that tryout ID.");
                return;
            }

            const playerDoc = querySnapshot.docs[0].data();
            const playerID = playerDoc.playerID;

            const userDoc = await db.collection("users").doc(user.uid).get();
            const userData = userDoc.data();

            // To this:
            if (!userData || !userData.coachID) {
                showError("Your coach profile is missing a Coach ID.");
                return;
            }

            const coachID = userData.coachID;

            const cleanedAttempts = attempts.map((a) => ({
                result: a.result,
                hitZone: a.hitZone || "N/A",
                hitType: a.hitType
            }));

            await db.collection("hitting").add({
                tryoutID,
                playerTryoutID,
                playerID,
                coachID: coachID, 
                attempts: cleanedAttempts,
                notes: notesValue,
                timestamp: new Date()
              });

            // Show confirmation
            document.getElementById("save-confirmation").style.display = "block";
            setTimeout(() => {
                document.getElementById("save-confirmation").style.display = "none";
            }, 2000);

            // Reset for next entry
            attempts = [
                { id: 1, result: "Hit", hitZone: null, hitType: "N/A" }
            ];
            document.getElementById("player-id").value = "";
            document.getElementById("notes-input").value = "";
            renderAttempts();

        } catch (err) {
            console.error("Error saving hitting data:", err);
            showError("Failed to save. See console for details.");
        }
    };
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

// Make these functions globally accessible for the onclick handlers
window.showHitZoneMatrix = showHitZoneMatrix;
window.hideHitZoneMatrix = hideHitZoneMatrix;
window.selectHitZone = selectHitZone;