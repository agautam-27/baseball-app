const auth = firebase.auth();
const firestore = firebase.firestore();

auth.onAuthStateChanged((user) => {
  if (user) {
    fetchPlayerData(user);
  } else {
    console.log("No authenticated user. Please log in.");
  }
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

      displayWelcomeMessage(firstName, lastName, currentTryout, playerTryoutID);
      fetchTryouts(currentTryout);
      fetchHittingStats(playerID);
      fetchPitchingStats(playerID);
      fetchFieldingFlyStats(playerID); 
      fetchFieldingGroundStats(playerID); 
      fetchBaseRunningStats(playerID);
    } else {
      console.error("Player document does not exist");
    }
  } catch (error) {
    console.error("Error fetching player data:", error);
  }
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
            Your next tryout: ${currentTryout}<br>
            Your tryout ID: ${playerTryoutID}<br>
            Tryout Name: ${tryoutData.name}<br>
            Tryout Date: ${tryoutData.date}
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

viewTryoutsBtn.addEventListener("click", async () => {
  tryoutsContainer.innerHTML = "";

  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated.");
    return;
  }

  const playerDocRef = firestore.collection("users").doc(user.uid);
  const playerDocSnap = await playerDocRef.get();
  const currentTryout = playerDocSnap.exists ? playerDocSnap.data().currentTryout : null;

  fetchTryouts(currentTryout);
  tryoutList.classList.toggle("hidden");

  // Toggle button text
  if (tryoutList.classList.contains("hidden")) {
    viewTryoutsBtn.textContent = "View Current Tryouts";
  } else {
    viewTryoutsBtn.textContent = "Hide Current Tryouts";
  }
});


const fetchTryouts = async (currentTryout) => {
  tryoutsContainer.innerHTML = "";

  const querySnapshot = await firestore.collection("tryouts").orderBy("date", "asc").get();

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
      alert("You are already in a tryout. You cannot join another.");
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

    document.querySelectorAll(".join-tryout-btn").forEach((btn) => {
      btn.disabled = true;
    });

    alert(`You have successfully joined Tryout: ${tryoutID}`);
    fetchPlayerData(user);
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

    alert("You have successfully canceled your tryout.");
    fetchPlayerData(user);
  } catch (error) {
    console.error("Error canceling tryout:", error);
  }
};


const fetchHittingStats = async (playerID) => {
  if (!playerID) {
    console.error("No playerID found for the user.");
    return;
  }

  try {
    const hittingCollection = await firestore.collection("hitting").where("playerID", "==", playerID).get();

    let totalHits = 0;
    let totalStrikes = 0;

    hittingCollection.forEach((doc) => {
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
  } catch (error) {
    console.error("Error fetching hitting stats:", error);
  }
};

const updateHittingCard = (hits, strikes) => {
  document.getElementById("hitting-hits").textContent = hits;
  document.getElementById("hitting-strikes").textContent = strikes;
};

const fetchPitchingStats = async (playerID) => {
  if (!playerID) {
    console.error("No playerID found for the user.");
    return;
  }

  try {
    const pitchingCollection = await firestore.collection("pitching").where("playerID", "==", playerID).get();

    let totalPitches = 0;
    let totalStrikes = 0;
    let totalBalls = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    pitchingCollection.forEach((doc) => {
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
  } catch (error) {
    console.error("Error fetching pitching stats:", error);
  }
};

const updatePitchingCard = (pitches, strikes, balls, avgSpeed) => {
  document.getElementById("num-pitches").textContent = pitches;
  document.getElementById("num-strikes").textContent = strikes;
  document.getElementById("num-balls").textContent = balls;
  document.getElementById("avg-speed").textContent = avgSpeed !== "N/A" ? `${avgSpeed} km/h` : "N/A";
};


const fetchFieldingFlyStats = async (playerID) => {
  if (!playerID) {
    console.error("No playerID found for the user.");
    return;
  }

  try {
    // Query FieldingFlyBall collection for documents where playerID matches
    const fieldingFlyCollection = await firestore
      .collection("FieldingFlyBall")
      .where("playerID", "==", playerID)
      .get();

    let totalCatches = 0;
    let totalMisses = 0;

    // Loop through the documents
    fieldingFlyCollection.forEach((doc) => {
      const fieldingData = doc.data();
      const attempts = fieldingData.attempts || [];

      // Count catches and misses
      attempts.forEach((attempt) => {
        if (attempt.CatchOrMiss === "Catches") {
          totalCatches++;
        } else if (attempt.CatchOrMiss === "Missed") {
          totalMisses++;
        }
      });
    });

    updateFieldingFlyCard(totalCatches, totalMisses);
  } catch (error) {
    console.error("Error fetching Fielding (Fly Balls) stats:", error);
  }
};

// Function to update the Fielding (Fly Balls) card
const updateFieldingFlyCard = (catches, misses) => {
  document.getElementById("fly-balls-catches").textContent = ` ${catches}`;
  document.getElementById("fly-balls-misses").textContent = ` ${misses}`;

};

const fetchFieldingGroundStats = async (playerID) => {
  if (!playerID) {
    console.error("No playerID found for the user.");
    return;
  }

  try {
    const groundBallCollection = await firestore.collection("FieldingGroundBall").where("playerID", "==", playerID).get();

    let totalCatches = 0;
    let totalMisses = 0;

    groundBallCollection.forEach((doc) => {
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
  } catch (error) {
    console.error("Error fetching Fielding (Ground Balls) stats:", error);
  }
};

const updateFieldingGroundCard = (catches, misses) => {
  document.getElementById("ground-balls-catches").textContent = catches;
  document.getElementById("ground-balls-misses").textContent = misses;
};

const fetchBaseRunningStats = async (playerID) => {
  if (!playerID) {
    console.error("No playerID found for the user.");
    return;
  }

  try {
    const baseRunningSnapshot = await firestore.collection("baseRunning")
      .where("playerID", "==", playerID)
      .get();

    let homeToFirstTimes = [];
    let homeToSecondTimes = [];

    baseRunningSnapshot.forEach((doc) => {
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
  } catch (error) {
    console.error("Error fetching base running stats:", error);
  }
};

const updateBaseRunningCard = (homeToFirst, homeToSecond) => {
  document.getElementById("home-to-1st").textContent = homeToFirst !== "N/A" ? `${homeToFirst} sec` : "N/A";
  document.getElementById("home-to-2nd").textContent = homeToSecond !== "N/A" ? `${homeToSecond} sec` : "N/A";
};




//code for graphing page

// const cards = document.querySelectorAll('.card');

// cards.forEach(card => {
//     card.addEventListener('click', (e) => {
//         const cardId = e.target.getAttribute('data-card-id');
//         window.location.href = `../pages/graphs.html?cardId=${cardId}`;  // Pass the cardId as a query parameter
//     });
// });



// Event delegation: Listen for clicks on the card container
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', (event) => {
    console.log(event.target)
    const cardId = card.getAttribute('data-card-id');  // Get the card's ID
    window.location.href = `graphs.html?cardId=${cardId}`;  // Navigate with query parameter
  });
});


