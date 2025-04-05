const auth = firebase.auth();
const firestore = firebase.firestore();

auth.onAuthStateChanged((user) => {
  if (user) {
    fetchPlayerData(user);
  } else {
    console.log("No authenticated user. Please log in.");
  }
});

// Function to show loading state on a card
const showCardLoading = (cardId) => {
  const card = document.getElementById(cardId);
  
  // Create loading overlay if it doesn't exist
  if (!card.querySelector('.loading-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    overlay.appendChild(spinner);
    card.appendChild(overlay);
  }
};

// Function to hide loading state on a card
const hideCardLoading = (cardId) => {
  const card = document.getElementById(cardId);
  const overlay = card.querySelector('.loading-overlay');
  
  if (overlay) {
    // Add a short delay to make the loading state visible even for quick updates
    setTimeout(() => {
      overlay.remove();
      // Add highlight effect to show data was updated
      card.classList.add('highlight-update');
      setTimeout(() => {
        card.classList.remove('highlight-update');
      }, 1500);
    }, 300);
  }
};

// Initialize loading indicators when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Show loading state on all cards initially
  showCardLoading('pitching-card');
  showCardLoading('hitting-card');
  showCardLoading('base-running-card');
  showCardLoading('fielding-fly-card');
  showCardLoading('fielding-ground-card');
});

const fetchPlayerData = async (user) => {
  try {
    const playerDocRef = firestore.collection("users").doc(user.uid);
    const playerDocSnap = await playerDocRef.get();

    if (playerDocSnap.exists) {
      const playerData = playerDocSnap.data();
      const firstName = playerData.firstName || "Player";
      const lastName = playerData.lastName || "";
      const currentTryout = playerData.currentTryout || null;
      const playerTryoutID = playerData.playerTryoutID || "N/A";
      const playerID = playerData.playerID; // Retrieve playerID from user's document

      // Display initial welcome message and tryout info
      displayWelcomeMessage(firstName, lastName, currentTryout, playerTryoutID);
      fetchTryouts(currentTryout);
      
      // Set up real-time listeners instead of one-time fetches
      setupRealTimeListeners(playerID);
      
      // Set up listener for user document changes (for tryout updates)
      setupTryoutListener(user.uid);
    } else {
      console.error("Player document does not exist");
    }
  } catch (error) {
    console.error("Error fetching player data:", error);
  }
};

// Main function to set up all real-time listeners
const setupRealTimeListeners = (playerID) => {
  if (!playerID) {
    console.error("No playerID found for the user.");
    return;
  }

  setupHittingListener(playerID);
  setupPitchingListener(playerID);
  setupFieldingFlyListener(playerID);
  setupFieldingGroundListener(playerID);
  setupBaseRunningListener(playerID);
};

// Real-time listener for user document changes
const setupTryoutListener = (userUID) => {
  firestore.collection("users").doc(userUID)
    .onSnapshot((doc) => {
      if (doc.exists) {
        const userData = doc.data();
        const firstName = userData.firstName || "Player";
        const lastName = userData.lastName || "";
        const currentTryout = userData.currentTryout || null;
        const playerTryoutID = userData.playerTryoutID || "N/A";
        
        displayWelcomeMessage(firstName, lastName, currentTryout, playerTryoutID);
        fetchTryouts(currentTryout);
      }
    }, (error) => {
      console.error("Error in user data listener:", error);
    });
};

const displayWelcomeMessage = async (firstName, lastName, currentTryout, playerTryoutID) => {
  const welcomeMessage = document.getElementById("welcome-message");
  const nextTryoutMessage = document.getElementById("next-tryout-message");

  if (welcomeMessage) {
    welcomeMessage.textContent = `Welcome, ${firstName} ${lastName}!`;
  }

  if (nextTryoutMessage) {
    if (currentTryout) {
      try {
        const tryoutsSnapshot = await firestore.collection("tryouts").where("tryoutID", "==", currentTryout).get();

        if (!tryoutsSnapshot.empty) {
          const tryoutData = tryoutsSnapshot.docs[0].data();
          nextTryoutMessage.innerHTML = `
            <b>Next Tryout:</b> ${tryoutData.name}<br>
            <b>Tryout Date:</b> ${tryoutData.date}<br>
            <b>Your Tryout ID:</b> ${playerTryoutID}<br>
          `;
        } else {
          nextTryoutMessage.innerHTML = `
            Your next tryout: ${currentTryout}<br>
            Your tryout ID: ${playerTryoutID}<br>
            (Tryout details not found)
          `;
        }
      } catch (error) {
        console.error("Error fetching tryout details:", error);
      }
    } else {
      nextTryoutMessage.textContent = "You have not joined any tryouts.";
    }
  }
};

