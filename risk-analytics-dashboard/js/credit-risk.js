import { appState } from './app.js';

/**
 * Render Credit & Counterparty Risk Tab View
 */
export function renderCreditRisk(container) {
    const comp = appState.computed;
    const base = appState.base;
    
    // Scale credit metrics based on shocks
    const creditShocks = appState.shocks;
    // Average PD shifts up as credit spreads widen and equities fall
    const stressedPd = base.creditRisk.averagePd * (1 + (creditShocks.creditSpreads / 200)) * (1 - (creditShocks.equityPrice / 100));
    // LGD rises slightly under high stress (asset recovery rates collapse)
    const stressedLgd = Math.min(0.60, base.creditRisk.lgd * (1 + (creditShocks.creditSpreads / 1000)));

    container.innerHTML = `
        <!-- Metrics Row -->
        <div class="risk-grid">
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-handshake"></i> Total Credit Exposure</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">$${(comp.counterparties.reduce((acc, cp) => acc + cp.exposure, 0)/1e6).toFixed(1)}M</span>
                    <span class="metric-subtitle">Interbank & Portfolio Exposure</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-triangle-exclamation"></i> Expected Credit Loss (ECL)</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large text-danger">$${(comp.creditLoss/1e6).toFixed(2)}M</span>
                    <span class="metric-subtitle">IFRS 9 Provisioning Level</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-percent"></i> Average Portfolio PD</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">${(stressedPd * 100).toFixed(2)}%</span>
                    <span class="metric-subtitle">Weighted Default Probability</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-shield-halved"></i> Loss Given Default (LGD)</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">${(stressedLgd * 100).toFixed(1)}%</span>
                    <span class="metric-subtitle">Average recovery rate: ${(100 - stressedLgd * 100).toFixed(1)}%</span>
                </div>
            </div>
        </div>
        
        <!-- Credit Charts -->
        <div class="risk-grid">
            <div class="card col-7">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-users"></i> Counterparty Exposures vs Board Limits</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="credit-limits-chart"></canvas>
                </div>
            </div>
            
            <div class="card col-5">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-ranking-star"></i> Ratings Migration Analysis</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="credit-ratings-chart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Detailed Counterparty Registry Table -->
        <div class="risk-grid">
            <div class="card col-12">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-list-check"></i> Interbank Credit Limit Register</span>
                    <span style="font-size: 11px; color: var(--text-muted);">Real-time monitoring of bilateral counterparty limits</span>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Counterparty Entity</th>
                                <th>Credit Rating</th>
                                <th>Gross Exposure</th>
                                <th>Approved Limit</th>
                                <th>Utilization</th>
                                <th>Policy Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comp.counterparties.map(cp => {
                                const util = (cp.exposure / cp.limit) * 100;
                                const isBreached = util >= 100;
                                const isWarn = util >= 90 && util < 100;
                                
                                let statusText = "Active / Normal";
                                let badgeClass = "badge-neutral text-success";
                                let rowClass = "";
                                
                                if (isBreached) {
                                    statusText = "LIMIT BREACH";
                                    badgeClass = "badge-danger";
                                    rowClass = "table-row-alert";
                                } else if (isWarn) {
                                    statusText = "LIMIT WARNING";
                                    badgeClass = "badge-warning";
                                }
                                
                                return `
                                    <tr class="${rowClass}">
                                        <td><strong>${cp.name}</strong></td>
                                        <td><span class="rating-badge rating-${cp.rating.replace('+', '').replace('-', '').toLowerCase()}">${cp.rating}</span></td>
                                        <td class="value-cell">$${(cp.exposure/1e6).toFixed(1)}M</td>
                                        <td class="value-cell">$${(cp.limit/1e6).toFixed(0)}M</td>
                                        <td class="progress-bar-cell">
                                            <div class="progress-track">
                                                <div class="progress-fill ${isBreached ? 'fill-danger' : isWarn ? 'fill-warning' : 'fill-success'}" style="width: ${Math.min(util, 100)}%"></div>
                                            </div>
                                            <span style="font-size: 10px; font-weight: 500;" class="${isBreached ? 'text-danger' : isWarn ? 'text-warning' : 'text-success'}">${util.toFixed(1)}%</span>
                                        </td>
                                        <td><span class="stat-badge ${badgeClass}">${statusText}</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    initCreditCharts();
}

