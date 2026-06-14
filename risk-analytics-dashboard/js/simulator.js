import { appState, updateState } from './app.js';
import { STRESS_SCENARIOS } from './data.js';

/**
 * Render Stress Testing Simulator Tab View
 */
export function renderSimulator(container) {
    const comp = appState.computed;
    const base = appState.base;
    const shocks = appState.shocks;
    const scen = appState.scenario;
    
    // Check for alerts
    const alerts = getActiveAlerts(comp, base);

    container.innerHTML = `
        <div class="simulator-layout">
            <!-- Left Pane: Control Panel -->
            <div class="simulator-controls">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <span class="card-title"><i class="fa-solid fa-history"></i> Historical Stress Presets</span>
                    </div>
                    <div class="preset-selector">
                        ${Object.values(STRESS_SCENARIOS).map(s => {
                            const isActive = scen.id === s.id;
                            let icon = "fa-sun";
                            if (s.id === 'gfc_2008') icon = "fa-burst";
                            if (s.id === 'covid_2020') icon = "fa-virus-covid";
                            if (s.id === 'stagflation') icon = "fa-arrow-trend-up";
                            if (s.id === 'geopolitical') icon = "fa-globe";
                            
                            return `
                                <button class="preset-btn ${isActive ? 'active' : ''}" data-preset-id="${s.id}">
                                    <i class="fa-solid ${icon}"></i>
                                    <div style="text-align: left;">
                                        <div style="font-weight: 700; font-size: 13px;">${s.name}</div>
                                        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">${s.description.substring(0, 70)}...</div>
                                    </div>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <span class="card-title"><i class="fa-solid fa-sliders"></i> Adjust Custom Macro Shocks</span>
                    </div>
                    
                    <div class="slider-group">
                        <div class="slider-header">
                            <span class="slider-label">Equity Market Shock</span>
                            <span class="slider-value" id="equity-val">${shocks.equityPrice > 0 ? '+' : ''}${shocks.equityPrice}%</span>
                        </div>
                        <input type="range" class="custom-range" id="slider-equity" min="-50" max="20" step="5" value="${shocks.equityPrice}">
                    </div>
                    
                    <div class="slider-group">
                        <div class="slider-header">
                            <span class="slider-label">Interest Rate Shift</span>
                            <span class="slider-value" id="rate-val">${shocks.interestRate > 0 ? '+' : ''}${shocks.interestRate} bps</span>
                        </div>
                        <input type="range" class="custom-range" id="slider-rate" min="-200" max="400" step="25" value="${shocks.interestRate}">
                    </div>
                    
                    <div class="slider-group">
                        <div class="slider-header">
                            <span class="slider-label">Volatility Index Spike</span>
                            <span class="slider-value" id="vol-val">+${shocks.volatility}%</span>
                        </div>
                        <input type="range" class="custom-range" id="slider-vol" min="0" max="200" step="10" value="${shocks.volatility}">
                    </div>
                    
                    <div class="slider-group">
                        <div class="slider-header">
                            <span class="slider-label">Credit Spread Expansion</span>
                            <span class="slider-value" id="spread-val">+${shocks.creditSpreads} bps</span>
                        </div>
                        <input type="range" class="custom-range" id="slider-spread" min="0" max="500" step="25" value="${shocks.creditSpreads}">
                    </div>
                    
                    <div class="simulation-actions">
                        <button class="btn btn-secondary" id="reset-sim-btn" style="flex: 1;"><i class="fa-solid fa-rotate-left"></i> Reset Baseline</button>
                    </div>
                </div>
            </div>
            
            <!-- Right Pane: Real-time Stressed Results -->
            <div class="simulation-results-pane">
                <!-- Warning alerts banner -->
                <div class="limit-alerts-box ${alerts.length === 0 ? 'no-alerts' : ''}">
                    <h3 style="font-size: 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                        ${alerts.length === 0 
                            ? `<span class="text-success"><i class="fa-solid fa-circle-check"></i> System Compliance: Normal</span>` 
                            : `<span class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Limit Exceptions Triggered (${alerts.length})</span>`}
                    </h3>
                    <div id="simulation-alerts-list" style="max-height: 120px; overflow-y: auto;">
                        ${alerts.length === 0 
                            ? `<p style="font-size: 12px; color: var(--text-secondary);">All portfolio metrics are within regulatory and internal risk limits under this scenario.</p>` 
                            : alerts.map(a => `<div class="alert-message text-danger" style="font-size: 11px;"><i class="fa-solid fa-triangle-exclamation"></i> ${a}</div>`).join('')}
                    </div>
                </div>
                
                <!-- Macro Metric Breakdown cards -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title"><i class="fa-solid fa-chart-column"></i> Simulated Metric Shifts</span>
                    </div>
                    
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Key Performance Risk Metric</th>
                                    <th>Baseline Value</th>
                                    <th>Stressed / Simulated Value</th>
                                    <th>Variance Shift</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Fund AUM Valuation</strong></td>
                                    <td class="value-cell">$${(base.portfolio.totalValue/1e9).toFixed(3)}B</td>
                                    <td class="value-cell">$${(comp.portfolioValue/1e9).toFixed(3)}B</td>
                                    <td class="value-cell ${comp.portfolioValue < base.portfolio.totalValue ? 'text-danger' : 'text-success'}">
                                        ${(((comp.portfolioValue - base.portfolio.totalValue)/base.portfolio.totalValue)*100).toFixed(2)}%
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>99% 1-Day Value at Risk (VaR)</strong></td>
                                    <td class="value-cell">$${(base.marketRisk.var99_1d/1e6).toFixed(2)}M</td>
                                    <td class="value-cell ${comp.var99_1d >= base.marketRisk.varLimit ? 'text-danger' : 'text-success'}">$${(comp.var99_1d/1e6).toFixed(2)}M</td>
                                    <td class="value-cell ${comp.var99_1d > base.marketRisk.var99_1d ? 'text-danger' : 'text-success'}">
                                        +${(((comp.var99_1d - base.marketRisk.var99_1d)/base.marketRisk.var99_1d)*100).toFixed(1)}%
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Expected Credit Loss (ECL)</strong></td>
                                    <td class="value-cell">$${(base.creditRisk.expectedCreditLoss/1e6).toFixed(2)}M</td>
                                    <td class="value-cell text-danger">$${(comp.creditLoss/1e6).toFixed(2)}M</td>
                                    <td class="value-cell text-danger">
                                        +${(((comp.creditLoss - base.creditRisk.expectedCreditLoss)/base.creditRisk.expectedCreditLoss)*100).toFixed(1)}%
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Liquidity Coverage Ratio (LCR)</strong></td>
                                    <td class="value-cell">${base.liquidityRisk.lcr.toFixed(1)}%</td>
                                    <td class="value-cell ${comp.lcr < 100 ? 'text-danger' : 'text-success'}">${comp.lcr.toFixed(1)}%</td>
                                    <td class="value-cell text-danger">
                                        ${(comp.lcr - base.liquidityRisk.lcr).toFixed(1)}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Visualizing the Shift in Asset Distribution -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title"><i class="fa-solid fa-pie-chart"></i> Stressed Portfolio Asset Class Shifting</span>
                    </div>
                    <div class="chart-container" style="height: 180px;">
                        <canvas id="sim-comparison-chart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Wire Up slider events for real-time recalculation
    attachSliderListeners(container);
    attachPresetListeners(container);
    
    // Draw allocation comparison
    initSimComparisonChart();
}

