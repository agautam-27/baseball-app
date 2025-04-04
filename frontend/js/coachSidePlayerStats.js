const auth = firebase.auth();
const firestore = firebase.firestore();
let playerdata;

auth.onAuthStateChanged((user) => {
    if (user) {
        localStorage.getItem("selectedPlayerId");
        fetchData(user);
    } else {
        console.log("No authenticated user. Please log in.");
    }
});


const fetchData = async (id) => {
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
            } else {
                allAttempts.push(data.attempts)
            }
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
                initializeSecondaryChart(dist, modifier)

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
                allData.forEach(play => {
                    const position = play.hitZone; // Extract position
                    if (position) {
                        dist[position] = (dist[position] || 0) + 1;
                    }
                });

                Object.keys(dist).forEach(x => {
                    dist[x] = Math.round((dist[x] / allData.length) * 100 * 10) / 10; // Rounded to 1 decimal place
                    const newKey = x.replace("Infield", "In").replace("Outfield", "Out");
                    dist[newKey] = dist[x];
                    delete dist[x];
                });

                console.log(dist)
                initializeSecondaryChart(dist, modifier)
                break;
            case 3:
                processedData2 = processedData.map((x) => x.total2 ? (Math.round((x.count2 / x.total2) * 10) / 10) : null);

                processedData = processedData.map((x) => x.total ? (Math.round((x.count / x.total) * 10) / 10) : null);
                console.log(processedData)
                sum = processedPlayerData.reduce((acc, curr) => acc + curr.count, 0);
                total = processedPlayerData.reduce((acc, curr) => acc + curr.total, 0);  // Sum of all elements
                average = Math.round((sum / total) * 10) / 10;


                sum2 = processedPlayerData.reduce((acc, curr) => acc + curr.count2, 0);
                total2 = processedPlayerData.reduce((acc, curr) => acc + curr.total2, 0);  // Sum of all elements
                average2 = Math.round((sum2 / total2) * 10) / 10;
                modifier = { binAmount: 0.1, unit: "Time (s)" }


                initializeChart(processedData, average2, modifier, ctx2)

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