/**
 * Initialize charts for Credit Risk View
 */
function initCreditCharts() {
    const comp = appState.computed;
    const base = appState.base;
    const s = appState.shocks;
    
    // 1. Counterparty Exposure vs Limit Chart (Double Bar)
    const limitsCtx = document.getElementById("credit-limits-chart").getContext("2d");
    
    const cpNames = comp.counterparties.map(cp => cp.name);
    const cpExposures = comp.counterparties.map(cp => (cp.exposure / 1e6).toFixed(1));
    const cpLimits = comp.counterparties.map(cp => (cp.limit / 1e6).toFixed(0));
    
    new Chart(limitsCtx, {
        type: 'bar',
        data: {
            labels: cpNames,
            datasets: [
                {
                    label: 'Current Exposure ($M)',
                    data: cpExposures,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Approved Credit Limit ($M)',
                    data: cpLimits,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { 
                        color: '#64748b', 
                        font: { family: 'Outfit' },
                        callback: function(value) { return '$' + value + 'M'; }
                    }
                }
            }
        }
    });
    
    // 2. Credit Ratings Migration chart (Stressed vs Baseline)
    // Under stress, rating profile migrates downward (AAA and AA shift to A/BBB/BB)
    const ratingsCtx = document.getElementById("credit-ratings-chart").getContext("2d");
    
    const ratings = base.creditRisk.ratingsDistribution.map(r => r.rating);
    const baselineExposures = base.creditRisk.ratingsDistribution.map(r => (r.exposure / 1e6).toFixed(0));
    
    // Simple rating migration math based on credit spreads shock
    const migrationFactor = Math.min(0.40, s.creditSpreads / 1000); // Up to 40% downgrade migration
    
    // Compute stressed exposures for ratings
    const stressedExposures = [...baselineExposures];
    if (migrationFactor > 0) {
        // AAA migrates to AA
        const aaaDowngrade = stressedExposures[0] * migrationFactor;
        stressedExposures[0] -= aaaDowngrade;
        stressedExposures[1] = Number(stressedExposures[1]) + aaaDowngrade;
        
        // AA migrates to A
        const aaDowngrade = stressedExposures[1] * migrationFactor;
        stressedExposures[1] -= aaDowngrade;
        stressedExposures[2] = Number(stressedExposures[2]) + aaDowngrade;
        
        // A migrates to BBB
        const aDowngrade = stressedExposures[2] * migrationFactor;
        stressedExposures[2] -= aDowngrade;
        stressedExposures[3] = Number(stressedExposures[3]) + aDowngrade;
        
        // BBB migrates to BB/B
        const bbbDowngrade = stressedExposures[3] * migrationFactor;
        stressedExposures[3] -= bbbDowngrade;
        stressedExposures[4] = Number(stressedExposures[4]) + (bbbDowngrade * 0.7);
        stressedExposures[5] = Number(stressedExposures[5]) + (bbbDowngrade * 0.3);
    }
    
    new Chart(ratingsCtx, {
        type: 'bar',
        data: {
            labels: ratings,
            datasets: [
                {
                    label: 'Stressed Exposure ($M)',
                    data: stressedExposures.map(e => Number(e).toFixed(0)),
                    backgroundColor: 'rgba(56, 189, 248, 0.85)',
                    borderColor: '#38bdf8',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Baseline Exposure ($M)',
                    data: baselineExposures,
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    borderDash: [3, 3],
                    borderWidth: 1.5,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { 
                        color: '#64748b', 
                        font: { family: 'Outfit' },
                        callback: function(value) { return '$' + value + 'M'; }
                    }
                }
            }
        }
    });
}
