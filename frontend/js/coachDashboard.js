const db = firebase.firestore();

document.getElementById('toggle-tryout-form').addEventListener('click', () => {
  const card = document.getElementById('tryout-form-card');
  const statusText = document.getElementById('tryout-status');
  const toggleBtn = document.getElementById('toggle-tryout-form');

  // If currently hidden, show with animation
  if (card.classList.contains('hidden')) {
      card.classList.remove('hidden');
      // Force reflow for animation
      void card.offsetWidth;
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      
      // Trigger animation
      setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
      }, 10);
      
      toggleBtn.textContent = '✖';
      statusText.textContent = '';
      statusText.className = '';
  } else {
      // Hide with animation
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      
      // After animation completes, hide the element
      setTimeout(() => {
          card.classList.add('hidden');
          card.style.opacity = '';
          card.style.transform = '';
      }, 200);
      
      toggleBtn.textContent = '➕';
  }
});

function generateTryoutID() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const letter = letters[Math.floor(Math.random() * 26)];
    const number = Math.floor(Math.random() * 10); // 0-9
    return letter + number;
}

function createTryout() {
    const nameInput = document.getElementById("tryout-name");
    const dateInput = document.getElementById("tryout-date");
    const statusText = document.getElementById("tryout-status");

    const name = nameInput.value.trim();
    const date = dateInput.value;
    const tryoutID = generateTryoutID();

    if (!name || !date) {
        statusText.textContent = "❌ Please fill in both fields.";
        statusText.className = "";
        return;
    }

    const tryout = {
        tryoutID,
        name,
        date,
        createdAt: new Date(),
        coachId: firebase.auth().currentUser.uid,
        count: 0
    };

    db.collection("tryouts")
        .add(tryout)
        .then(() => {
            statusText.textContent = "✅ Tryout created successfully!";
            statusText.className = "success";
            nameInput.value = "";
            dateInput.value = "";

            // Collapse form after saving
            document.getElementById('tryout-form-card').classList.add('hidden');
            document.getElementById('toggle-tryout-form').textContent = '➕';

            // Reload tryouts list
            loadTryouts();
        })
        .catch((error) => {
            console.error("Error creating tryout:", error);
            statusText.textContent = "❌ Failed to create tryout.";
            statusText.className = "";
        });
}

function loadTryouts() {
    const tryoutList = document.getElementById("tryout-list");
    tryoutList.innerHTML = ""; // Clear existing list
  
    db.collection("tryouts")
        .orderBy("createdAt", "desc")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                tryoutList.innerHTML = "<p>No tryouts found.</p>";
                return;
            }
  
            querySnapshot.forEach((doc) => {
                const tryout = doc.data();
  
                // Create tryout card with improved labeling
                const tryoutCard = document.createElement("div");
                tryoutCard.className = "tryout-card";
                tryoutCard.dataset.tryoutId = tryout.tryoutID;
  
                // Updated format with clear labels
                tryoutCard.innerHTML = `
                    <div>
                        <p><strong>Tryout Name:</strong> ${tryout.name}</p>
                        <p><strong>Tryout ID:</strong> ${tryout.tryoutID}</p>
                        <p><strong>Date:</strong> ${tryout.date}</p>
                        <button class="select-btn">Select</button>
                    </div>
                `;
  
                tryoutList.appendChild(tryoutCard);
            });
  
            // Attach select button event listeners
            attachTryoutCardListeners();
        })
        .catch((error) => {
            console.error("Error loading tryouts:", error);
        });
}

function attachTryoutCardListeners() {
    document.querySelectorAll(".select-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const tryoutId = e.target.closest(".tryout-card").dataset.tryoutId;
            showStationPopup(tryoutId);
        });
    });
}    

function showStationPopup(tryoutId) {
    localStorage.setItem("selectedTryoutId", tryoutId);
    const popup = document.getElementById("station-popup");
    
    // First make it visible but transparent
    popup.classList.remove("hidden");
    
    // Force a reflow to ensure the transition works
    void popup.offsetWidth;
    
    // Now add the visible class to trigger the transitions
    popup.classList.add("visible");
}

