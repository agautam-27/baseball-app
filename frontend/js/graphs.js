const auth = firebase.auth();
const firestore = firebase.firestore();
let playerdata;

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
            playerID = playerData.playerID || "N/A"; // Default to "N/A" if missing

            const cardId = getQueryParam('cardId');
            console.log('Clicked Card ID:', cardId);

            switch (cardId) {
                case '1':
                    fetchData("pitching");
                    document.querySelector("#graph-title").innerHTML = "Hitting Percentage"
                    break;
                case '2':
                    fetchData("hitting");
                    document.querySelector("#graph-title").innerHTML = "Hitting Percentage"
                    break;
                case "3":
                    fetchData("baseRunning");
                    document.querySelector("#graph-title").innerHTML = "Hitting Percentage"
                    break;
                case "4":
                    fetchData("fielding");
                    document.querySelector("#graph-title").innerHTML = "Hitting Percentage"
                    break;
                case "5":
                    fetchData("fielding");
                    document.querySelector("#graph-title").innerHTML = "Hitting Percentage"
                    break;
                default:



            }
            


        } else {
            console.error("Player document does not exist");
        }
    } catch (error) {
        console.error("Error fetching player data:", error);
    }
};

// Function to get query parameter from the URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);  // Get the value of 'cardId'
}


const fetchData = async (page) => {
    // tryoutsContainer.innerHTML = "";

    let attempts = [];
    let allAttempts = [];
    const querySnapshot = await firestore.collection(page).get();

    if (querySnapshot.empty) {
        document.querySelector("#error-msg").innerHTML = "<p>No data available.</p>";
    } else {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // console.log("data: " + JSON.stringify(data));
            const dataID = doc.id;
            // console.log("dataID: " + dataID)

            if (data.playerID === playerID) {
                attempts.push(data.attempts)
            }
            allAttempts.push(data.attempts)
        });
        console.log(allAttempts)

        const processedData = processData(allAttempts)
        console.log(processedData)

        const processedPlayerData = processData(attempts)
        console.log(processedPlayerData)
        const sum = processedPlayerData.reduce((acc, curr) => acc + curr, 0);  // Sum of all elements
        const average = sum / processedPlayerData.length;
        console.log(average)

        initializeChart(processedData, average) 


    }
};

function processData(attempts) {
    return attempts.map(attempt => {
        const totalHits = attempt.length;
        const hitCount = attempt.filter(play => play.result === 'Hit').length;
        return Math.round((hitCount / totalHits) * 100 * 10) / 10;
        
    });
}

const canvas = document.getElementById("statsChart");
const ctx = canvas.getContext("2d");
let options;
let data;

// Generate 31 random data points
const DATA = Array.from({ length: 31 }, (_, i) => ({
    Day: i,
    maxTemp: 40 + 30 * Math.random(),
}));

// const DATA2 = Array.from({ length: 31 }, (_, i) => ({
//     Day: i,
//     maxTemp: 40 + 30 * Math.random(),
// }));

// Function to bin data into groups of 5
function binData(data, binSize) {
    const minAttempt = Math.min(...data);
    const maxAttempt = Math.max(...data);

    const bins = [];
    for (let i = minAttempt; i <= maxAttempt; i += binSize) {
        bins.push({ x: Math.floor(i), y: 0 });
    }

    data.forEach(item => {
        const binIndex = Math.floor((item - minAttempt) / binSize);
        // console.log(binIndex)
        if (bins[binIndex]) {
            bins[binIndex].y += 1;
        }
    });

    return bins;
}


// window.onload = function () {
//     // console.log("a");
//     initializeChart(DATA);
// };

function initializeChart(data, x) {
    if (window.myChart) {
        window.myChart.destroy();
    }
    // Generate initial dataset
    const chartData = binData(data, 5);

    // Find the y-value for the threshold line at x=50 (or any other value you choose)
    const thresholdX = x;
    console.log(thresholdX)
    let thresholdY = 0;

    // Find the bin closest to x=50
    const closestBin = chartData.find(point => point.x === thresholdX);

    if (closestBin) {
        thresholdY = closestBin.y;
    } else {
        // If there's no bin exactly at 50, we can pick the closest bin (either before or after)
        const closestPoint = chartData.reduce((prev, curr) => {
            return Math.abs(curr.x - thresholdX) < Math.abs(prev.x - thresholdX) ? curr : prev;
        });
        // console.log("closest: " + JSON.stringify(closestPoint))
        thresholdY = closestPoint.y;
    }

    // console.log("x: " + thresholdX)
    console.log(chartData)
    const minX = Math.min(...chartData.map(point => point.x)) - 5;
    const maxX = Math.max(...chartData.map(point => point.x));
    const labels = [];
    const binSize = 0.1
    for (let i = minX; i <= maxX; i += binSize) {
        labels.push(Math.round(i * 10) / 10);
    }
    // console.log(labels)

    // Prepare Chart.js data
    data = {
        labels: labels,
        datasets: [
            {
                label: "Tryout Data",
                data: labels.map(x => {
                    const bin = chartData.find(point => point.x === x);
                    return bin ? bin.y : null;  // Use 0 if no bin exists for the x value
                }),
                borderColor: "lightgreen",
                backgroundColor: "rgba(144, 238, 144, 0.2)",
                borderWidth: 2,
                tension: 0.5, // Smooth curve
                fill: true,
                spanGaps: true,
            },
            {
                label: `Your average: ${thresholdX}`,
                data: [
                    { x: thresholdX, y: 0 }, // Bottom of the chart at x = 50
                    { x: thresholdX, y: thresholdY }, // Top of the chart at x = 50, aligned with line graph
                ],
                borderColor: "red",
                borderWidth: 2,
                pointRadius: 0, // Hide points
                fill: false, // Do not fill area
                tension: 0, // No smooth curve for the threshold line
            },
        ],
    };

    // Chart options
    options = {
        responsive: true,
        maintainAspectRatio: true,
        layout: {
            padding: { left: 20, right: 20 }, // Reduce space on the sides
        },
        plugins: {
            // legend: { display: false, },
        },
        scales: {
            x: { title: { display: true, text: "" } },
            y: { title: { display: false, text: "" }, display: false },
        },
    };

    // Create Chart.js chart
    window.myChart = new Chart(ctx, {
        type: "line",
        data: data,
        options: options,
    });
    // console.log("b");
}

