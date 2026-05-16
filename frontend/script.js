document.addEventListener('DOMContentLoaded', () => {
    // Robust API URL mapping for both localhost and Render production
    const API_URL = window.location.origin;
    
    // Load from LocalStorage or start fresh if empty
    let predictionLogs = JSON.parse(localStorage.getItem('m5_prediction_history')) || []; 
    
    // Theme Colors
    const PURPLE = '#a855f7';
    const PURPLE_LIGHT = '#d8b4fe';
    const GRAY = '#3f3f46';
    const TEXT_SEC = '#a1a1aa';

    let accChartInst, pieChartInst, volChartInst, latChartInst;
    let seasonChartInst, priceChartInst, stockChartInst;

    Chart.defaults.color = TEXT_SEC;
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';

    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText.replace('%', '');
            const increment = target / 100; // Adjust speed

            if (count < target) {
                let current = count + increment;
                if (target === 59.8) {
                    counter.innerText = current.toFixed(1) + '%';
                } else {
                    counter.innerText = current.toFixed(4);
                }
                setTimeout(updateCount, 15);
            } else {
                counter.innerText = target === 59.8 ? target + '%' : target;
            }
        };
        updateCount();
    });

    function initCharts() {
        const ctxAcc = document.getElementById('accuracyChart').getContext('2d');
        accChartInst = new Chart(ctxAcc, {
            type: 'bar',
            data: {
                labels: ['FOODS_1_001', 'FOODS_1_002', 'FOODS_1_003', 'FOODS_1_004'],
                datasets: [
                    { label: 'Actual Sales', data: [23, 20, 20, 95], backgroundColor: GRAY, borderRadius: 4 },
                    { label: 'AI Forecast', data: [26, 15, 22, 110], backgroundColor: PURPLE, borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const ctxPie = document.getElementById('demandPieChart').getContext('2d');
        pieChartInst = new Chart(ctxPie, {
            type: 'doughnut',
            data: { labels: ['Low', 'Moderate', 'High'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#3b82f6', '#fbbf24', PURPLE], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
        });

        const ctxVol = document.getElementById('volumeChart').getContext('2d');
        volChartInst = new Chart(ctxVol, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Live Inference', data: [], borderColor: PURPLE, backgroundColor: 'rgba(168, 85, 247, 0.15)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const ctxLat = document.getElementById('latencyChart').getContext('2d');
        latChartInst = new Chart(ctxLat, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Response Time (ms)', data: [], borderColor: '#fbbf24', borderDash: [5, 5], tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const ctxSeas = document.getElementById('seasonalityChart').getContext('2d');
        seasonChartInst = new Chart(ctxSeas, {
            type: 'bar', 
            data: { 
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
                datasets: [{ 
                    label: 'Sales Heat Index', 
                    data: [1.0, 0.9, 0.9, 0.95, 1.2, 1.5, 1.4], 
                    backgroundColor: ['#6b21a8', '#4c1d95', '#4c1d95', '#5b21b6', '#9333ea', '#d8b4fe', '#c084fc'], 
                    borderRadius: 4 
                }] 
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } }
            }
        });

        const ctxPrice = document.getElementById('priceImpactChart').getContext('2d');
        priceChartInst = new Chart(ctxPrice, {
            type: 'scatter',
            data: { 
                datasets: [{ 
                    label: 'Elasticity Curve', 
                    data: [{x:1,y:10},{x:1.5,y:9},{x:2,y:8},{x:2.5,y:7},{x:3,y:6},{x:4,y:3},{x:5,y:1}], 
                    backgroundColor: PURPLE_LIGHT, 
                    borderColor: '#fff', 
                    borderWidth: 1,
                    pointRadius: 6, 
                    pointHoverRadius: 8
                }] 
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    x: { title: { display: true, text: 'Selling Price ($)' }, grid: { color: 'rgba(255,255,255,0.05)' } }, 
                    y: { title: { display: true, text: 'Sales Volume' }, grid: { color: 'rgba(255,255,255,0.05)' } } 
                } 
            }
        });

        const ctxStock = document.getElementById('stockoutChart').getContext('2d');
        stockChartInst = new Chart(ctxStock, {
            type: 'bar',
            data: { labels: ['CA_1', 'TX_2', 'WI_3'], datasets: [{ label: 'Historical Stockout Days', data: [120, 85, 210], backgroundColor: GRAY, borderRadius: 4 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
    }
    
    initCharts();
    updateDashboardUI(); 

    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
            document.getElementById(link.getAttribute('data-target')).classList.remove('hidden');
        });
    });

    document.getElementById('btn-predict').addEventListener('click', async () => {
        const storeId = document.getElementById('store-id').value;
        const itemId = document.getElementById('item-id').value;
        
        document.getElementById('prediction-output').classList.add('hidden');
        document.getElementById('loader').classList.remove('hidden');

        try {
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ store_id: storeId, item_id: itemId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail);

            const rawVal = parseFloat(data.predicted_sales);
            const roundedVal = Math.ceil(rawVal);
            const latency = parseFloat(data.latency_ms);
            
            let dClass = "bg-low", dText = "Low Demand";
            if(rawVal > 5) { dClass = "bg-high"; dText = "High Demand"; }
            else if(rawVal >= 1) { dClass = "bg-mod"; dText = "Moderate"; }

            document.getElementById('pred-value').innerText = rawVal.toFixed(2);
            document.getElementById('pred-rounded').innerText = roundedVal;
            document.getElementById('pred-latency').innerText = latency;

            predictionLogs.push({ 
                time: new Date().toLocaleTimeString(), 
                store: storeId, 
                item: itemId, 
                raw: rawVal.toFixed(2), 
                rounded: roundedVal, 
                latency: latency, 
                dClass: dClass, 
                dText: dText 
            });

            localStorage.setItem('m5_prediction_history', JSON.stringify(predictionLogs));
            updateDashboardUI();

        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('prediction-output').classList.remove('hidden');
        }
    });

    function updateDashboardUI() {
        if (predictionLogs.length === 0) return; 

        document.getElementById('total-preds').innerText = predictionLogs.length;

        const tbody = document.getElementById('history-tbody');
        tbody.innerHTML = '';
        
        let low = 0, mod = 0, high = 0;
        const recentLogs = [...predictionLogs].reverse().slice(0, 10);
        
        recentLogs.forEach(log => {
            if(log.dText.includes("Low")) low++;
            if(log.dText.includes("Moderate")) mod++;
            if(log.dText.includes("High")) high++;

            tbody.innerHTML += `<tr><td>${log.time}</td><td><strong>${log.store}</strong></td><td>${log.item}</td><td>${log.raw}</td><td><strong>${log.rounded}</strong></td><td><span class="badge ${log.dClass}">${log.dText}</span></td></tr>`;
        });

        pieChartInst.data.datasets[0].data = [low, mod, high];
        pieChartInst.update();

        volChartInst.data.labels = recentLogs.map(l => l.time).reverse();
        volChartInst.data.datasets[0].data = recentLogs.map(l => l.raw).reverse();
        volChartInst.update();

        latChartInst.data.labels = recentLogs.map(l => l.time).reverse();
        latChartInst.data.datasets[0].data = recentLogs.map(l => l.latency).reverse();
        latChartInst.update();
    }
});