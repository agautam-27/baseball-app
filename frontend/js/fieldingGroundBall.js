const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ FieldingGroundBall Page JS Loaded");
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

    const playerRef = db.collection("FieldingGroundBall").doc(playerTryoutID);

    const indexedAttempts = attempts.map((attempt) => ({
        CatchOrMiss: attempt.result,
        catchType: attempt.catchType,
      }));

      await playerRef.set(
        {
          playerID: playerID,
          playerTryoutID: playerTryoutID,
          notes: notesInput.value,
          attempts: indexedAttempts, 
        },
        { merge: true }
      );

    alert("✅ Fielding Ground Ball data saved!");
  } catch (err) {
    console.error("❌ Error saving data:", err);
    alert("Failed to save. Check console.");
  }
}

function goBack() {
  window.location.href = "coachDashboard.html";
}
