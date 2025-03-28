const db = firebase.firestore();


document.addEventListener("DOMContentLoaded", () => {
  console.log("Base running page loaded");
  renderAttempts();
  setupSaveButton();
  setupLivePlayerIdValidation();
});

console.log("Base Running Page JS Loaded");

// State variables
let attempts = [
  { id: 1, time: 0, basePath: "Home to 1st", running: false, startTime: null }
];

// Track interval per attempt
let intervalMap = {};

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
        time: 0,
        basePath: "Home to 1st",
        running: false,
        startTime: null
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

    // ✅ Custom dropdown instead of native select
    const dropdown = document.createElement("div");
    dropdown.className = "custom-dropdown";

    const selected = document.createElement("div");
    selected.className = "dropdown-selected";
    selected.textContent = attempt.basePath;

    const options = document.createElement("ul");
    options.className = "dropdown-options";

    ["Home to 1st", "Home to 2nd"].forEach((path) => {
      const li = document.createElement("li");
      li.textContent = path;
      li.dataset.value = path;
    
      if (attempt.basePath === path) {
        li.classList.add("selected"); 
      }
    
      li.onclick = () => {
        attempt.basePath = path;
        selected.textContent = path;
    
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

    // ✅ Start button
    const startBtn = document.createElement("button");
    startBtn.className = "primary-btn small-btn";
    startBtn.textContent = attempt.running ? "Stop" : "Start";

    startBtn.onclick = () => {
      if (attempt.running) {
        attempt.running = false;
        clearInterval(intervalMap[attempt.id]);
        delete intervalMap[attempt.id];
        startBtn.textContent = "Start";
        startBtn.classList.remove("running");
      } else {
        attempt.running = true;
        attempt.startTime = Date.now() - attempt.time;
        startBtn.textContent = "Stop";
        startBtn.classList.add("running");

        intervalMap[attempt.id] = setInterval(() => {
          attempt.time = Date.now() - attempt.startTime;
          timeText.textContent = `${(attempt.time / 1000).toFixed(2)}s`;
        }, 100);
      }
    };

    // ✅ Add everything to card
    card.appendChild(timerRow);
    card.appendChild(dropdown);
    card.appendChild(startBtn);
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
          time: 0,
          basePath: "Home to 1st",
          running: false,
          startTime: null
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

      // const userDoc = await db.collection("users").doc(user.uid).get();
      // const coachID = userDoc.data()

      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();

      if (!userData || !userData.coachId) {
        showError("Your coach profile is missing a Coach ID.");
        return;
      }
      
      const coachID = userData.coachId; 

      const cleanedAttempts = attempts.map((a) => ({
        basePath: a.basePath,
        time: parseFloat((a.time / 1000).toFixed(2)),
      }));

      await db.collection("baseRunning").add({
        tryoutID,
        playerTryoutID,
        playerID,
        coachId: coachID, 
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
      showError("Failed to save. See console for details.");
    }
  };
}
