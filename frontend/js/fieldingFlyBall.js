const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ FieldingFlyBall Page JS Loaded");
  loadAttempts();  // Load the saved attempts from localStorage
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
    attempts = JSON.parse(savedAttempts);  // Parse and load saved attempts
  }
}

// Function to save attempts to localStorage
function saveAttempts() {
  localStorage.setItem("attempts", JSON.stringify(attempts));  // Save attempts array to localStorage
}

// Function to render attempts dynamically
function renderAttempts() {
  attemptsContainer.innerHTML = ""; // Clear previous content

  attempts.forEach((attempt, index) => {
    const row = document.createElement("div");
    row.className = "attempt-row";

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
      saveAttempts();  // Save attempts to localStorage whenever there's a change
    };

    catchTypeContainer.appendChild(catchTypeLabel);
    catchTypeContainer.appendChild(select);

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
        saveAttempts();  // Save attempts to localStorage whenever there's a change
      };

      label.appendChild(radio);
      radioDiv.appendChild(label);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = () => {
      attempts.splice(index, 1);
      renderAttempts();
      saveAttempts();  // Save attempts to localStorage after deletion
    };

    row.appendChild(catchTypeContainer);
    row.appendChild(radioDiv);
    row.appendChild(deleteBtn);
    attemptsContainer.appendChild(row);
  });
}

function addRow() {
  attempts.push({ result: "Missed", catchType: "Drop step catch" });
  renderAttempts();
  saveAttempts();  // Save attempts to localStorage after adding a new row
}

function showMessage(message, isSuccess = true) {
  const messageBox = document.getElementById("message-box");
  messageBox.textContent = message;
  messageBox.className = `message-box ${isSuccess ? "success" : "error"}`;
  messageBox.style.display = "block";

  setTimeout(() => {
    messageBox.style.display = "none";
  }, 3000);
}

async function saveAll() {
  if (!playerInput.value.trim()) {
    showMessage("Please enter a Player TryOut ID!", false);
    return;
  }

  try {
    const playerTryoutID = playerInput.value.trim();
    const userRef = db.collection("users").where("playerTryoutID", "==", playerTryoutID);
    const userSnapshot = await userRef.get();

    if (userSnapshot.empty) {
      showMessage("Player TryOut ID not found in users collection.", false);
      return;
    }

    const userData = userSnapshot.docs[0].data();
    const playerID = userData.playerID;

    const fieldingRef = db.collection("FieldingFlyBall");
    const existingDocs = await fieldingRef.where("playerTryoutID", "==", playerTryoutID).get();
    const newDocId = playerTryoutID + "-" + (existingDocs.size + 1);

    const indexedAttempts = attempts.map((attempt) => ({
      CatchOrMiss: attempt.result,
      catchType: attempt.catchType,
    }));

    await fieldingRef.doc(newDocId).set({
      playerID: playerID,
      playerTryoutID: playerTryoutID,
      notes: notesInput.value,
      attempts: indexedAttempts, 
    });

    showMessage("✅ Fielding Fly Ball data saved as " + newDocId + "!", true);
  } catch (err) {
    console.error("❌ Error saving data:", err);
    showMessage("Failed to save. Check console.", false);
  }
}