function hideStationPopup() {
    const popup = document.getElementById("station-popup");
    
    // Remove the visible class first, triggering the fade out
    popup.classList.remove("visible");
    
    // After the transition completes, hide it completely
    setTimeout(() => {
        popup.classList.add("hidden");
    }, 300); // Match this to the transition duration (0.3s)
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Fetch coach data from the "users" collection using the logged-in user's uid
        db.collection("users").doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    // Combine first and last names (adjust property names if different)
                    const fullName = data.firstName + " " + data.lastName;
                    document.getElementById("welcome-text").innerText = "Welcome, " + fullName + "!";
                } else {
                    // If no document exists, fall back to default
                    document.getElementById("welcome-text").innerText = "Welcome, Coach!";
                }
            })
            .catch((error) => {
                console.error("Error fetching coach data:", error);
                document.getElementById("welcome-text").innerText = "Welcome, Coach!";
            });
    }
});

let areTryoutsVisible = false;
document.getElementById("show-tryouts-btn").addEventListener("click", toggleTryoutList);

function toggleTryoutList() {
    const tryoutList = document.getElementById("tryout-list");
    const tryoutsBtn = document.getElementById("show-tryouts-btn");

    if (!areTryoutsVisible) {
        tryoutList.classList.add("expanded");
        tryoutsBtn.textContent = "Hide Tryouts";
        loadTryouts();
    } else {
        tryoutList.classList.remove("expanded");
        tryoutsBtn.textContent = "Show Tryouts";
    }
    areTryoutsVisible = !areTryoutsVisible;
}

// Handle station button clicks
document.querySelectorAll(".station-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const station = btn.dataset.station;
        // Add a small delay to show the button press effect
        setTimeout(() => {
            window.location.href = `${station}.html`;
        }, 150);
    });
});
  
// Close popup
document.getElementById("close-popup").addEventListener("click", hideStationPopup);

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("station-popup").classList.add("hidden");
    document.getElementById("station-popup").classList.remove("visible");
});

let isPlayerListVisible = false;
document.getElementById("fetch-players-btn").addEventListener("click", togglePlayerList);
  
function togglePlayerList() {
    const playerList = document.getElementById("player-list");
    const fetchPlayersBtn = document.getElementById("fetch-players-btn");
    
    if (!isPlayerListVisible) {
        playerList.classList.add("expanded");
        fetchPlayersBtn.textContent = "Hide Players";
        fetchPlayers();
    } else {
        playerList.classList.remove("expanded");
        fetchPlayersBtn.textContent = "View Player Stats";
    }
    isPlayerListVisible = !isPlayerListVisible;
}

function fetchPlayers() {
    const playerList = document.getElementById("player-list");
    playerList.innerHTML = "";

    // Query the "users" collection for docs where role == "player"
    db.collection("users")
        .where("role", "==", "player")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                playerList.innerHTML = "<p>No players found.</p>";
                return;
            }
            // Loop through all matching player documents
            querySnapshot.forEach((doc) => {
                const playerData = doc.data();
                const docId = doc.id;

                // Use the playerID field if available, otherwise fallback to the docId
                const displayId = playerData.playerID ? playerData.playerID : docId;

                // Create a container for each player item
                const playerItem = document.createElement("div");
                playerItem.className = "player-item";

                // Only show the Player ID, keeping the player anonymous
                playerItem.innerHTML = `
                    <div>
                        <p><strong>Player ID:</strong> ${displayId}</p>
                    </div>
                    <button class="view-stats-btn" data-player-id="${docId}">
                        View Stats
                    </button>
                `;

                playerList.appendChild(playerItem);
            });

            // Attach click listeners to all "View Stats" buttons
            document.querySelectorAll(".view-stats-btn").forEach((button) => {
                button.addEventListener("click", (event) => {
                    const selectedPlayerId = event.target.dataset.playerId;
                    localStorage.setItem("selectedPlayerId", selectedPlayerId);
                    window.location.href = "coachSidePlayerStats.html";
                });
            });
        })
        .catch((error) => {
            console.error("Error fetching players: ", error);
        });
}