/**
 * Compile active alert messages for current stress state
 */
function getActiveAlerts(comp, base) {
    let alerts = [];
    
    if (comp.var99_1d >= base.marketRisk.varLimit) {
        alerts.push(`Market VaR Breach: $${(comp.var99_1d/1e6).toFixed(1)}M exceeds policy limit of $${(base.marketRisk.varLimit/1e6).toFixed(0)}M`);
    } else if (comp.var99_1d >= base.marketRisk.varWarningThreshold) {
        alerts.push(`Market VaR warning: Approaching internal risk appetite threshold.`);
    }
    
    comp.counterparties.forEach(cp => {
        if (cp.exposure >= cp.limit) {
            alerts.push(`Counterparty Limit Breach: ${cp.name} exposure of $${(cp.exposure/1e6).toFixed(1)}M exceeds credit limit of $${(cp.limit/1e6).toFixed(0)}M`);
        }
    });
    
    if (comp.lcr < 100) {
        alerts.push(`Regulatory Liquidity Breach: LCR at ${comp.lcr.toFixed(1)}% falls below Basel III 100% minimum.`);
    }
    
    return alerts;
}

/**
 * Handle Slider inputs and triggers real-time state recalculation
 */
function attachSliderListeners(container) {
    const slEq = container.querySelector("#slider-equity");
    const slRt = container.querySelector("#slider-rate");
    const slVl = container.querySelector("#slider-vol");
    const slSp = container.querySelector("#slider-spread");
    
    const valEq = container.querySelector("#equity-val");
    const valRt = container.querySelector("#rate-val");
    const valVl = container.querySelector("#vol-val");
    const valSp = container.querySelector("#spread-val");
    
    const onSliderInput = () => {
        const equity = parseInt(slEq.value);
        const rate = parseInt(slRt.value);
        const vol = parseInt(slVl.value);
        const spread = parseInt(slSp.value);
        
        // Update label values
        valEq.innerText = (equity > 0 ? '+' : '') + equity + '%';
        valRt.innerText = (rate > 0 ? '+' : '') + rate + ' bps';
        valVl.innerText = '+' + vol + '%';
        valSp.innerText = '+' + spread + ' bps';
        
        // Push state update
        updateState({
            equityPrice: equity,
            interestRate: rate,
            volatility: vol,
            creditSpreads: spread
        }, null);
    };
    
    // Bind to 'input' event for live tracking as slider moves
    slEq.addEventListener("input", onSliderInput);
    slRt.addEventListener("input", onSliderInput);
    slVl.addEventListener("input", onSliderInput);
    slSp.addEventListener("input", onSliderInput);
    
    // Reset button
    container.querySelector("#reset-sim-btn").addEventListener("click", () => {
        updateState({
            equityPrice: 0,
            interestRate: 0,
            volatility: 0,
            creditSpreads: 0
        }, STRESS_SCENARIOS.baseline);
    });
}

