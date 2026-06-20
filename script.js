const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxwanSQRXH4ZFF7ynyS1wB8D3JESxSr6YTYWqiaXyTKY392LbNhDN1DPP1VSSghnXOnQw/exec'; 

let pendingUpdates = {};

document.addEventListener("DOMContentLoaded", () => {
    fetchDashboardData();
});

async function fetchDashboardData() {
    const dashboard = document.getElementById("dashboard-container");
    
    if (dashboard.innerHTML === "") {
        dashboard.innerHTML = "<div style='padding:20px; color: #8e8e93;'>Loading your goals...</div>";
    }

    try {
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

        const sections = [
            { key: "matt", label: "Matt", defaultColor: "#ef8b33" },
            { key: "shelley", label: "Shelley", defaultColor: "#6fd053" },
            { key: "family", label: "Family", defaultColor: "#4da6ff" }
        ];

        sections.forEach(section => {
            const personData = structuredData[section.key];
            const color = personData && personData.color ? personData.color : section.defaultColor;
            const goals = personData ? personData.goals : [];

            let totalCurrent = 0;
            let totalTarget = 0;

            goals.forEach(goal => {
                const dbCurrent = Number(goal.current);
                const current = pendingUpdates.hasOwnProperty(goal.id) ? pendingUpdates[goal.id] : dbCurrent;
                const target = Number(goal.target);
                
                if (!isNaN(current)) totalCurrent += current;
                if (!isNaN(target)) totalTarget += target;
            });

            let overallPercent = null;
            if (totalTarget > 0) {
                overallPercent = Math.round((totalCurrent / totalTarget) * 100);
            }

            const overallDisplay = overallPercent === null || !isFinite(overallPercent) ? "N/A" : `${overallPercent}%`;

            let sectionHTML = `
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
            `;

            if (goals.length === 0) {
                sectionHTML += `
                    <div class="card empty-state-card" onclick="openModal('${section.key}', '${color}')">
                        <div class="empty-icon">+</div>
                        <div class="empty-text">Add your first goal</div>
                    </div>
                `;
            } else {
                sectionHTML += goals.map(goal => {
                    const dbCurrent = Number(goal.current);
                    const hasPending = pendingUpdates.hasOwnProperty(goal.id);
                    const current = hasPending ? pendingUpdates[goal.id] : dbCurrent;
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
                        <div class="card ${completed ? "completed-card" : ""}" id="card-${goal.id}">
                            <button class="delete-btn" onclick="deleteGoal(${goal.id}, '${goal.title}')">×</button>
                            
                            <div class="progress-ring" id="ring-${goal.id}" data-progress="${percent ?? 0}" data-color="${color}" style="--stroke-color:${completed ? "#ffffff" : color};">
                                <svg width="70" height="70" viewBox="0 0 70 70">
                                    <circle cx="35" cy="35" r="28" class="progress-bg"></circle>
                                    <circle cx="35" cy="35" r="28" class="progress-value"></circle>
                                </svg>
                                <div class="progress-text" id="ring-text-${goal.id}">${displayPercent}</div>
                            </div>

                            <div class="card-info">
                                <div class="card-subtitle">
                                    ${completed ? "🏆 " : ""}${goal.title || "Goal"}
                                </div>

                                <div class="card-main-stat">
                                    <div class="stat-row">
                                        <div class="counter-controls">
                                            <button class="adjust-btn minus" onclick="adjustLocalGoal(${goal.id}, ${dbCurrent}, -${step}, ${target})">−</button>
                                            <span class="current-value-display" id="val-display-${goal.id}">${current.toLocaleString()}</span>
                                            <button class="adjust-btn plus" onclick="adjustLocalGoal(${goal.id}, ${dbCurrent}, ${step}, ${target})">+</button>
                                        </div>
                                        <span class="target-divider">/ ${target.toLocaleString()} <span class="unit">${goal.unit || ""}</span></span>
                                    </div>
                                </div>

                                <div class="card-sub-stat" id="remaining-${goal.id}">
                                    ${remainingText}
                                </div>
                                
                                <div class="action-row" id="action-row-${goal.id}" style="display: ${hasPending ? 'flex' : 'none'};">
                                    <button class="btn-action btn-cancel" onclick="cancelGoal(${goal.id}, ${dbCurrent}, ${target})">Cancel</button>
                                    <button class="btn-action btn-save" id="save-btn-${goal.id}" onclick="saveGoal(${goal.id})">Save</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join("");

                sectionHTML += `
                    <div class="card add-another-card" onclick="openModal('${section.key}', '${color}')">
                        <div class="empty-icon" style="color: ${color}">+</div>
                        <div class="empty-text">Add another goal</div>
                    </div>
                `;
            }

            sectionHTML += `</div></section>`;
            dashboard.insertAdjacentHTML("beforeend", sectionHTML);
        });

        animateRings();

    } catch (error) {
        console.error("Error:", error);
        dashboard.innerHTML = `<div style="padding:20px; color: #ff6b6b; font-weight: bold; background: rgba(255,107,107,0.1); border-radius:10px;">⚠️ Connection Error.</div>`;
    }
}

function adjustLocalGoal(goalId, dbCurrent, stepAmount, target) {
    let baseVal = pendingUpdates.hasOwnProperty(goalId) ? pendingUpdates[goalId] : dbCurrent;
    let newVal = Math.max(0, baseVal + stepAmount);
    pendingUpdates[goalId] = newVal;

    document.getElementById(`val-display-${goalId}`).innerText = newVal.toLocaleString();
    let remaining = target > 0 ? Math.max(target - newVal, 0) : null;
    document.getElementById(`remaining-${goalId}`).innerText = remaining === null ? "No target defined" : `${remaining.toLocaleString()} remaining`;

    let percent = (target > 0) ? Math.round((newVal / target) * 100) : 0;
    document.getElementById(`ring-text-${goalId}`).innerText = target > 0 ? `${percent}%` : "N/A";

    let ring = document.getElementById(`ring-${goalId}`);
    if (ring) {
        ring.dataset.progress = percent;
        updateSingleRing(ring);
    }

    let card = document.getElementById(`card-${goalId}`);
    if (card) {
        if (percent !== null && percent >= 100) {
            card.classList.add("completed-card");
            if (ring) ring.style.setProperty('--stroke-color', '#ffffff');
        } else {
            card.classList.remove("completed-card");
            if (ring) ring.style.setProperty('--stroke-color', ring.dataset.color);
        }
    }

    document.getElementById(`action-row-${goalId}`).style.display = 'flex';
}

function cancelGoal(goalId, dbCurrent, target) {
    delete pendingUpdates[goalId];
    
    document.getElementById(`val-display-${goalId}`).innerText = dbCurrent.toLocaleString();
    let remaining = target > 0 ? Math.max(target - dbCurrent, 0) : null;
    document.getElementById(`remaining-${goalId}`).innerText = remaining === null ? "No target defined" : `${remaining.toLocaleString()} remaining`;
    
    let percent = (target > 0) ? Math.round((dbCurrent / target) * 100) : 0;
    document.getElementById(`ring-text-${goalId}`).innerText = target > 0 ? `${percent}%` : "N/A";
    
    let ring = document.getElementById(`ring-${goalId}`);
    if (ring) {
        ring.dataset.progress = percent;
        updateSingleRing(ring);
    }

    let card = document.getElementById(`card-${goalId}`);
    if (card) {
        if (percent !== null && percent >= 100) {
            card.classList.add("completed-card");
            if (ring) ring.style.setProperty('--stroke-color', '#ffffff');
        } else {
            card.classList.remove("completed-card");
            if (ring) ring.style.setProperty('--stroke-color', ring.dataset.color);
        }
    }
    document.getElementById(`action-row-${goalId}`).style.display = 'none';
}

async function saveGoal(goalId) {
    const updatedValue = pendingUpdates[goalId];
    const saveBtn = document.getElementById(`save-btn-${goalId}`);
    
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    try {
        const response = await fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                action: 'update',
                id: goalId, 
                current: updatedValue 
            })
        });
        
        const result = await response.json();
        if (result.success) {
            delete pendingUpdates[goalId];
            fetchDashboardData();
        } else {
            alert("Failed to sync update to Google Sheets.");
            saveBtn.innerText = "Save";
            saveBtn.disabled = false;
        }
    } catch (error) {
        alert("Failed to sync update. Are you online?");
        saveBtn.innerText = "Save";
        saveBtn.disabled = false;
    }
}

