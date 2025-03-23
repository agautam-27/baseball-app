document.addEventListener("DOMContentLoaded", function() {
    loadAttempts();
});

function goBack() {
    window.history.back();
}

function addRow() {
    const attemptsDiv = document.getElementById("attempts");
    const attemptIndex = attemptsDiv.children.length;

    const row = document.createElement("div");
    row.className = "attempt-row";
    row.innerHTML = `
        <div class="radio-group">
            <label><input type="radio" name="attempt${attemptIndex}" value="Missed"> Missed</label>
            <label><input type="radio" name="attempt${attemptIndex}" value="Catches"> Catches</label>
        </div>
        <button class="delete-btn" onclick="removeRow(this)">X</button>
    `;

    attemptsDiv.appendChild(row);
}

function removeRow(button) {
    button.parentElement.remove();
}

function saveAll() {
    const attempts = [];
    document.querySelectorAll(".attempt-row").forEach((row, index) => {
        const selected = row.querySelector("input[type='radio']:checked");
        if (selected) {
            attempts.push({
                index: index,
                CatchOrMiss: selected.value
            });
        }
    });

    const notes = document.getElementById("notes").value;
    const data = {
        attempts: attempts,
        notes: notes
    };

    saveToFirestore(data);
}

function saveToFirestore(data) {
    const db = firebase.firestore();
    db.collection("FieldingFlyBall").doc("attempts").set(data)
        .then(() => alert("Data saved successfully!"))
        .catch(error => console.error("Error saving data:", error));
}