const viewTryoutsBtn = document.getElementById("view-tryouts-btn");
const tryoutList = document.getElementById("tryout-list");
const tryoutsContainer = document.getElementById("tryouts-container");

viewTryoutsBtn.addEventListener("click", () => {
  if (tryoutList.classList.contains("hidden")) {
    // When showing the list, set up the listener
    setupAvailableTryoutsListener();
    tryoutList.classList.remove("hidden");
    viewTryoutsBtn.textContent = "Hide Current Tryouts";
  } else {
    // When hiding, we can detach listeners if needed
    tryoutList.classList.add("hidden");
    viewTryoutsBtn.textContent = "View Current Tryouts";
  }
});

const setupAvailableTryoutsListener = () => {
  firestore.collection("tryouts")
    .orderBy("createdAt", "desc")
    .onSnapshot((querySnapshot) => {
      updateTryoutList(querySnapshot);
    }, (error) => {
      console.error("Error in tryouts listener:", error);
    });
};

// Function to update the tryout list UI
const updateTryoutList = (querySnapshot) => {
  tryoutsContainer.innerHTML = "";

  if (querySnapshot.empty) {
    tryoutsContainer.innerHTML = "<p>No tryouts available.</p>";
    return;
  }

  // Get current user to check their current tryout
  const user = auth.currentUser;
  if (!user) return;

  // Get user's current tryout from latest document
  firestore.collection("users").doc(user.uid).get().then((userDoc) => {
    if (!userDoc.exists) return;
    
    const currentTryout = userDoc.data().currentTryout;
    
    // Now build the tryout list
    querySnapshot.forEach((doc) => {
      const tryout = doc.data();
      const tryoutDocID = doc.id;
      const tryoutID = tryout.tryoutID;

      const tryoutCard = document.createElement("div");
      tryoutCard.className = "tryout-card";
      tryoutCard.innerHTML = `
          <p><strong>${tryout.name}</strong></p>
          <p>Date: ${tryout.date}</p>
          <p>Tryout ID: ${tryoutID}</p>
        `;

      if (currentTryout === tryoutID) {
        // Show cancel button if already joined this tryout
        const cancelButton = document.createElement("button");
        cancelButton.className = "cancel-tryout-btn";
        cancelButton.textContent = "Cancel Tryout";
        cancelButton.addEventListener("click", () => cancelTryout(tryoutID, tryoutDocID));

        tryoutCard.appendChild(cancelButton);
      } else {
        // Otherwise, show join button (grey it out if the player has another tryout)
        const joinButton = document.createElement("button");
        joinButton.className = "join-tryout-btn";
        joinButton.textContent = "Join Tryout";
        joinButton.dataset.tryoutId = tryoutID;
        joinButton.dataset.tryoutDocId = tryoutDocID;
        joinButton.dataset.count = tryout.count;

        if (currentTryout) {
          joinButton.disabled = true; // Disable button
        }

        joinButton.addEventListener("click", (event) => {
          if (!joinButton.disabled) {
            const tryoutID = event.target.dataset.tryoutId;
            const tryoutDocID = event.target.dataset.tryoutDocId;
            const count = parseInt(event.target.dataset.count);
            joinTryout(tryoutID, tryoutDocID, count);
          }
        });

        tryoutCard.appendChild(joinButton);
      }

      tryoutsContainer.appendChild(tryoutCard);
    });
  });
};

const fetchTryouts = async (currentTryout) => {
  tryoutsContainer.innerHTML = "";

  // Update query to sort by createdAt in descending order
  const querySnapshot = await firestore.collection("tryouts")
    .orderBy("createdAt", "desc") // Changed from date asc to createdAt desc
    .get();

  if (querySnapshot.empty) {
    tryoutsContainer.innerHTML = "<p>No tryouts available.</p>";
  } else {
    querySnapshot.forEach((doc) => {
      const tryout = doc.data();
      const tryoutDocID = doc.id;
      const tryoutID = tryout.tryoutID;

      const tryoutCard = document.createElement("div");
      tryoutCard.className = "tryout-card";
      tryoutCard.innerHTML = `
          <p><strong>${tryout.name}</strong></p>
          <p>Date: ${tryout.date}</p>
          <p>Tryout ID: ${tryoutID}</p>
        `;

      if (currentTryout === tryoutID) {
        // Show cancel button if already joined this tryout
        const cancelButton = document.createElement("button");
        cancelButton.className = "cancel-tryout-btn";
        cancelButton.textContent = "Cancel Tryout";
        cancelButton.addEventListener("click", () => cancelTryout(tryoutID, tryoutDocID));

        tryoutCard.appendChild(cancelButton);
      } else {
        // Otherwise, show join button (grey it out if the player has another tryout)
        const joinButton = document.createElement("button");
        joinButton.className = "join-tryout-btn";
        joinButton.textContent = "Join Tryout";
        joinButton.dataset.tryoutId = tryoutID;
        joinButton.dataset.tryoutDocId = tryoutDocID;
        joinButton.dataset.count = tryout.count;

        if (currentTryout) {
          joinButton.disabled = true; // Disable button
        }

        joinButton.addEventListener("click", (event) => {
          if (!joinButton.disabled) {
            const tryoutID = event.target.dataset.tryoutId;
            const tryoutDocID = event.target.dataset.tryoutDocId;
            const count = parseInt(event.target.dataset.count);
            joinTryout(tryoutID, tryoutDocID, count);
          }
        });

        tryoutCard.appendChild(joinButton);
      }

      tryoutsContainer.appendChild(tryoutCard);
    });
  }
};

