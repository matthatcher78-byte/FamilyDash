document.addEventListener("DOMContentLoaded", () => {
    const dashboard = document.getElementById("dashboard-container");

    fetch("data.json", { cache: "no-store" })
        .then(response => response.json())
        .then(data => {

            const sections = [
                {
                    key: "matt",
                    label: "Matt"
                },
                {
                    key: "shelly",
                    label: "Shelley"
                },
                {
                    key: "family",
                    label: "Family"
                }
            ];

            sections.forEach(section => {

                const personData = data[section.key];

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
                    overallPercent = Math.round(
                        (totalCurrent / totalTarget) * 100
                    );
                }

                const overallDisplay =
                    overallPercent === null || !isFinite(overallPercent)
                        ? "N/A"
                        : `${overallPercent}%`;

                const sectionHTML = `
                    <section class="section">

                        <div class="section-header">
                            <div class="section-title" style="color:${color}">
                                ${section.label}
                            </div>
                        </div>

                        <div class="summary-card">
                            <div class="summary-top">
                                <div class="summary-label">
                                    Overall Progress
                                </div>

                                <div class="summary-percent">
                                    ${overallDisplay}
                                </div>
                            </div>

                            <div class="progress-bar">
                                <div
                                    class="progress-fill"
                                    style="
                                        background:${color};
                                        width:${overallPercent ?? 0}%;
                                    "
                                ></div>
                            </div>
                        </div>

                        <div class="cards-container">
                            ${goals.map(goal => {

                                const current = Number(goal.current);
                                const target = Number(goal.target);

                                let percent = null;

                                if (
                                    !isNaN(current) &&
                                    !isNaN(target) &&
                                    target > 0
                                ) {
                                    percent = Math.round(
                                        (current / target) * 100
                                    );
                                }

                                const completed =
                                    percent !== null &&
                                    percent >= 100;

                                const displayPercent =
                                    percent === null || !isFinite(percent)
                                        ? "N/A"
                                        : `${percent}%`;

                                const remaining =
                                    target > 0 && !isNaN(current)
                                        ? Math.max(target - current, 0)
                                        : null;

                                const remainingText =
                                    remaining === null
                                        ? "No target defined"
                                        : `${remaining.toLocaleString()} remaining`;

                                return `
                                    <div class="card ${completed ? "completed-card" : ""}">

                                        <div
                                            class="progress-ring"
                                            data-progress="${percent ?? 0}"
                                            style="--stroke-color:${completed ? "#ffffff" : color};"
                                        >

                                            <svg width="70" height="70" viewBox="0 0 70 70">
                                                <circle
                                                    cx="35"
                                                    cy="35"
                                                    r="28"
                                                    class="progress-bg"
                                                ></circle>

                                                <circle
                                                    cx="35"
                                                    cy="35"
                                                    r="28"
                                                    class="progress-value"
                                                ></circle>
                                            </svg>

                                            <div class="progress-text">
                                                ${displayPercent}
                                            </div>

                                        </div>

                                        <div class="card-info">

                                            <div class="card-subtitle">
                                                ${completed ? "🏆 " : ""}
                                                ${goal.title}
                                            </div>

                                            <div class="card-main-stat">
                                                <strong>
                                                    ${Number(goal.current).toLocaleString()}
                                                </strong>
                                                /
                                                ${Number(goal.target).toLocaleString()}
                                                <span class="unit">
                                                    ${goal.unit || ""}
                                                </span>
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
        })
        .catch(error => {
            console.error("Error loading data:", error);

            dashboard.innerHTML = `
                <div style="padding:20px;">
                    Unable to load dashboard data.
                </div>
            `;
        });

    function animateRings() {

        const rings = document.querySelectorAll(".progress-ring");

        rings.forEach(ring => {

            const circle = ring.querySelector(".progress-value");

            const radius = circle.r.baseVal.value;
            const circumference = radius * 2 * Math.PI;

            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = circumference;

            const progress =
                parseFloat(ring.dataset.progress) || 0;

            const cappedProgress = Math.min(progress, 100);

            const offset =
                circumference -
                (cappedProgress / 100) * circumference;

            setTimeout(() => {
                circle.style.strokeDashoffset = offset;
            }, 100);
        });
    }
});