function openModal(category, color) {
    document.getElementById('modal-category').value = category;
    document.getElementById('modal-color').value = color;
    
    const titleCategory = category.charAt(0).toUpperCase() + category.slice(1);
    document.getElementById('modal-header-title').innerText = `New Goal for ${titleCategory}`;
    document.getElementById('modal-header-title').style.color = color;
    
    document.getElementById('add-goal-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('add-goal-modal').style.display = 'none';
    document.getElementById('goal-title-input').value = '';
    document.getElementById('goal-target-input').value = '';
    document.getElementById('goal-unit-input').value = '';
}

async function submitNewGoal(addAnother) {
    const title = document.getElementById('goal-title-input').value;
    const target = document.getElementById('goal-target-input').value;
    const unit = document.getElementById('goal-unit-input').value;
    const category = document.getElementById('modal-category').value;
    const color = document.getElementById('modal-color').value;

    if(!title || !target) {
        alert("Please enter a title and target number!");
        return;
    }

    const btn1 = document.getElementById('btn-save-close');
    const btn2 = document.getElementById('btn-save-add');
    btn1.innerText = "Saving...";
    btn2.innerText = "Saving...";

    try {
        const response = await fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                action: 'add',
                category: category,
                color: color,
                title: title,
                target: target,
                unit: unit
            })
        });

        const result = await response.json();
        if (result.success) {
            if (addAnother) {
                document.getElementById('goal-title-input').value = '';
                document.getElementById('goal-target-input').value = '';
                document.getElementById('goal-unit-input').value = '';
                btn1.innerText = "Save & Close";
                btn2.innerText = "Save & Add Another";
            } else {
                closeModal();
                btn1.innerText = "Save & Close";
                btn2.innerText = "Save & Add Another";
            }
            fetchDashboardData();
        } else {
            alert("Failed to add goal.");
        }
    } catch (error) {
        alert("Error connecting to server.");
    }
}

async function deleteGoal(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
        const response = await fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                action: 'delete',
                id: id
            })
        });

        const result = await response.json();
        if (result.success) {
            fetchDashboardData();
        } else {
            alert("Failed to delete goal.");
        }
    } catch (error) {
        alert("Error connecting to server.");
    }
}

function animateRings() {
    const rings = document.querySelectorAll(".progress-ring");
    rings.forEach(ring => updateSingleRing(ring));
}

function updateSingleRing(ring) {
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
    }, 50);
}