const joinTryout = async (tryoutID, tryoutDocID, count) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated.");
    return;
  }

  try {
    const playerDocRef = firestore.collection("users").doc(user.uid);
    const tryoutDocRef = firestore.collection("tryouts").doc(tryoutDocID);

    const playerDocSnap = await playerDocRef.get();
    if (playerDocSnap.exists && playerDocSnap.data().currentTryout) {
      return;
    }

    const newPlayerTryoutID = tryoutID + (count + 1);

    await playerDocRef.update({
      currentTryout: tryoutID,
      playerTryoutID: newPlayerTryoutID,
    });

    await tryoutDocRef.update({
      count: firebase.firestore.FieldValue.increment(1),
    });

    // Don't need to fetch data again - listeners will update UI
  } catch (error) {
    console.error("Error joining tryout:", error);
  }
};

const cancelTryout = async (tryoutID, tryoutDocID) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated.");
    return;
  }

  try {
    const playerDocRef = firestore.collection("users").doc(user.uid);
    const tryoutDocRef = firestore.collection("tryouts").doc(tryoutDocID);

    await playerDocRef.update({
      currentTryout: firebase.firestore.FieldValue.delete(),
      playerTryoutID: firebase.firestore.FieldValue.delete(),
    });

    await tryoutDocRef.update({
      count: firebase.firestore.FieldValue.increment(-1),
    });

    // Don't need to fetch data again - listeners will update UI
  } catch (error) {
    console.error("Error canceling tryout:", error);
  }
};

// Real-time listener for hitting stats
const setupHittingListener = (playerID) => {
  firestore.collection("hitting")
    .where("playerID", "==", playerID)
    .onSnapshot((snapshot) => {
      let totalHits = 0;
      let totalStrikes = 0;

      snapshot.forEach((doc) => {
        const hittingData = doc.data();
        const attempts = hittingData.attempts || [];

        attempts.forEach((attempt) => {
          if (attempt.result === "Hit") {
            totalHits++;
          } else if (attempt.result === "Strike") {
            totalStrikes++;
          }
        });
      });

      updateHittingCard(totalHits, totalStrikes);
    }, (error) => {
      console.error("Error in hitting listener:", error);
    });
};

// Update hitting card with loading indicators
const updateHittingCard = (hits, strikes) => {
  showCardLoading('hitting-card');
  
  setTimeout(() => {
    document.getElementById("hitting-hits").textContent = hits;
    document.getElementById("hitting-strikes").textContent = strikes;
    hideCardLoading('hitting-card');
  }, 300);
};

// Real-time listener for pitching stats
const setupPitchingListener = (playerID) => {
  firestore.collection("pitching")
    .where("playerID", "==", playerID)
    .onSnapshot((snapshot) => {
      let totalPitches = 0;
      let totalStrikes = 0;
      let totalBalls = 0;
      let totalSpeed = 0;
      let speedCount = 0;

      snapshot.forEach((doc) => {
        const pitchingData = doc.data();
        const attempts = pitchingData.attempts || [];

        attempts.forEach((attempt) => {
          totalPitches++;

          if (attempt.outcome === "Strike") {
            totalStrikes++;
          } else if (attempt.outcome === "Ball") {
            totalBalls++;
          }

          if (attempt.speed) {
            totalSpeed += attempt.speed;
            speedCount++;
          }
        });
      });

      const avgSpeed = speedCount > 0 ? (totalSpeed / speedCount).toFixed(1) : "N/A";
      updatePitchingCard(totalPitches, totalStrikes, totalBalls, avgSpeed);
    }, (error) => {
      console.error("Error in pitching listener:", error);
    });
};

