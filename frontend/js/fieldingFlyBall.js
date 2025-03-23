const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ FieldingFlyBall Page JS Loaded");
  loadAttempts();  // Load attempts from localStorage
  renderAttempts();
});

let attempts = [];
let notes = "";
let playerTryoutID = "";

const attemptsContainer = document.getElementById("attempts");
const notesInput = document.getElementById("notes");
const playerInput = document.getElementById("playerTryOutID");

// Function to load attempts from localStorage
function loadAttempts() {
  const savedAttempts = localStorage.getItem("attempts");
  if (savedAttempts) {
    attempts = JSON.parse(savedAttempts);
  }
}

// Function to save attempts to localStorage
function saveAttempts() {
  localStorage.setItem("attempts", JSON.stringify(attempts));
}

// Function to render attempts dynamically
function renderAttempts() {
  attemptsContainer.innerHTML = ""; // Clear previous content

  attempts.forEach((attempt, index) => {
    const row = document.createElement("div");
    row.className = "attempt-row";

    // Catch Type Dropdown
    const catchTypeContainer = document.createElement("div");
    catchTypeContainer.className = "catch-type-container";

    const catchTypeLabel = document.createElement("label");
    catchTypeLabel.textContent = "Catch Type: ";
    catchTypeLabel.className = "catch-type-label";

    const select = document.createElement("select");
    ["Drop step catch", "Conventional catch"].forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      if (attempt.catchType === type) option.selected = true;
      select.appendChild(option);
    });
    select.onchange = (e) => {
      attempt.catchType = e.target.value;
      saveAttempts();
    };

    catchTypeContainer.appendChild(catchTypeLabel);
    catchTypeContainer.appendChild(select);

    // Radio Buttons
    const radioDiv = document.createElement("div");
    radioDiv.className = "radio-group";

    ["Missed", "Catches"].forEach((result) => {
      const label = document.createElement("label");
      label.textContent = result;

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `result-${index}`;
      radio.value = result;
      radio.checked = attempt.result === result;
      radio.onchange = () => {
        attempt.result = result;
        saveAttempts();
      };

      label.appendChild(radio);
      radioDiv.appendChild(label);
    });

    // Delete Button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = () => {
      attempts.splice(index, 1);
      renderAttempts();
      saveAttempts();
    };

    row.appendChild(catchTypeContainer);
    row.appendChild(radioDiv);
    row.appendChild(deleteBtn);
    attemptsContainer.appendChild(row);
  });
}

// Function to add a new attempt row
function addRow() {
  attempts = [{ result: "Missed", catchType: "Drop step catch" }]; // Overwrite attempts with only the new row
  renderAttempts();
  saveAttempts();
}

// Function to save data to Firestore
async function saveAll() {
  if (!playerInput.value.trim()) {
    alert("Please enter a Player TryOut ID!");
    return;
  }

  try {
    const playerTryoutID = playerInput.value.trim();

    // Fetch playerID from users collection
    const userRef = db.collection("users").where("playerTryoutID", "==", playerTryoutID);
    const userSnapshot = await userRef.get();

    if (userSnapshot.empty) {
      alert("Player TryOut ID not found in users collection.");
      return;
    }

    const userData = userSnapshot.docs[0].data();
    const playerID = userData.playerID;

    const playerRef = db.collection("FieldingFlyBall").doc(playerTryoutID);

    // Create structured attempts data
    const indexedAttempts = {};
    attempts.forEach((attempt, index) => {
      indexedAttempts[index] = {
        CatchOrMiss: attempt.result,
        catchType: attempt.catchType,
      };
    });

    // Overwrite the entire document instead of merging
    await playerRef.set({
      playerID: playerID,
      playerTryoutID: playerTryoutID,
      notes: notesInput.value,
      attempts: indexedAttempts, // Ensures full overwrite of attempts
    });

    alert("✅ Fielding Fly Ball data saved!");
  } catch (err) {
    console.error("❌ Error saving data:", err);
    alert("Failed to save. Check console.");
  }
}

function goBack() {
  window.location.href = "coachDashboard.html";
}
