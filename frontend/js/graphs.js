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

const canvas = document.getElementById("statsChart");
const ctx = canvas.getContext("2d");
// console.log("ctx: ", ctx)
const canvas2 = document.getElementById("statsChart2");
const ctx2 = canvas2.getContext("2d");

const fetchPlayerData = async (user) => {
    try {
        const playerDocRef = firestore.collection("users").doc(user.uid);
        const playerDocSnap = await playerDocRef.get();

        if (playerDocSnap.exists) {
            const playerData = playerDocSnap.data();
            playerID = playerData.playerID || "N/A"; // Default to "N/A" if missing

            const cardId = getQueryParam('cardId') ? getQueryParam('cardId') : "1";
            console.log('Clicked Card ID:', cardId);

            switch (cardId) {
                case '1':
                    fetchData("pitching", 1);
                    document.querySelector("#graph-title").innerHTML = "Pitching Speed"
                    document.querySelector("#graph-title2").innerHTML = "Distribution of Your Pitching Zones"
                    break;
                case '2':
                    fetchData("hitting", 2);
                    document.querySelector("#graph-title").innerHTML = "Hitting Percentage"
                    document.querySelector("#graph-title2").innerHTML = "Distribution of Your Hits"

                    break;
                case '3':
                    fetchData("baseRunning", 3);
                    document.querySelector("#graph-title").innerHTML = "Base Running Time (Home to 1st)"
                    document.querySelector("#graph-title2").innerHTML = "Base Running Time (Home to 2nd)"
                    break;
                case '4':
                    fetchData("FieldingFlyBall", 4);
                    document.querySelector("#graph-title").innerHTML = "FlyBall Catching Percentage"
                    document.querySelector("#graph-title2").innerHTML = "Distribution of Your Catches"

                    break;
                case '5':
                    fetchData("FieldingGroundBall", 5);
                    document.querySelector("#graph-title").innerHTML = "GroundBall Catching Percentage"
                    document.querySelector("#graph-title2").innerHTML = "Distribution of Your Catches"

                    break;
                default:
                    break;
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


const fetchData = async (page, type) => {
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
        console.log(attempts)
        // console.log(allAttempts)

        let processedData = processData(allAttempts, type)
        console.log(processedData)

        const processedPlayerData = processData(attempts, type)
        console.log(processedPlayerData)

        //Each page is processed differently because they graph different things
        let modifier, average, sum, total, allData, dist;
        switch (type) {
            case 1:
                processedData = processedData.map((x) => x.total ? (Math.round((x.count / x.total) * 10) / 10) : 0);
                console.log(processedData)
                sum = processedPlayerData.reduce((acc, curr) => acc + curr.count, 0);
                total = processedPlayerData.reduce((acc, curr) => acc + curr.total, 0);  // Sum of all elements
                average = Math.round((sum / total) * 10) / 10;
                modifier = { binAmount: 5, unit: "Speed (km/h)" }

                dist = {};
                // Flatten the array of arrays into a single array
                allData = attempts.flat();
                console.log(allData)

                for(i = 1; i <= 14; i++){
                    dist[i] = 0;
                }

                // Count occurrences of each position
                allData.forEach(play => {
                    const zone = play.pitchingZone; // Extract position
                    if (zone) {
                        dist[zone] = (dist[zone] || 0) + 1;
                    }
                });

                Object.keys(dist).forEach(x => {
                    dist[x] = Math.round((dist[x] / allData.length) * 100 * 10) / 10; // Rounded to 1 decimal place
                });

                console.log(dist)
                // initializeSecondaryChart(dist, modifier)
                initializeGrid(dist);


                break;
            case 2:
                // * 100 to convert to a percentage, Round(x*10)/10 to round to 1 decimal place
                processedData = processedData.map((x) => x.total ? (Math.round((x.count / x.total) * 100 * 10) / 10) : 0);
                console.log(processedData)
                sum = processedPlayerData.reduce((acc, curr) => acc + curr.count, 0);
                total = processedPlayerData.reduce((acc, curr) => acc + curr.total, 0);  // Sum of all elements
                average = Math.round((sum / total) * 100 * 10) / 10;
                modifier = { binAmount: 5, unit: "Percentage (%)" }

                dist = {};
                // Flatten the array of arrays into a single array
                allData = attempts.flat();
                console.log(allData)
                // Count occurrences of each position

                dist["Outfield Left"] = 0;
                dist["Outfield Center"] = 0;
                dist["Outfield Right"] = 0;
                dist["Infield Left"] = 0;
                dist["Infield Center"] = 0;
                dist["Infield Right"] = 0;
                dist["Foul Left"] = 0;
                dist["Foul Right"] = 0;

                allData.forEach(play => {
                    const position = play.hitZone; // Extract position
                    if (position) {
                        dist[position] = (dist[position] || 0) + 1;
                    }
                });

                Object.keys(dist).forEach(x => {
                    dist[x] = Math.round((dist[x] / allData.length) * 100 * 10) / 10; // Rounded to 1 decimal place
                });

                console.log(dist)
                initializeField(dist)
                break;
            case 3:
                processedData2 = processedData.map((x) => x.total2 ? (Math.round((x.count2 / x.total2) * 10) / 10) : null);
                console.log(processedData2)

                processedData = processedData.map((x) => x.total ? (Math.round((x.count / x.total) * 10) / 10) : null);
                console.log(processedData)
                sum = processedPlayerData.reduce((acc, curr) => acc + curr.count, 0);
                total = processedPlayerData.reduce((acc, curr) => acc + curr.total, 0);  // Sum of all elements
                average = Math.round((sum / total) * 10) / 10;


                sum2 = processedPlayerData.reduce((acc, curr) => acc + curr.count2, 0);
                total2 = processedPlayerData.reduce((acc, curr) => acc + curr.total2, 0);  // Sum of all elements
                average2 = Math.round((sum2 / total2) * 10) / 10;
                modifier = { binAmount: 0.5, unit: "Time (s)" }


                initializeChart(processedData2, average2, modifier, ctx2)

                break;
            case 4:
                processedData = processedData.map((x) => x.total ? (Math.round((x.count / x.total) * 100 * 10) / 10) : 0);
                console.log(processedData)
                sum = processedPlayerData.reduce((acc, curr) => acc + curr.count, 0);
                total = processedPlayerData.reduce((acc, curr) => acc + curr.total, 0);  // Sum of all elements
                average = Math.round((sum / total) * 100 * 10) / 10;
                modifier = { binAmount: 5, unit: "Percentage (%)" }

                dist = {};
                // Flatten the array of arrays into a single array
                allData = attempts.flat();
                console.log(allData)
                // Count occurrences of each position
                allData.forEach(play => {
                    const type = play.catchType; // Extract position
                    if (type) {
                        dist[type] = (dist[type] || 0) + 1;
                    }
                });

                Object.keys(dist).forEach(x => {
                    dist[x] = Math.round((dist[x] / allData.length) * 100 * 10) / 10; // Rounded to 1 decimal place
                });

                initializeSecondaryChart(dist, modifier)

                break;
            case 5:
                processedData = processedData.map((x) => x.total ? (Math.round((x.count / x.total) * 100 * 10) / 10) : 0);
                console.log(processedData)
                sum = processedPlayerData.reduce((acc, curr) => acc + curr.count, 0);
                total = processedPlayerData.reduce((acc, curr) => acc + curr.total, 0);  // Sum of all elements
                average = Math.round((sum / total) * 100 * 10) / 10;
                modifier = { binAmount: 5, unit: "Percentage (%)" }

                dist = {};
                // Flatten the array of arrays into a single array
                allData = attempts.flat();
                console.log(allData)
                // Count occurrences of each position
                allData.forEach(play => {
                    const type = play.catchType; // Extract position
                    if (type) {
                        dist[type] = (dist[type] || 0) + 1;
                    }
                });

                Object.keys(dist).forEach(x => {
                    dist[x] = Math.round((dist[x] / allData.length) * 100 * 10) / 10; // Rounded to 1 decimal place
                });

                initializeSecondaryChart(dist, modifier)

                break;
            default:
                break;
        }
        // console.log(average) 
        if (average) { processedData.push(average) }

        initializeChart(processedData, average, modifier, ctx)

    }
};

function processData(data, type) {

    switch (type) {
        case 1:
            return data.map(session => {
                const sumSpeed = session.reduce((sum, play) => {
                    return sum + play.speed;
                }, 0);
                const total = session.length;
                return { count: sumSpeed, total: total };
            });
        case 2:
            return data.map(session => {
                const total = session.length;
                const numHits = session.filter(play => play.result === 'Hit').length;
                return { count: numHits, total: total };
            });
        case 3:
            return data.map(session => {

                const sumTime = session.reduce((sum, play) => {
                    return play.basePath === 'Home to 1st' ? sum + play.time : sum;
                }, 0);
                const sumTime2 = session.reduce((sum, play) => {
                    return play.basePath === 'Home to 2nd' ? sum + play.time : sum;
                }, 0);
                const Hometo1st = session.filter(play => play.basePath === 'Home to 1st').length;
                const Hometo2nd = session.filter(play => play.basePath === 'Home to 2nd').length;

                return { count: sumTime, total: Hometo1st, count2: sumTime2, total2: Hometo2nd };
            });
        case 4:
            return data.map(session => {
                const total = session.length;
                const count = session.filter(play => play.CatchOrMiss === 'Catches').length;
                return { count: count, total: total };
            });

        case 5:
            return data.map(session => {
                const total = session.length;
                const count = session.filter(play => play.CatchOrMiss === 'Catches').length;
                return { count: count, total: total };
            });

        default:
            break;
    }


}

// Function to bin data into groups
function binData(data, binSize) {
    console.log("data: ",data)
    data = data.filter(item => item !== null);
    console.log("data: ",data)

    // for(let record in data){
    //     if(record == null){
    //         record.destroy
    //     }
    // }
    const minAttempt = Math.min(...data) - binSize;
    const maxAttempt = Math.max(...data) + binSize;
    console.log(minAttempt)

    const bins = [];
    for (let i = minAttempt; i <= maxAttempt; i += binSize) {
        bins.push({ x: Math.round(i * 10) / 10, y: null });
    }

    data.forEach(item => {
        if (item != null) {
            const binIndex = Math.round((item - minAttempt) / binSize);
            // console.log(binIndex)
            if (bins[binIndex]) {
                bins[binIndex].y += 1;
            }
        }
    });

    return bins;
}



function initializeChart(playerData, x, modifier, thisCTX) {

    // Generate initial dataset
    const chartData = binData(playerData, modifier.binAmount);
    // console.log(chartData)

    // Find the y-value for the threshold line at x=50 (or any other value you choose)
    const thresholdX = x;
    let thresholdY = 0;

    // Find the bin closest to x=50
    const closestBin = chartData.find(point => (point.x === thresholdX));

    if (closestBin) {
        thresholdY = closestBin.y;
    } else {
        // If there's no bin exactly at 50, we can pick the closest bin (either before or after)
        const closestPoint = chartData.reduce((prev, curr) => {
            return Math.abs((curr.x - thresholdX) < Math.abs(prev.x - thresholdX) && curr.y != null) ? curr : prev;
        });
        // console.log("closest: " + JSON.stringify(closestPoint))
        thresholdY = closestPoint.y;
    }

    console.log("x: " + thresholdX)
    console.log("y: " + thresholdY)

    console.log(chartData)
    const minX = Math.min(...chartData.map(point => point.x)) - modifier.binAmount;
    const maxX = Math.max(...chartData.map(point => point.x)) + modifier.binAmount;
    console.log(minX)
    const labels = [];
    const binSize = 0.1
    for (let i = minX; i <= maxX; i += binSize) {
        labels.push(Math.round(i * 10) / 10);
    }
    // console.log(labels)

    // Prepare Chart.js data
    const data = {
        labels: labels,
        datasets: [
            {
                label: "Tryout Data",
                data: labels.map(x => {
                    const bin = chartData.find(point => point.x === x);
                    return bin ? bin.y : null;
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
    const options = {
        responsive: false,
        maintainAspectRatio: true,
        layout: {
            padding: {  }, // Reduce space on the sides
        },
        plugins: {
            // legend: { display: false, },
        },
        scales: {
            x: { title: { display: true, text: modifier.unit } },
            y: { title: { display: true, text: "Number of players" } },
        },
    };

    // Create Chart.js chart
    window.myChart = new Chart(thisCTX, {
        type: "line",
        data: data,
        options: options,
    });
    // console.log("b");
}



function initializeSecondaryChart(playerData, modifier) {
    if (window.myChart2) {
        window.myChart2.destroy();
    }

    console.log(playerData)
    // Generate initial dataset
    // const chartData = playerData;

    // Prepare Chart.js data
    const data2 = {
        // labels: labels,
        datasets: [
            {
                label: "Tryout Data",
                data: playerData,
                borderColor: "lightgreen",
                backgroundColor: "rgba(144, 238, 144, 0.2)",
                borderWidth: 2,
                tension: 0.5, // Smooth curve
                fill: true,
                spanGaps: true,
            },
        ],
    };

    // Chart options
    const options2 = {
        responsive: false,
        maintainAspectRatio: false,
        layout: {
            //weird but misaligns if we add left: 20
            padding: { right: 20 }, // Reduce space on the sides
        },
        plugins: {
            legend: { display: false, },
        },
        scales: {
            x: { title: { display: true, text: "" } },
            y: { title: { display: true, text: "Percentage (%)" } },
        },
    };

    // Create Chart.js chart
    window.myChart2 = new Chart(ctx2, {
        type: "bar",
        data: data2,
        options: options2,
    });
    // console.log("b");
}


function initializeGrid(data){
    const grid = document.getElementById("gridContainer")
    grid.style.display = "flex"
    const canvas = document.getElementById("statsChart2")
    canvas.style.display = "none"

    
   for(let zone in data) {
        console.log(zone)
        const setZone = document.querySelector(`#zone${zone}`);
        if (setZone) {
            setZone.innerHTML = data[zone] + "%";
            setZone.parentElement.style.backgroundColor = getGreenShade(data[zone])
        }
    };

    const leftTop = document.querySelector(".left-top");
    leftTop.style.backgroundColor = getGreenShade(data[11])
    const leftBot = document.querySelector(".left-bottom");
    leftBot.style.backgroundColor = getGreenShade(data[13])
    const rightTop = document.querySelector(".right-top");
    rightTop.style.backgroundColor = getGreenShade(data[12])
    const rightBot = document.querySelector(".right-bottom");
    rightBot.style.backgroundColor = getGreenShade(data[14])
}

function getGreenShade(percent) {
    // Clamp percentage
    percent = Math.max(0, Math.min(100, percent));

    // Define start (light) and end (dark) RGB values
    const startColor = { r: 232, g: 245, b: 233 }; // #E8F5E9
    const endColor   = { r: 27,  g: 94,  b: 32 };  // #1B5E20

    // Linearly interpolate each RGB channel
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * (percent / 100));
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * (percent / 100));
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * (percent / 100));

    return `rgb(${r}, ${g}, ${b})`;
}


function initializeField(data){
    const grid = document.getElementById("hit-zone-image-container")
    grid.style.display = "flex"
    const canvas = document.getElementById("statsChart2")
    canvas.style.display = "none"

    
   for(let zone in data) {
        console.log(zone)
        const setZone = document.querySelector(`[data-zone="${zone}"]`);
        if (setZone) {
            setZone.innerHTML = data[zone] + "%";
        }
    };
}