// Update pitching card with loading indicators
const updatePitchingCard = (pitches, strikes, balls, avgSpeed) => {
  showCardLoading('pitching-card');
  
  setTimeout(() => {
    document.getElementById("num-pitches").textContent = pitches;
    document.getElementById("num-strikes").textContent = strikes;
    document.getElementById("num-balls").textContent = balls;
    document.getElementById("avg-speed").textContent = avgSpeed !== "N/A" ? `${avgSpeed} km/h` : "N/A";
    hideCardLoading('pitching-card');
  }, 300);
};

// Real-time listener for fielding fly ball stats
const setupFieldingFlyListener = (playerID) => {
  firestore.collection("FieldingFlyBall")
    .where("playerID", "==", playerID)
    .onSnapshot((snapshot) => {
      let totalCatches = 0;
      let totalMisses = 0;

      snapshot.forEach((doc) => {
        const fieldingData = doc.data();
        const attempts = fieldingData.attempts || [];

        attempts.forEach((attempt) => {
          if (attempt.CatchOrMiss === "Catches") {
            totalCatches++;
          } else if (attempt.CatchOrMiss === "Missed") {
            totalMisses++;
          }
        });
      });

      updateFieldingFlyCard(totalCatches, totalMisses);
    }, (error) => {
      console.error("Error in fielding fly ball listener:", error);
    });
};

// Update fielding (fly balls) card with loading indicators
const updateFieldingFlyCard = (catches, misses) => {
  showCardLoading('fielding-fly-card');
  
  setTimeout(() => {
    document.getElementById("fly-balls-catches").textContent = catches;
    document.getElementById("fly-balls-misses").textContent = misses;
    hideCardLoading('fielding-fly-card');
  }, 300);
};

// Real-time listener for fielding ground ball stats
const setupFieldingGroundListener = (playerID) => {
  firestore.collection("FieldingGroundBall")
    .where("playerID", "==", playerID)
    .onSnapshot((snapshot) => {
      let totalCatches = 0;
      let totalMisses = 0;

      snapshot.forEach((doc) => {
        const fieldingData = doc.data();
        const attempts = fieldingData.attempts || [];

        attempts.forEach((attempt) => {
          if (attempt.CatchOrMiss === "Catches") {
            totalCatches++;
          } else if (attempt.CatchOrMiss === "Missed") {
            totalMisses++;
          }
        });
      });

      updateFieldingGroundCard(totalCatches, totalMisses);
    }, (error) => {
      console.error("Error in fielding ground ball listener:", error);
    });
};

// Update fielding (ground balls) card with loading indicators
const updateFieldingGroundCard = (catches, misses) => {
  showCardLoading('fielding-ground-card');
  
  setTimeout(() => {
    document.getElementById("ground-balls-catches").textContent = catches;
    document.getElementById("ground-balls-misses").textContent = misses;
    hideCardLoading('fielding-ground-card');
  }, 300);
};

// Real-time listener for base running stats
const setupBaseRunningListener = (playerID) => {
  firestore.collection("baseRunning")
    .where("playerID", "==", playerID)
    .onSnapshot((snapshot) => {
      let homeToFirstTimes = [];
      let homeToSecondTimes = [];

      snapshot.forEach((doc) => {
        const baseRunningData = doc.data();
        const attempts = baseRunningData.attempts || [];

        attempts.forEach((attempt) => {
          if (attempt.basePath === "Home to 1st") {
            homeToFirstTimes.push(attempt.time);
          } else if (attempt.basePath === "Home to 2nd") {
            homeToSecondTimes.push(attempt.time);
          }
        });
      });

      const avgHomeToFirst = homeToFirstTimes.length > 0
        ? (homeToFirstTimes.reduce((sum, time) => sum + time, 0) / homeToFirstTimes.length).toFixed(2)
        : "N/A";

      const avgHomeToSecond = homeToSecondTimes.length > 0
        ? (homeToSecondTimes.reduce((sum, time) => sum + time, 0) / homeToSecondTimes.length).toFixed(2)
        : "N/A";

      updateBaseRunningCard(avgHomeToFirst, avgHomeToSecond);
    }, (error) => {
      console.error("Error in base running listener:", error);
    });
};

// Update base running card with loading indicators
const updateBaseRunningCard = (homeToFirst, homeToSecond) => {
  showCardLoading('base-running-card');
  
  setTimeout(() => {
    document.getElementById("home-to-1st").textContent = homeToFirst !== "N/A" ? `${homeToFirst} sec` : "N/A";
    document.getElementById("home-to-2nd").textContent = homeToSecond !== "N/A" ? `${homeToSecond} sec` : "N/A";
    hideCardLoading('base-running-card');
  }, 300);
};

// Event delegation: Listen for clicks on the card container
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', (event) => {
    const cardId = card.getAttribute('data-card-id');  // Get the card's ID
    window.location.href = `graphs.html?cardId=${cardId}`;  // Navigate with query parameter
  });
});