const db = firebase.firestore();

document.getElementById('toggle-tryout-form').addEventListener('click', () => {
    const card = document.getElementById('tryout-form-card');
    const statusText = document.getElementById('tryout-status');
    const toggleBtn = document.getElementById('toggle-tryout-form');

    card.classList.toggle('hidden');
    toggleBtn.textContent = card.classList.contains('hidden') ? '➕' : '✖';

    if (!card.classList.contains('hidden')) {
        statusText.textContent = '';
        statusText.className = '';
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
  
          // Create tryout card
          const tryoutCard = document.createElement("div");
          tryoutCard.className = "tryout-card";
          tryoutCard.dataset.tryoutId = tryout.tryoutID;
  
          tryoutCard.innerHTML = `
            <div>
              <span>${tryout.name}</span>
              <p class="tryout-id">ID: ${tryout.tryoutID}</p>
              <p class="tryout-date">Date: ${tryout.date}</p>
              <button class="select-btn">Select</button>
            </div>
          `;
  
          tryoutList.appendChild(tryoutCard);
        });
  
        // Attach select button event listeners
        document.querySelectorAll(".select-btn").forEach(button => {
          button.addEventListener("click", (e) => {
            const card = e.target.closest(".tryout-card");
            const tryoutId = card.dataset.tryoutId;
  
            localStorage.setItem("selectedTryoutId", tryoutId);
            document.getElementById("station-popup").classList.remove("hidden");
          });
        });
      })
      .catch((error) => {
        console.error("Error loading tryouts:", error);
      });
  }


function attachTryoutCardListeners() {
    document.querySelectorAll(".select-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const tryoutId = button.closest(".tryout-card").dataset.tryoutId;
            localStorage.setItem("selectedTryoutId", tryoutId);
            const popup = document.getElementById("station-popup");
            popup.classList.remove("hidden");
            console.log("Station popup classes:", popup.classList);
        });
    });
}    
  

function selectTryout(tryoutID) {
    alert(`Tryout ${tryoutID} selected!`);

}

// Auto-load tryouts when the page opens
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        loadTryouts();
    }
});


document.getElementById("show-tryouts-btn").addEventListener("click", () => {
    const list = document.getElementById("tryout-list");
    const btn = document.getElementById("show-tryouts-btn");
  
    if (list.classList.contains("hidden")) {
      list.classList.remove("hidden");
      btn.textContent = "⬆️ Hide Tryouts";
      loadTryouts();
    } else {
      list.classList.add("hidden");
      btn.textContent = "📋 Show Tryouts";
    }
  });
  

// Handle station button clicks
document.querySelectorAll(".station-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const station = btn.dataset.station;
      window.location.href = `${station}.html`;
    });
  });
  
  // Close popup
  document.getElementById("close-popup").addEventListener("click", () => {
    document.getElementById("station-popup").classList.add("hidden");
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("station-popup").classList.add("hidden");
  });
  