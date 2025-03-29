const auth = firebase.auth();
const firestore = firebase.firestore();
let playerID;

auth.onAuthStateChanged((user) => {
    if (user) {
        playerID = parseInt(localStorage.getItem("selectedPlayerId"));
        // console.log(playerID)
        if (playerID) {
            document.querySelector("#welcome-text").innerHTML = `Tryout Stats for Player: ${playerID}`
            fetchPlayerData(playerID);

        }
    } else {
        console.log("No authenticated user. Please log in.");
    }
});




async function fetchPlayerData(playerID) {
    const testTypes = {
        "pitching": "pitching-list",
        "hitting": "hitting-list",
        "baseRunning": "base-running-list",
        "FieldingFlyBall": "flyball-list",
        "FieldingGroundBall": "groundball-list"
    };

    try {
        await Promise.all(Object.keys(testTypes).map(async (testType) => {
            const querySnapshot = await firestore.collection(testType).get();
            const listElement = document.getElementById(testTypes[testType]);

            if (!listElement) {
                console.warn(`Element with ID '${testTypes[testType]}' not found.`);
                return;
            }

            if (querySnapshot.empty) {
                listElement.innerHTML = `<p>No data available for ${testType}.</p>`;
            } else {
                let tableHTML = generateTableHeader(testType); // ✅ Add table header only once
                let attemptCounter = 1;
                let hasData = false; // ✅ Track if there’s at least one valid entry

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.playerID === playerID) {
                        const attemptsArray = Array.isArray(data.attempts) ? data.attempts : [data.attempts];

                        attemptsArray.forEach((attempt) => {
                            tableHTML += formatTableRow(testType, attempt, attemptCounter++);
                            hasData = true;
                        });
                    }
                });

                if (hasData) {
                    tableHTML += `</tbody></table>`;
                    listElement.innerHTML = tableHTML;
                } else {
                    listElement.innerHTML = `<p>No attempts recorded for ${testType}.</p>`;
                }
            }
        }));
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// ✅ Function to generate table headers (Only once per table)
function generateTableHeader(testType) {
    let headers;
    switch (testType) {
        case "pitching":
            headers = `<th>Attempt</th><th>Speed (mph)</th><th>Pitching Zone</th><th>Outcome</th>`;
            break;
        case "hitting":
            headers = `<th>Attempt</th><th>Result</th><th>Hit Type</th><th>Hit Zone</th>`;
            break;
        case "baseRunning":
            headers = `<th>Attempt</th><th>Time (sec)</th><th>Base Path</th>`;
            break;
        case "FieldingFlyBall":
        case "FieldingGroundBall":
            headers = `<th>Attempt</th><th>Catch Type</th><th>Catch or Miss</th>`;
            break;
        default:
            headers = `<th>Attempt</th><th>Data</th>`;
    }

    return `<table border="1" class="tryout-table"><thead><tr>${headers}</tr></thead><tbody>`;
}

// ✅ Function to format table rows
function formatTableRow(testType, attempt, attemptNumber) {
    switch (testType) {
        case "pitching":
            return `<tr>
                <td>${attemptNumber}</td>
                <td>${attempt.speed || "N/A"}</td>
                <td>${attempt.pitchingZone || "N/A"}</td>
                <td>${attempt.outcome || "N/A"}</td>
            </tr>`;

        case "hitting":
            return `<tr>
                <td>${attemptNumber}</td>
                <td>${attempt.result || "N/A"}</td>
                <td>${attempt.hitType || "N/A"}</td>
                <td>${attempt.hitZone || "N/A"}</td>
            </tr>`;

        case "baseRunning":
            return `<tr>
                <td>${attemptNumber}</td>
                <td>${attempt.time || "N/A"}</td>
                <td>${attempt.basePath || "N/A"}</td>
            </tr>`;

        case "FieldingFlyBall":
        case "FieldingGroundBall":
            return `<tr>
                <td>${attemptNumber}</td>
                <td>${attempt.catchType || "N/A"}</td>
                <td>${attempt.CatchOrMiss || "N/A"}</td>
            </tr>`;

        default:
            return `<tr><td>${attemptNumber}</td><td>Unknown Data</td></tr>`;
    }
}

// ✅ Run when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    fetchPlayerData(playerId);
});
