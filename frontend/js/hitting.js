const db = firebase.firestore(); 

document.addEventListener("DOMContentLoaded", () => {
  console.log("Hitting page loaded");
});

console.log("✅ Hitting Page JS Loaded");

let attempts = [
  { id: 1, result: "Hit", position: "N/A", hitType: "N/A" }
];

let notes = "";
let playerTryoutID = "";  // New variable to store the player ID

const container = document.getElementById("hitting-content");

function renderAttempts() {
  container.innerHTML = '<h2 class="text-center">Hitting Evaluation</h2>';

  // Add the input box for the player ID at the top
  const playerInputDiv = document.createElement("div");
  playerInputDiv.className = "player-input-div";

  const playerLabel = document.createElement("label");
  playerLabel.textContent = "Player ID:";
  playerInputDiv.appendChild(playerLabel);

  const playerInput = document.createElement("input");
  playerInput.type = "text";
  playerInput.id = "player-id-input";
  playerInput.placeholder = "Enter Player ID";
  playerInput.value = playerTryoutID;  // Pre-fill the value if there's any
  playerInput.oninput = (e) => playerTryoutID = e.target.value;  // Update playerTryoutID

  playerInputDiv.appendChild(playerInput);
  container.appendChild(playerInputDiv);

  attempts.forEach((attempt) => {
    const card = document.createElement("div");
    card.className = "attempt-card";

    const resultText = document.createElement("span");
    resultText.className = "result-text";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "remove-btn";
    deleteBtn.innerHTML = "❌";
    deleteBtn.onclick = () => {
      attempts = attempts.filter(a => a.id !== attempt.id);
      renderAttempts();
    };

    const resultRow = document.createElement("div");
    resultRow.className = "result-row";
    resultRow.appendChild(resultText);
    resultRow.appendChild(deleteBtn);

    // Result (Hit/Strike) Radio Buttons
    const resultRadioDiv = document.createElement("div");
    resultRadioDiv.className = "result-radio";
    
    ["Hit", "Strike"].forEach(result => {
      const label = document.createElement("label");
      label.textContent = result;
      
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `result-${attempt.id}`;
      radio.value = result;
      radio.checked = attempt.result === result;
      radio.onclick = () => attempt.result = result;

      label.appendChild(radio);
      resultRadioDiv.appendChild(label);
    });

    // Position Dropdown with Label
    const positionLabel = document.createElement("label");
    positionLabel.textContent = "Position";
    positionLabel.className = "position-label";

    const positionSelect = document.createElement("select");
    positionSelect.className = "position-select";
    ["N/A", "Right Field", "Centre Field", "Left Field"].forEach(position => {
      const option = document.createElement("option");
      option.value = position;
      option.textContent = position;
      if (attempt.position === position) option.selected = true;
      positionSelect.appendChild(option);
    });
    positionSelect.onchange = (e) => attempt.position = e.target.value;

    // Type of Hit Dropdown with Label
    const hitTypeLabel = document.createElement("label");
    hitTypeLabel.textContent = "Type of Hit";
    hitTypeLabel.className = "hit-type-label";

    const hitTypeSelect = document.createElement("select");
    hitTypeSelect.className = "hit-type-select";
    ["N/A", "Line Drive", "Ground Ball", "Fly Ball"].forEach(hitType => {
      const option = document.createElement("option");
      option.value = hitType;
      option.textContent = hitType;
      if (attempt.hitType === hitType) option.selected = true;
      hitTypeSelect.appendChild(option);
    });
    hitTypeSelect.onchange = (e) => attempt.hitType = e.target.value;

    // Add fields to the attempt card
    card.appendChild(resultRow);
    card.appendChild(resultRadioDiv);
    card.appendChild(positionLabel);
    card.appendChild(positionSelect);
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
    attempts.push({ id: newId, result: "Hit", position: "N/A", hitType: "N/A" });
    renderAttempts();
  };

  const notesLabel = document.createElement("label");
  notesLabel.className = "notes-label";
  notesLabel.textContent = "Notes:";

  const notesInput = document.createElement("textarea");
  notesInput.id = "notes-input";
  notesInput.value = notes;
  notesInput.oninput = (e) => notes = e.target.value;

  const saveBtn = document.createElement("button");
  saveBtn.id = "save-btn";
  saveBtn.textContent = "Save";
  saveBtn.onclick = async () => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        alert("Not logged in");
        return;
      }

      const cleanedAttempts = attempts.map((a) => ({
        result: a.result,
        position: a.position,
        hitType: a.hitType
      }));

      // Check if "hitting" collection exists, and save accordingly
      await db.collection("hitting").add({
        coachId: user.uid,
        playerTryoutID: playerTryoutID,  // Store the player ID here
        attempts: cleanedAttempts,
        notes: notes,
        timestamp: new Date()
      });

      alert("Hitting data saved!");
    } catch (err) {
      console.error("Error saving hitting data:", err);
      alert("Failed to save. Check console.");
    }
  };

  container.appendChild(addBtn);
  container.appendChild(notesLabel);
  container.appendChild(notesInput);
  container.appendChild(saveBtn);
}

document.addEventListener("DOMContentLoaded", renderAttempts);
