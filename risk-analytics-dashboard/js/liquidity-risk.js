import { appState } from './app.js';

/**
 * Render Funding & Liquidity Stress Tab View
 */
export function renderLiquidityRisk(container) {
    const comp = appState.computed;
    const base = appState.base;
    const shocks = appState.shocks;
    
    // Scale factor for cumulative outflows
    const outflowStressor = comp.outflows / base.liquidityRisk.netOutflows30d;
    const hqlaHaircut = comp.hqla / base.liquidityRisk.hqla;

    container.innerHTML = `
        <!-- Metrics Row -->
        <div class="risk-grid">
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-sack-dollar"></i> High Quality Assets (HQLA)</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">$${(comp.hqla/1e6).toFixed(1)}M</span>
                    <span class="metric-subtitle">Stressed Haircut: ${((1 - hqlaHaircut) * 100).toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-arrow-right-from-bracket"></i> 30-Day Net Outflows</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">$${(comp.outflows/1e6).toFixed(1)}M</span>
                    <span class="metric-subtitle">Stress Surge: +${((outflowStressor - 1) * 100).toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-filter-list"></i> Liquidity Coverage Ratio</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large ${comp.lcr < base.liquidityRisk.lcrLimit ? 'text-danger' : comp.lcr < base.liquidityRisk.lcrWarningThreshold ? 'text-warning' : 'text-success'}">${comp.lcr.toFixed(1)}%</span>
                    <span class="metric-subtitle">Policy Minimum: 100.0%</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-hourglass-half"></i> Funding Survival Horizon</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large ${comp.survivalHorizon < 30 ? 'text-danger' : comp.survivalHorizon < 35 ? 'text-warning' : 'text-success'}">${comp.survivalHorizon} Days</span>
                    <span class="metric-subtitle">Target policy limit: > 30 Days</span>
                </div>
            </div>
        </div>
        
        <!-- Liquidity Charts -->
        <div class="risk-grid">
            <div class="card col-8">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-chart-gantt"></i> 6-Week Forecast: Stressed Weekly Cash Flows ($ Millions)</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="liquidity-cash-flow-chart"></canvas>
                </div>
            </div>
            
            <div class="card col-4">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-chart-bar"></i> Key Regulatory Ratios</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="liquidity-ratios-chart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Weekly Cash Ledger -->
        <div class="risk-grid">
            <div class="card col-12">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-money-check-dollar"></i> Cumulative Cash Flow Ledgers</span>
                    <span style="font-size: 11px; color: var(--text-muted);">Weekly breakdown of liquid buffer depletion path</span>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Stress Period</th>
                                <th>Projected Cash Inflow</th>
                                <th>Stressed Cash Outflow</th>
                                <th>Net Weekly Flow</th>
                                <th>Stressed Liquid Buffer</th>
                                <th>LCR Equivalent (Est.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateLiquidityTableRows(base.liquidityRisk.cashForecast, outflowStressor, hqlaHaircut, comp.hqla, base.liquidityRisk.netOutflows30d)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    initLiquidityCharts(outflowStressor, hqlaHaircut);
}

/**
 * Generate liquidity forecast table rows dynamically based on stress multipliers
 */
function generateLiquidityTableRows(forecast, outflowStressor, hqlaHaircut, currentHqla, baseOutflows30d) {
    let cumulativeBuffer = currentHqla / 1e6; // starts at current stressed HQLA
    const baseWeeklyOutflow = baseOutflows30d / 4.28; // convert 30d to weekly approx
    
    return forecast.map((f, index) => {
        const weeklyInflow = f.inflows * hqlaHaircut; // Inflows drop slightly under stress (securities liquidity hits)
        const weeklyOutflow = f.outflows * outflowStressor; // Outflows surge under stress
        const netFlow = weeklyInflow - weeklyOutflow;
        
        // Update cumulative
        cumulativeBuffer = cumulativeBuffer + netFlow;
        
        // Estimated LCR = cumulative buffer / weeklyOutflows * 4.28
        const estLcr = (cumulativeBuffer / ((baseWeeklyOutflow * outflowStressor) / 1e6 * 4.28)) * 100;
        
        const netClass = netFlow < 0 ? 'text-danger' : 'text-success';
        const bufferClass = cumulativeBuffer <= 150 ? 'text-danger' : cumulativeBuffer <= 200 ? 'text-warning' : 'text-success';
        const lcrClass = estLcr < 100 ? 'text-danger' : estLcr < 115 ? 'text-warning' : 'text-success';
        
        return `
            <tr>
                <td><strong>${f.week} of Stress</strong></td>
                <td class="value-cell">$${weeklyInflow.toFixed(1)}M</td>
                <td class="value-cell">$${weeklyOutflow.toFixed(1)}M</td>
                <td class="value-cell ${netClass}">$${netFlow.toFixed(1)}M</td>
                <td class="value-cell ${bufferClass}">$${cumulativeBuffer.toFixed(1)}M</td>
                <td class="value-cell ${lcrClass}">${estLcr.toFixed(1)}%</td>
            </tr>
        `;
    }).join('');
}

/**
 * Initialize charts for Liquidity Risk
 */
function initLiquidityCharts(outflowStressor, hqlaHaircut) {
    const comp = appState.computed;
    const base = appState.base;
    
    // 1. Weekly cash inflows/outflows under active stress
    const cfCtx = document.getElementById("liquidity-cash-flow-chart").getContext("2d");
    
    const labels = base.liquidityRisk.cashForecast.map(f => f.week);
    const inflows = base.liquidityRisk.cashForecast.map(f => (f.inflows * hqlaHaircut).toFixed(1));
    const outflows = base.liquidityRisk.cashForecast.map(f => (f.outflows * outflowStressor).toFixed(1));
    
    new Chart(cfCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Stressed Cash Outflows ($M)',
                    data: outflows,
                    backgroundColor: 'rgba(244, 63, 94, 0.85)',
                    borderColor: '#f43f5e',
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Stressed Cash Inflows ($M)',
                    data: inflows,
                    backgroundColor: 'rgba(16, 185, 129, 0.85)',
                    borderColor: '#10b981',
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
    
    // 2. Bar chart for LCR and NSFR versus policy baseline
    const ratioCtx = document.getElementById("liquidity-ratios-chart").getContext("2d");
    
    new Chart(ratioCtx, {
        type: 'bar',
        data: {
            labels: ['LCR', 'NSFR'],
            datasets: [
                {
                    label: 'Stressed Ratio (%)',
                    data: [comp.lcr.toFixed(1), base.liquidityRisk.nsfr.toFixed(1)],
                    backgroundColor: [
                        comp.lcr < 100 ? 'rgba(244, 63, 94, 0.85)' : comp.lcr < 115 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)',
                        'rgba(99, 102, 241, 0.85)'
                    ],
                    borderColor: [
                        comp.lcr < 100 ? '#f43f5e' : comp.lcr < 115 ? '#f59e0b' : '#10b981',
                        '#6366f1'
                    ],
                    borderWidth: 1.5,
                    borderRadius: 4
                },
                {
                    label: 'Regulatory Minimum (%)',
                    data: [100, 100],
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.25)',
                    borderWidth: 1.5,
                    borderDash: [3, 3]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { 
                        color: '#64748b', 
                        font: { family: 'Outfit' },
                        callback: function(value) { return value + '%'; }
                    },
                    max: 200
                }
            }
        }
    });
}
