// Initialize Supabase Connection with your credentials
const SUPABASE_URL = 'https://saahhmelgrvgoybuoafs.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_SELpy1u8w2mo2LYo01SHuA_WXqXXVeG';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    fetchDashboardData();
});

async function fetchDashboardData() {
    const dashboard = document.getElementById("dashboard-container");
    
    // Clear the container out before re-rendering
    dashboard.innerHTML = "";

    // Fetch live data rows directly from your lowercase dashdata table
    const { data: rows, error } = await supabase
        .from('dashdata')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Error loading data from Supabase:", error);
        dashboard.innerHTML = `<div style="padding:20px;">Unable to load dashboard data. Check API keys.</div>`;
        return;
    }

    // Map flat database rows back into the structured format your engine expects
    const structuredData = {
        matt: { color: "#ef8b33", goals: [] },
        shelly: { color: "#6fd053", goals: [] },
        family: { color: "#4da6ff", goals: [] }
    };

    rows.forEach(row => {
        if (structuredData[row.category]) {
            structuredData[row.category].color = row.color;
            structuredData[row.category].goals.push({
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
        { key: "shelly", label: "Shelley" },
        { key: "family", label: "Family" }
    ];

    sections.forEach(section => {
        const personData = structuredData[section.key];
        if (!personData) return;

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
                        
                        const step = goal.unit.toLowerCase() === 'miles' ? 0.5 : 1;

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
                                        ${completed ? "🏆 " : ""}${goal.title}
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
}

// Write mutations to the lowercase dashdata table
async function adjustGoal(goalId, currentVal, stepAmount) {
    const updatedValue = Math.max(0, parseFloat(currentVal) + stepAmount);

    const { error } = await supabase
        .from('dashdata')
        .update({ current: updatedValue })
        .eq('id', goalId);

    if (error) {
        console.error("Error writing mutation to database:", error);
    } else {
        fetchDashboardData();
    }
}

function animateRings() {
    const rings = document.querySelectorAll(".progress-ring");
    rings.forEach(ring => {
        const circle = ring.querySelector(".progress-value");
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
