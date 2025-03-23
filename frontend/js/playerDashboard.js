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
      const playerTryoutID = playerData.playerTryoutID || "N/A"; // Default to "N/A" if missing

      displayWelcomeMessage(firstName, lastName, currentTryout, playerTryoutID);
      fetchTryouts(currentTryout);
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


document.addEventListener("DOMContentLoaded", () => {
  populateDummyData();
});

function populateDummyData() {
  document.getElementById("num-pitches").textContent = "25";
  document.getElementById("num-strikes").textContent = "15";
  document.getElementById("num-balls").textContent = "10";
  document.getElementById("avg-speed").textContent = "85 mph";
  document.getElementById("pitching-notes").textContent = "Good control, needs work on breaking ball.";

  document.getElementById("hitting-strikes").textContent = "8";
  document.getElementById("hitting-hits").textContent = "5";
  document.getElementById("hitting-notes").textContent = "Improving contact with inside pitches.";

  document.getElementById("home-to-1st").textContent = "4.2s";
  document.getElementById("home-to-2nd").textContent = "7.8s";
  document.getElementById("base-running-notes").textContent = "Quick acceleration off the line.";

  document.getElementById("fly-balls-result").textContent = "3 catches, 1 miss";
  document.getElementById("fly-balls-notes").textContent = "Good reaction time.";

  document.getElementById("ground-balls-result").textContent = "5 clean plays, 1 error";
  document.getElementById("ground-balls-notes").textContent = "Needs quicker footwork.";
}



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








