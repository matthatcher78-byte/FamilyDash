// Your active Google Apps Script Web App URL
const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxwanSQRXH4ZFF7ynyS1wB8D3JESxSr6YTYWqiaXyTKY392LbNhDN1DPP1VSSghnXOnQw/exec'; 

document.addEventListener("DOMContentLoaded", () => {
    fetchDashboardData();
});

async function fetchDashboardData() {
    const dashboard = document.getElementById("dashboard-container");
    
    dashboard.innerHTML = "<div style='padding:20px; color: #8e8e93;'>Loading your goals from Google Sheets...</div>";

    try {
        // Fetch live data directly from your Google Sheet via the Web App
        const response = await fetch(GOOGLE_SHEET_API_URL);
        const rows = await response.json();

        dashboard.innerHTML = "";

        const structuredData = {
            matt: { color: "#ef8b33", goals: [] },
            shelley: { color: "#6fd053", goals: [] },
            family: { color: "#4da6ff", goals: [] }
        };

        rows.forEach(row => {
            const category = (row.category || "").toLowerCase();
            const targetCategory = category === "shelly" ? "shelley" : category;

            if (structuredData[targetCategory]) {
                structuredData[targetCategory].color = row.color || structuredData[targetCategory].color;
                structuredData[targetCategory].goals.push({
                    id: row.id,
                    title: row.title,
                    current: row.current,
                    target: row.target,
                    unit: row.unit
                });
            }
        });

        // Render Sections
        const sections = [
            { key: "matt", label: "Matt" },
            { key: "shelley", label: "Shelley" },
            { key: "family", label: "Family" }
        ];

        sections.forEach(section => {
            const personData = structuredData[section.key];
            if (!personData || personData.goals.length === 0) return;

            const color = personData.color;
            const goals = personData.goals || [];

            let totalCurrent = 0;
            let totalTarget = 0;

            goals.forEach(goal => {
                const current = Number(goal.current);
                const target = Number(goal.target);
                if (!isNaN(current)) totalCurrent += current;
                if (!isNaN(target)) totalTarget += target;
            });

            let overallPercent = null;
            if (totalTarget > 0) {
                overallPercent = Math.round((totalCurrent / totalTarget) * 100);
            }

            const overallDisplay = overallPercent === null || !isFinite(overallPercent) ? "N/A" : `${overallPercent}%`;

            const sectionHTML = `
                <section class="section">
                    <div class="section-header">
                        <div class="section-title" style="color:${color}">
                            ${section.label}
                        </div>
                    </div>

                    <div class="summary-card">
                        <div class="summary-top">
                            <div class="summary-label">Overall Progress</div>
                            <div class="summary-percent">${overallDisplay}</div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="background:${color}; width:${overallPercent ?? 0}%;"></div>
                        </div>
                    </div>

                    <div class="cards-container">
                        ${goals.map(goal => {
                            const current = Number(goal.current);
                            const target = Number(goal.target);
                            let percent = null;

                            if (!isNaN(current) && !isNaN(target) && target > 0) {
                                percent = Math.round((current / target) * 100);
                            }

                            const completed = percent !== null && percent >= 100;
                            const displayPercent = percent === null || !isFinite(percent) ? "N/A" : `${percent}%`;
                            const remaining = target > 0 && !isNaN(current) ? Math.max(target - current, 0) : null;
                            const remainingText = remaining === null ? "No target defined" : `${remaining.toLocaleString()} remaining`;
                            
                            const step = (goal.unit || "").toLowerCase() === 'miles' ? 0.5 : 1;

                            return `
                                <div class="card ${completed ? "completed-card" : ""}">
                                    <div class="progress-ring" data-progress="${percent ?? 0}" style="--stroke-color:${completed ? "#ffffff" : color};">
                                        <svg width="70" height="70" viewBox="0 0 70 70">
                                            <circle cx="35" cy="35" r="28" class="progress-bg"></circle>
                                            <circle cx="35" cy="35" r="28" class="progress-value"></circle>
                                        </svg>
                                        <div class="progress-text">${displayPercent}</div>
                                    </div>

                                    <div class="card-info">
                                        <div class="card-subtitle">
                                            ${completed ? "🏆 " : ""}${goal.title || "Goal"}
                                        </div>

                                        <div class="card-main-stat">
                                            <div class="stat-row">
                                                <div class="counter-controls">
                                                    <button class="adjust-btn minus" onclick="adjustGoal(${goal.id}, ${current}, -${step})">−</button>
                                                    <span class="current-value-display">${current.toLocaleString()}</span>
                                                    <button class="adjust-btn plus" onclick="adjustGoal(${goal.id}, ${current}, ${step})">+</button>
                                                </div>
                                                <span class="target-divider">/ ${target.toLocaleString()} <span class="unit">${goal.unit || ""}</span></span>
                                            </div>
                                        </div>

                                        <div class="card-sub-stat">
                                            ${remainingText}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </section>
            `;

            dashboard.insertAdjacentHTML("beforeend", sectionHTML);
        });

        animateRings();

    } catch (error) {
        console.error("Error fetching from Google Sheets:", error);
        dashboard.innerHTML = `<div style="padding:20px; color: #ff6b6b; font-weight: bold; background: rgba(255,107,107,0.1); border-radius:10px;">⚠️ Connection Error: Failed to load data from Google Sheets. Check browser console for details.</div>`;
    }
}

async function adjustGoal(goalId, currentVal, stepAmount) {
    const updatedValue = Math.max(0, parseFloat(currentVal || 0) + stepAmount);

    // Give visual feedback that something is happening
    const clickedCardId = `current-value-${goalId}`;

    try {
        // Pushing the update back to the Google Sheet
        const response = await fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            // Formatting as text/plain prevents strict CORS errors that Google blocks
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                id: goalId,
                current: updatedValue
            })
        });
        
        const result = await response.json();
        
        if(result.success) {
            // Refresh UI instantly
            fetchDashboardData();
        } else {
            console.error("Sheet update failed:", result);
            alert("Failed to sync update to Google Sheets.");
        }

    } catch (error) {
        console.error("Error writing to Google Sheets:", error);
        alert("Failed to sync update to Google Sheets. Are you online?");
    }
}

function animateRings() {
    const rings = document.querySelectorAll(".progress-ring");
    rings.forEach(ring => {
        const circle = ring.querySelector(".progress-value");
        if(!circle) return;
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;

        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference;

        const progress = parseFloat(ring.dataset.progress) || 0;
        const cappedProgress = Math.min(progress, 100);
        const offset = circumference - (cappedProgress / 100) * circumference;

        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 100);
    });
}
