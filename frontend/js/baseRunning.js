const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
  console.log("Base running page loaded");
  renderAttempts();
});

console.log("Base Running Page JS Loaded");

// State variables
let attempts = [
  { id: 1, time: 0, basePath: "Home to 1st", running: false, startTime: null }
];

// Track interval per attempt
let intervalMap = {};

function renderAttempts() {
  const attemptsContainer = document.getElementById("attempts-container");
  attemptsContainer.innerHTML = ""; // Clear only the attempts section

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
    startBtn.className = "primary-btn";

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
    attemptsContainer.appendChild(card);
  });

  renderExtras();
}


function renderExtras() {
  const attemptsContainer = document.getElementById("attempts-container");

  const addBtn = document.createElement("button");
  addBtn.id = "add-attempt-btn";
  addBtn.className = "primary-btn";
  addBtn.textContent = "➕";
  addBtn.onclick = () => {
    const newId = attempts.length ? attempts[attempts.length - 1].id + 1 : 1;
    attempts.push({ id: newId, time: 0, basePath: "Home to 1st", running: false, startTime: null });
    renderAttempts();
  };

  const saveBtn = document.createElement("button");
  saveBtn.id = "save-btn";
  saveBtn.className = "primary-btn";
  saveBtn.textContent = "Save";
  saveBtn.onclick = async () => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        alert("Not logged in");
        return;
      }
  
      const playerTryoutID = document.getElementById("player-id").value.trim();
      const notesValue = document.getElementById("notes-input").value.trim();
      const tryoutID = localStorage.getItem("selectedTryoutId");
  
      if (!playerTryoutID || !tryoutID) {
        alert("Missing Player ID or Tryout ID");
        return;
      }
  
      const querySnapshot = await db
        .collection("users")
        .where("playerTryoutID", "==", playerTryoutID)
        .get();
  
      if (querySnapshot.empty) {
        alert("No player found with that tryout ID.");
        return;
      }
  
      const playerDoc = querySnapshot.docs[0].data();
      const playerID = playerDoc.playerID;
  
      const userDoc = await db.collection("users").doc(user.uid).get();
      const coachID = userDoc.data().coachID;
  
      const cleanedAttempts = attempts.map((a) => ({
        basePath: a.basePath,
        time: parseFloat((a.time / 1000).toFixed(2)),
      }));
  
      await db.collection("baseRunning").add({
        tryoutID,
        playerTryoutID,
        playerID,
        coachID,
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
        { id: 1, time: 0, basePath: "Home to 1st", running: false, startTime: null }
      ];
      document.getElementById("player-id").value = "";
      document.getElementById("notes-input").value = "";
      intervalMap = {};
      renderAttempts();
  
    } catch (err) {
      console.error("Error saving base running data:", err);
      alert("Failed to save. Check console.");
    }
  };

  attemptsContainer.appendChild(addBtn);
  attemptsContainer.appendChild(saveBtn);
}