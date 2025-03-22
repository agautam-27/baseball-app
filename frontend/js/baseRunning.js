
const db = firebase.firestore(); 

document.addEventListener("DOMContentLoaded", () => {
  console.log("Base running page loaded");

  // ➕ Timer/attempt logic will be added here step-by-step
});

// ✅ Firebase initialized in earlier scripts
console.log("✅ Base Running Page JS Loaded");

// State variables
let attempts = [
  { id: 1, time: 0, basePath: "Home to 1st", running: false, startTime: null }
];

let notes = "";

// DOM References
const container = document.getElementById("base-running-content");

// Track interval per attempt
let intervalMap = {};

function renderAttempts() {
    container.innerHTML = '<h2 class="text-center">Base Running Evaluation</h2>';
  
    attempts.forEach((attempt) => {
      const card = document.createElement("div");
      card.className = "attempt-card";
  
      const timeText = document.createElement("span");
      timeText.className = "timer-text";
      timeText.textContent = `${(attempt.time / 1000).toFixed(2)}s`;
  
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "remove-btn";
      deleteBtn.innerHTML = "❌";
      deleteBtn.onclick = () => {
        clearInterval(intervalMap[attempt.id]);
        attempts = attempts.filter(a => a.id !== attempt.id);
        delete intervalMap[attempt.id];
        renderAttempts();
      };
  
      const timerRow = document.createElement("div");
      timerRow.className = "timer-row";
      timerRow.appendChild(timeText);
      timerRow.appendChild(deleteBtn);
  
      const select = document.createElement("select");
      select.className = "base-path-select";
      ["Home to 1st", "Home to 2nd"].forEach(path => {
        const option = document.createElement("option");
        option.value = path;
        option.textContent = path;
        if (attempt.basePath === path) option.selected = true;
        select.appendChild(option);
      });
      select.onchange = (e) => attempt.basePath = e.target.value;
  
      const startBtn = document.createElement("button");
      startBtn.className = "timer-btn";
      startBtn.textContent = attempt.running ? "Stop" : "Start";
  
      startBtn.onclick = () => {
        if (attempt.running) {
          attempt.running = false;
          clearInterval(intervalMap[attempt.id]);
          delete intervalMap[attempt.id];
          startBtn.textContent = "Start";
        } else {
          attempt.running = true;
          attempt.startTime = Date.now() - attempt.time;
          startBtn.textContent = "Stop";
  
          intervalMap[attempt.id] = setInterval(() => {
            attempt.time = Date.now() - attempt.startTime;
            timeText.textContent = `${(attempt.time / 1000).toFixed(2)}s`;
          }, 100);
        }
      };
  
      card.appendChild(timerRow);
      card.appendChild(select);
      card.appendChild(startBtn);
      container.appendChild(card);
    });
  
    renderExtras();
  }
  

// Add notes and save button
function renderExtras() {
  const addBtn = document.createElement("button");
  addBtn.id = "add-attempt-btn";
  addBtn.textContent = "➕ Add New Attempt";
  addBtn.onclick = () => {
    const newId = attempts.length ? attempts[attempts.length - 1].id + 1 : 1;
    attempts.push({ id: newId, time: 0, basePath: "Home to 1st", running: false, startTime: null });
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
  
      // Clean up data to only save what's needed
      const cleanedAttempts = attempts.map((a) => ({
        basePath: a.basePath,
        time: parseFloat((a.time / 1000).toFixed(2)) // Save in seconds
      }));
  
      await db.collection("baseRunning").add({
        coachId: user.uid,
        attempts: cleanedAttempts,
        notes: notes,
        timestamp: new Date()
      });
  
      alert("Base running data saved!");
      // Optionally: clear attempts/notes or redirect
    } catch (err) {
      console.error("Error saving base running data:", err);
      alert("Failed to save. Check console.");
    }
  };
  
  container.appendChild(addBtn);
  container.appendChild(notesLabel);
  container.appendChild(notesInput);
  container.appendChild(saveBtn);
}

document.addEventListener("DOMContentLoaded", renderAttempts);

