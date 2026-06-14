import { appState } from './app.js';

/**
 * Render Market Risk Management Tab View
 */
export function renderMarketRisk(container) {
    const comp = appState.computed;
    const base = appState.base;
    
    container.innerHTML = `
        <!-- Metrics Bar -->
        <div class="risk-grid">
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-calculator"></i> 99% 1-Day VaR</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large ${comp.var99_1d >= base.marketRisk.varLimit ? 'text-danger' : comp.var99_1d >= base.marketRisk.varWarningThreshold ? 'text-warning' : 'text-success'}">$${(comp.var99_1d/1e6).toFixed(2)}M</span>
                    <span class="metric-subtitle">Limit: $${(base.marketRisk.varLimit/1e6).toFixed(0)}M</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-chart-line"></i> 95% 1-Day VaR</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">$${(comp.var95_1d/1e6).toFixed(2)}M</span>
                    <span class="metric-subtitle">Confidence Level: 95.0%</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-bolt"></i> Expected Shortfall (99%)</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large text-danger">$${(comp.expectedShortfall/1e6).toFixed(2)}M</span>
                    <span class="metric-subtitle">Average Loss in Tail Scenario</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-gauge-high"></i> Portfolio Beta & Vol</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">${comp.portfolioBeta.toFixed(2)} / ${(comp.annualVolatility*100).toFixed(1)}%</span>
                    <span class="metric-subtitle">Systematic Risk / Volatility</span>
                </div>
            </div>
        </div>
        
        <!-- Interactive Chart and Sector Allocation -->
        <div class="risk-grid">
            <div class="card col-8">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-chart-line"></i> Dual-Axis: 99% VaR vs S&P 500 Index</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="market-var-index-chart"></canvas>
                </div>
            </div>
            
            <div class="card col-4">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-pie-chart"></i> Stressed Sector Exposure</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="market-sector-chart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- VaR Sensitivity Stress Matrix -->
        <div class="risk-grid">
            <div class="card col-12">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-table-cells"></i> 1-Day 99% VaR Stress Sensitivity Matrix ($ Millions)</span>
                    <span style="font-size: 11px; color: var(--text-muted);">Simulated VaR under varying equity shocks and volatility shifts</span>
                </div>
                <div class="data-table-container">
                    <table class="data-table text-center" style="text-align: center;">
                        <thead>
                            <tr>
                                <th style="text-align: left;">Equity Shock / Vol Shift</th>
                                <th>Vol Baseline</th>
                                <th>Vol +25%</th>
                                <th>Vol +50%</th>
                                <th>Vol +100%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateSensitivityMatrixHtml(comp.var99_1d)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    initMarketCharts();
}

/**
 * Generate Sensitivity Matrix for Market Risk
 * Outputs simulated VaR under different parameters
 */
function generateSensitivityMatrixHtml(currentVaR) {
    const equityShocks = [
        { label: "Equity Baseline", multiplier: 1.0 },
        { label: "Equity -10% Shock", multiplier: 1.15 }, // Drops in equity raise VaR (correlation factor)
        { label: "Equity -20% Shock", multiplier: 1.35 },
        { label: "Equity -30% Shock", multiplier: 1.60 }
    ];
    
    const volShocks = [
        { multiplier: 1.0 },      // Vol Baseline
        { multiplier: 1.118 },    // Vol +25% (sqrt(1.25))
        { multiplier: 1.224 },    // Vol +50% (sqrt(1.5))
        { multiplier: 1.414 }     // Vol +100% (sqrt(2.0))
    ];
    
    const varLimit = appState.base.marketRisk.varLimit;
    const varWarning = appState.base.marketRisk.varWarningThreshold;
    
    return equityShocks.map(eq => {
        return `
            <tr>
                <td style="text-align: left; font-weight: 600;">${eq.label}</td>
                ${volShocks.map(vol => {
                    const simVaR = (currentVaR * eq.multiplier * vol.multiplier) / 1e6;
                    const valueBytes = simVaR * 1e6;
                    
                    let colorClass = "text-success";
                    if (valueBytes >= varLimit) {
                        colorClass = "text-danger font-bold";
                    } else if (valueBytes >= varWarning) {
                        colorClass = "text-warning";
                    }
                    
                    return `<td class="value-cell ${colorClass}">$${simVaR.toFixed(2)}M</td>`;
                }).join('')}
            </tr>
        `;
    }).join('');
}

/**
 * Initialize charts for Market Risk View
 */
function initMarketCharts() {
    const hist = appState.base.marketRisk.historicalVaR;
    const comp = appState.computed;
    const base = appState.base;
    
    // Scale historical array based on current stress multiplier
    const activeMultiplier = comp.var99_1d / base.marketRisk.var99_1d;
    
    const labels = hist.map(h => h.date);
    const dataVaR = hist.map(h => (h.var99 * activeMultiplier).toFixed(2));
    const dataIndex = hist.map(h => h.sp500);
    
    // 1. Dual Axis Chart
    const varIndexCtx = document.getElementById("market-var-index-chart").getContext("2d");
    new Chart(varIndexCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '99% Value at Risk (1d)',
                    data: dataVaR,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.08)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2.5,
                    yAxisID: 'y'
                },
                {
                    label: 'S&P 500 Index Ref',
                    data: dataIndex,
                    borderColor: '#94a3b8',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.2,
                    borderWidth: 1.5,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#64748b', font: { family: 'Outfit' } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { 
                        color: '#64748b', 
                        font: { family: 'Outfit' },
                        callback: function(value) { return '$' + value + 'M'; }
                    },
                    title: {
                        display: true,
                        text: 'Value at Risk',
                        color: '#94a3b8'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false }, // Only keep left axis grid lines
                    ticks: { color: '#64748b', font: { family: 'Outfit' } },
                    title: {
                        display: true,
                        text: 'S&P 500 Index',
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
    
    // 2. Horizontal Bar Chart for Sector Distributions
    const sectorCtx = document.getElementById("market-sector-chart").getContext("2d");
    const sectorNames = base.sectors.map(s => s.name);
    const sectorPercentages = base.sectors.map(s => s.percentage);
    
    new Chart(sectorCtx, {
        type: 'bar',
        data: {
            labels: sectorNames,
            datasets: [{
                label: 'Sector Exposure %',
                data: sectorPercentages,
                backgroundColor: [
                    'rgba(56, 189, 248, 0.7)',
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(148, 163, 184, 0.7)'
                ],
                borderColor: [
                    '#38bdf8', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#94a3b8'
                ],
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { 
                        color: '#64748b', 
                        font: { family: 'Outfit' },
                        callback: function(value) { return value + '%'; }
                    },
                    max: 30
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 10 } }
                }
            }
        }
    });
}