/**
 * Handle Preset selectors
 */
function attachPresetListeners(container) {
    const presetBtns = container.querySelectorAll(".preset-btn");
    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const presetId = btn.getAttribute("data-preset-id");
            const preset = STRESS_SCENARIOS[presetId];
            
            updateState({
                equityPrice: preset.shocks.equityPrice,
                interestRate: preset.shocks.interestRate,
                volatility: preset.shocks.volatility,
                creditSpreads: preset.shocks.creditSpreads
            }, preset);
        });
    });
}

/**
 * Draw mini asset allocation bar comparisons
 */
function initSimComparisonChart() {
    const comp = appState.computed;
    const base = appState.base;
    const s = appState.shocks;
    
    const eqWeight = 0.45;
    const fiWeight = 0.40;
    const comWeight = 0.10;
    const cashWeight = 0.05;
    const fiDuration = 6.2;
    
    const eqReturn = s.equityPrice / 100;
    const fiReturn = -fiDuration * (s.interestRate / 10000);
    const comReturn = (s.equityPrice * 0.4) / 100;
    
    const eqValue = base.portfolio.totalValue * eqWeight * (1 + eqReturn);
    const fiValue = base.portfolio.totalValue * fiWeight * (1 + fiReturn);
    const comValue = base.portfolio.totalValue * comWeight * (1 + comReturn);
    const cashValue = base.portfolio.totalValue * cashWeight;
    const sum = eqValue + fiValue + comValue + cashValue;
    
    const stressedPct = [
        ((eqValue / sum) * 100).toFixed(1),
        ((fiValue / sum) * 100).toFixed(1),
        ((comValue / sum) * 100).toFixed(1),
        ((cashValue / sum) * 100).toFixed(1)
    ];
    
    const baselinePct = [45.0, 40.0, 10.0, 5.0];
    
    const compCtx = document.getElementById("sim-comparison-chart").getContext("2d");
    new Chart(compCtx, {
        type: 'bar',
        data: {
            labels: ['Equities', 'Fixed Income', 'Commodities', 'Cash & Equiv.'],
            datasets: [
                {
                    label: 'Stressed Portfolio %',
                    data: stressedPct,
                    backgroundColor: 'rgba(56, 189, 248, 0.85)',
                    borderColor: '#38bdf8',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Baseline Allocation %',
                    data: baselinePct,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
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
                    labels: { color: '#94a3b8', font: { family: 'Outfit', size: 9 } }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 9 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { 
                        color: '#64748b', 
                        font: { family: 'Outfit', size: 9 },
                        callback: function(value) { return value + '%'; }
                    },
                    max: 60
                }
            }
        }
    });
}
