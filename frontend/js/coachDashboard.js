const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', function() {
    const introParagraph = document.querySelector('#welcome-text + p');
    
    if (introParagraph) {
      introParagraph.innerHTML = "Manage your tryouts and track player performance from this dashboard. Select from the options below to get started.";
    }
  });   

document.getElementById('toggle-tryout-form').addEventListener('click', () => {
    const card = document.getElementById('tryout-form-card');
    const statusText = document.getElementById('tryout-status');
    const toggleBtn = document.getElementById('toggle-tryout-form');
    const plusIcon = toggleBtn.querySelector('.plus-icon');
  
    if (card.classList.contains('hidden')) {
        card.classList.remove('hidden');
        void card.offsetWidth;
        card.style.opacity = '0';
        card.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 10);
        
        plusIcon.classList.add('is-active');
        statusText.textContent = '';
        statusText.className = '';
    } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            card.classList.add('hidden');
            card.style.opacity = '';
            card.style.transform = '';
        }, 200);
        
        plusIcon.classList.remove('is-active');
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

    const userId = firebase.auth().currentUser.uid;
    
    db.collection("users").doc(userId).get()
        .then((doc) => {
            if (!doc.exists) {
                throw new Error("Coach data not found");
            }
            
            const userData = doc.data();
            const coachID = userData.coachID;
            
            if (!coachID) {
                throw new Error("Coach ID not found in user data");
            }
            
            const tryout = {
                tryoutID,
                name,
                date,
                createdAt: new Date(),
                coachID: coachID,
                coachUid: userId
            };

            return db.collection("tryouts").add(tryout);
        })
        .then(() => {
            statusText.textContent = "✅ Tryout created successfully!";
            statusText.className = "success";
            nameInput.value = "";
            dateInput.value = "";

            document.getElementById('tryout-form-card').classList.add('hidden');
            document.getElementById('toggle-tryout-form').textContent = '➕';
            loadTryouts();
        })

        .catch((error) => {
            console.error("Error creating tryout:", error);
            statusText.textContent = "❌ Failed to create tryout: " + error.message;
            statusText.className = "";
        });
}

function loadTryouts() {
    const tryoutList = document.getElementById("tryout-list");
    tryoutList.innerHTML = ""; // Clear existing list
  
    // Get the current coach's UID
    const currentCoachUid = firebase.auth().currentUser.uid;
    
    // Get the coach's numeric coachID from their user document
    db.collection("users").doc(currentCoachUid).get()
        .then((doc) => {
            if (!doc.exists) {
                throw new Error("Coach data not found");
            }
            
            const userData = doc.data();
            const coachID = userData.coachID; // The numeric ID
            
            // Query tryouts that match either format (for backward compatibility)
            return db.collection("tryouts")
                .where(firebase.firestore.FieldPath.documentId(), "!=", "placeholder")
                .get()
                .then((querySnapshot) => {
                    if (querySnapshot.empty) {
                        tryoutList.innerHTML = "<p>No tryouts found.</p>";
                        return;
                    }
                    
                    // Filter tryouts that belong to this coach (using either field)
                    const coachTryouts = [];
                    querySnapshot.forEach((doc) => {
                        const tryout = doc.data();
                        const tryoutDocId = doc.id;
                        
                        // Check if this tryout belongs to the current coach
                        // using either the new coachID field or the old coachId field
                        if ((tryout.coachID && tryout.coachID === coachID) || 
                            (tryout.coachId && tryout.coachId === currentCoachUid) ||
                            (tryout.coachUid && tryout.coachUid === currentCoachUid)) {
                            
                            coachTryouts.push({
                                ...tryout,
                                id: tryoutDocId
                            });
                        }
                    });
                    
                    if (coachTryouts.length === 0) {
                        tryoutList.innerHTML = "<p>No tryouts found.</p>";
                        return;
                    }
                    
                    // Sort tryouts by creation date (newest first)
                    coachTryouts.sort((a, b) => {
                        const dateA = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(0);
                        const dateB = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(0);
                        return dateB - dateA;
                    });
                    
                    // Render the tryouts
                    coachTryouts.forEach((tryout) => {
                        // Create tryout card with improved labeling
                        const tryoutCard = document.createElement("div");
                        tryoutCard.className = "tryout-card";
                        tryoutCard.dataset.tryoutId = tryout.tryoutID;
                        
                        // Format the date in a user-friendly way (from YYYY-MM-DD to Month Day, Year)
                        let formattedDate = tryout.date;
                        try {
                            const dateObj = new Date(tryout.date);
                            formattedDate = dateObj.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        } catch (e) {
                            // If date formatting fails, use the original date
                        }
          
                        // Updated format with clear labels
                        tryoutCard.innerHTML = `
                            <div>
                                <p><strong>Tryout Name:</strong> ${tryout.name}</p>
                                <p><strong>Tryout ID:</strong> ${tryout.tryoutID}</p>
                                <p><strong>Date:</strong> ${formattedDate}</p>
                                <button class="select-btn">Select</button>
                            </div>
                        `;
          
                        tryoutList.appendChild(tryoutCard);
                    });
          
                    attachTryoutCardListeners();
                });
        })
        .catch((error) => {
            console.error("Error loading tryouts:", error);
            tryoutList.innerHTML = `<p>Error loading tryouts: ${error.message}</p>`;
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
                    <button class="view-stats-btn" data-player-id="${displayId}" data-doc-id="${docId}">
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
                    window.location.href = `coachSidePlayerStats.html`;
                });
            });
        })
        .catch((error) => {
            console.error("Error fetching players: ", error);
        });
}