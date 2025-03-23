const canvas = document.getElementById("statsChart");
const ctx = canvas.getContext("2d");
let options;
let data;

// Generate 31 random data points
const DATA = Array.from({ length: 31 }, (_, i) => ({
    Day: i,
    maxTemp: 40 + 30 * Math.random(),
}));

const DATA2 = Array.from({ length: 31 }, (_, i) => ({
    Day: i,
    maxTemp: 40 + 30 * Math.random(),
}));

// Function to bin data into groups of 5
function binData(data, binSize) {
    const minTemp = Math.min(...data.map(d => d.maxTemp)) - 5;
    const maxTemp = Math.max(...data.map(d => d.maxTemp)) + 5;

    const bins = [];
    for (let i = minTemp; i <= maxTemp; i += binSize) {
        bins.push({ x: Math.floor(i), y: 0 });
    }

    data.forEach(item => {
        const binIndex = Math.floor((item.maxTemp - minTemp) / binSize);
        if (bins[binIndex]) {
            bins[binIndex].y += 1;
        }
    });

    return bins;
}
const chartData = binData(DATA, 5);



window.onload = function () {
    // console.log("a");
    initializeChart();
};

function initializeChart() {
    if (window.myChart) {
        window.myChart.destroy();
    }
    // Generate initial dataset
    const chartData = binData(DATA, 5);

    // Find the y-value for the threshold line at x=50 (or any other value you choose)
    const thresholdX = 50;
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
    const minX = Math.min(...chartData.map(point => point.x)) -5;
    const maxX = Math.max(...chartData.map(point => point.x)) +5;
    const labels = [];
    for (let i = minX; i <= maxX; i++) {
        labels.push(i);
    }

    // Prepare Chart.js data
    data = {
        labels: labels,
        datasets: [
            {
                label: "Data",
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
                label: "Threshold Line",
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
            x: { title: { display: true, text: "Temperature Bins" } },
            y: { title: { display: true, text: "Frequency" } },
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

