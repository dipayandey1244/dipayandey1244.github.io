import { INITIAL_DATA, STRESS_SCENARIOS } from './data.js';
import { renderMarketRisk } from './market-risk.js';
import { renderCreditRisk } from './credit-risk.js';
import { renderLiquidityRisk } from './liquidity-risk.js';
import { renderOperationalRisk } from './operational-risk.js';
import { renderSimulator } from './simulator.js';
import { renderReporter } from './reporter.js';
import { renderMethodology } from './methodology.js';

// Global state container
export const appState = {
    // Original Baseline Data reference
    base: INITIAL_DATA,
    
    // Current active stress configuration
    scenario: STRESS_SCENARIOS.baseline,
    
    // Override sliders
    shocks: {
        equityPrice: 0,
        interestRate: 0,
        volatility: 0,
        creditSpreads: 0
    },
    
    // Dynamically computed metrics under active stress
    computed: {
        portfolioValue: INITIAL_DATA.portfolio.totalValue,
        var99_1d: INITIAL_DATA.marketRisk.var99_1d,
        var95_1d: INITIAL_DATA.marketRisk.var95_1d,
        expectedShortfall: INITIAL_DATA.marketRisk.expectedShortfall,
        
        creditLoss: INITIAL_DATA.creditRisk.expectedCreditLoss,
        counterparties: JSON.parse(JSON.stringify(INITIAL_DATA.creditRisk.counterparties)),
        
        hqla: INITIAL_DATA.liquidityRisk.hqla,
        outflows: INITIAL_DATA.liquidityRisk.netOutflows30d,
        lcr: INITIAL_DATA.liquidityRisk.lcr,
        survivalHorizon: INITIAL_DATA.liquidityRisk.survivalHorizonDays,
        
        alertsCount: 0,
        systemStatus: "Within Limits"
    },
    
    activeTab: "overview"
};

/**
 * Recalculate portfolio risk metrics based on current active shocks
 */
export function recalculateState() {
    const s = appState.shocks;
    const base = appState.base;
    const comp = appState.computed;
    
    // 1. Market Portfolio Value Calculation (under shocks)
    // Equities: 45% weighting
    // Fixed Income: 40% weighting (assumed duration of 6.2 years)
    // Commodities: 10% weighting
    // Cash: 5% weighting
    const eqWeight = 0.45;
    const fiWeight = 0.40;
    const comWeight = 0.10;
    const cashWeight = 0.05;
    const fiDuration = 6.2;
    
    const baseVal = base.portfolio.totalValue;
    
    const eqReturn = s.equityPrice / 100;
    const fiReturn = -fiDuration * (s.interestRate / 10000); // 1bp = 0.0001
    const comReturn = (s.equityPrice * 0.4) / 100; // Commodities correlate with equities shock
    const cashReturn = 0.0;
    
    const totalReturn = (eqReturn * eqWeight) + (fiReturn * fiWeight) + (comReturn * comWeight) + (cashReturn * cashWeight);
    comp.portfolioValue = baseVal * (1 + totalReturn);
    
    // 2. VaR and Volatility adjust
    // Volatility shock scales non-linearly (sqrt of variance increase)
    const volScale = Math.sqrt(1 + (s.volatility / 100));
    // Credit spread widening increases default and market VaR
    const spreadScale = 1 + (s.creditSpreads / 2500); 
    
    comp.var99_1d = base.marketRisk.var99_1d * volScale * spreadScale;
    comp.var95_1d = base.marketRisk.var95_1d * volScale * spreadScale;
    comp.expectedShortfall = base.marketRisk.expectedShortfall * volScale * spreadScale;
    
    // 3. Credit Risk: Expected Credit Loss (ECL) & rating migrations
    // ECL increases when spreads expand and equity drop (signaling defaults)
    const eclMultiplier = (1 + (s.creditSpreads / 100)) * (1 - (s.equityPrice / 150));
    comp.creditLoss = base.creditRisk.expectedCreditLoss * eclMultiplier;
    
    // Counterparty exposures shift (derivatives exposure spikes under high volatility)
    const counterpartyScale = 1 + (s.volatility / 200);
    comp.counterparties = base.creditRisk.counterparties.map(cp => {
        const newExposure = cp.exposure * counterpartyScale * (1 + (s.creditSpreads / 4000));
        return {
            ...cp,
            exposure: Math.min(newExposure, cp.limit * 1.25) // Caps default migration at 125% of limit
        };
    });
    
    // 4. Liquidity: Cash flows and HQLA haircuts
    // High volatility and equity drops trigger margins, hair-cutting HQLA (e.g. equities in HQLA value slashed)
    const hqlaHaircut = (s.equityPrice < 0 ? (s.equityPrice * 0.25) : 0) / 100; 
    comp.hqla = base.liquidityRisk.hqla * (1 + hqlaHaircut);
    
    // Funding stress increases outflows
    const outflowStressor = 1 + (s.creditSpreads / 1000) + (s.volatility / 300);
    comp.outflows = base.liquidityRisk.netOutflows30d * outflowStressor;
    comp.lcr = (comp.hqla / comp.outflows) * 100;
    
    // Survival horizon is squeezed
    comp.survivalHorizon = Math.max(
        Math.round(base.liquidityRisk.survivalHorizonDays / outflowStressor),
        5 // minimum floor
    );
    
    // 5. System Status and Limits Alerts Check
    let alerts = [];
    
    // Market risk limits check
    if (comp.var99_1d >= base.marketRisk.varLimit) {
        alerts.push(`Market VaR Limit Breach: $${(comp.var99_1d/1e6).toFixed(1)}M exceeds limit of $${(base.marketRisk.varLimit/1e6).toFixed(1)}M`);
    } else if (comp.var99_1d >= base.marketRisk.varWarningThreshold) {
        alerts.push(`Market VaR Warning Threshold Exceeded`);
    }
    
    // Credit limits check
    comp.counterparties.forEach(cp => {
        if (cp.exposure >= cp.limit) {
            alerts.push(`Credit Limit Breach: ${cp.name} exposure of $${(cp.exposure/1e6).toFixed(1)}M exceeds limit of $${(cp.limit/1e6).toFixed(1)}M`);
        } else if (cp.exposure >= cp.limit * 0.9) {
            alerts.push(`Credit Limit Warning: ${cp.name} approaching 90% limit utilization`);
        }
    });
    
    // Liquidity LCR check
    if (comp.lcr < base.liquidityRisk.lcrLimit) {
        alerts.push(`Regulatory LCR Limit Breach: ${comp.lcr.toFixed(1)}% is below 100% minimum`);
    } else if (comp.lcr < base.liquidityRisk.lcrWarningThreshold) {
        alerts.push(`Liquidity Warning: LCR of ${comp.lcr.toFixed(1)}% has entered warning zone`);
    }
    
    comp.alertsCount = alerts.length;
    
    // Calculate global status
    const hasBreaches = alerts.some(a => a.includes("Breach"));
    if (hasBreaches) {
        comp.systemStatus = "Limit Breach Alert";
    } else if (alerts.length > 0) {
        comp.systemStatus = "Warning Alert";
    } else {
        comp.systemStatus = "Within Limits";
    }
}

/**
 * Topbar visual updates
 */
function updateTopbarUI() {
    const comp = appState.computed;
    const scen = appState.scenario;
    
    // Market status
    const marketInd = document.getElementById("market-status-indicator");
    if (comp.systemStatus === "Limit Breach Alert") {
        marketInd.className = "stat-value text-danger";
        marketInd.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Limit Breach`;
    } else if (comp.systemStatus === "Warning Alert") {
        marketInd.className = "stat-value text-warning";
        marketInd.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Warning Active`;
    } else {
        marketInd.className = "stat-value text-success";
        marketInd.innerHTML = `<i class="fa-solid fa-circle-check"></i> Within Limits`;
    }
    
    // Alerts Count
    const alertInd = document.getElementById("alerts-count-indicator");
    if (comp.alertsCount > 0) {
        alertInd.className = comp.systemStatus === "Limit Breach Alert" ? "stat-value text-danger" : "stat-value text-warning";
        alertInd.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${comp.alertsCount} Alert${comp.alertsCount > 1 ? 's' : ''}`;
    } else {
        alertInd.className = "stat-value text-success";
        alertInd.innerHTML = `<i class="fa-solid fa-circle-check"></i> 0 Active Alerts`;
    }
    
    // Scenario Badge
    const badge = document.getElementById("simulation-status-badge");
    badge.innerText = scen.name;
    if (scen.id === "baseline") {
        badge.className = "stat-badge badge-neutral";
    } else {
        badge.className = comp.systemStatus === "Limit Breach Alert" ? "stat-badge badge-danger" : "stat-badge badge-warning";
    }
}

/**
 * Render dynamic Executive Summary layout (Overview Tab)
 */
function renderOverviewTab(container) {
    const comp = appState.computed;
    const base = appState.base;
    const change = ((comp.portfolioValue - base.portfolio.totalValue) / base.portfolio.totalValue) * 100;
    
    const portfolioChangeHtml = change === 0 
        ? `<span class="metric-trend trend-stable"><i class="fa-solid fa-minus"></i> Stable</span>`
        : change > 0 
            ? `<span class="metric-trend trend-down"><i class="fa-solid fa-arrow-up"></i> +${change.toFixed(2)}%</span>` // In risk view, portfolio going up could be good
            : `<span class="metric-trend trend-up"><i class="fa-solid fa-arrow-down"></i> ${change.toFixed(2)}%</span>`; // Green is down? No, trend-up means danger here!
            
    container.innerHTML = `
        <!-- High Level Summary cards -->
        <div class="risk-grid">
            <div class="card col-3 accent-market">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-wallet"></i> Portfolio Value</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">$${(comp.portfolioValue/1e9).toFixed(3)}B</span>
                    ${portfolioChangeHtml}
                    <span class="metric-subtitle">AUM Net Valuation</span>
                </div>
            </div>
            
            <div class="card col-3 accent-credit">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-chart-area"></i> 1-Day VaR (99%)</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large ${comp.var99_1d >= base.marketRisk.varLimit ? 'text-danger' : comp.var99_1d >= base.marketRisk.varWarningThreshold ? 'text-warning' : 'text-success'}">$${(comp.var99_1d/1e6).toFixed(2)}M</span>
                    <span class="metric-subtitle">Limit: $${(base.marketRisk.varLimit/1e6).toFixed(0)}M (${((comp.var99_1d/comp.portfolioValue)*100).toFixed(2)}% of AUM)</span>
                </div>
            </div>
            
            <div class="card col-3 accent-liquidity">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-droplet"></i> Liquidity Ratio (LCR)</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large ${comp.lcr < base.liquidityRisk.lcrLimit ? 'text-danger' : comp.lcr < base.liquidityRisk.lcrWarningThreshold ? 'text-warning' : 'text-success'}">${comp.lcr.toFixed(1)}%</span>
                    <span class="metric-subtitle">Regulatory Min: 100%</span>
                </div>
            </div>
            
            <div class="card col-3 accent-operational">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-triangle-exclamation"></i> KRI Deviations</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large ${comp.alertsCount > 0 ? 'text-warning' : 'text-success'}">${comp.alertsCount}</span>
                    <span class="metric-subtitle">Limit Threshold Excursions</span>
                </div>
            </div>
        </div>
        
        <!-- Dashboard Charts and Tables -->
        <div class="risk-grid">
            <div class="card col-8">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-chart-line"></i> Historical VaR Exposure</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="overview-var-chart"></canvas>
                </div>
            </div>
            
            <div class="card col-4">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-pie-chart"></i> Asset Allocation</span>
                </div>
                <div class="chart-container height-large">
                    <canvas id="overview-alloc-chart"></canvas>
                </div>
            </div>
        </div>

        <div class="risk-grid">
            <div class="card col-6">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-building-columns"></i> Counterparty Exposures</span>
                    <button class="card-action-btn" id="go-to-credit-tab">Manage Credit <i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Counterparty</th>
                                <th>Rating</th>
                                <th>Exposure</th>
                                <th>Limit</th>
                                <th>Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comp.counterparties.slice(0, 4).map(cp => {
                                const util = (cp.exposure / cp.limit) * 100;
                                const isBreached = util >= 100;
                                const isWarn = util >= 90 && util < 100;
                                const barColorClass = isBreached ? 'fill-danger' : isWarn ? 'fill-warning' : 'fill-success';
                                const textColorClass = isBreached ? 'text-danger' : isWarn ? 'text-warning' : 'text-success';
                                
                                return `
                                    <tr>
                                        <td><strong>${cp.name}</strong></td>
                                        <td><span class="rating-badge">${cp.rating}</span></td>
                                        <td class="value-cell">$${(cp.exposure/1e6).toFixed(1)}M</td>
                                        <td class="value-cell">$${(cp.limit/1e6).toFixed(0)}M</td>
                                        <td class="progress-bar-cell">
                                            <div class="progress-track">
                                                <div class="progress-fill ${barColorClass}" style="width: ${Math.min(util, 100)}%"></div>
                                            </div>
                                            <span style="font-size: 10px;" class="${textColorClass}">${util.toFixed(1)}%</span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card col-6">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-gears"></i> Key Risk Indicators (KRIs)</span>
                    <button class="card-action-btn" id="go-to-op-tab">View Logs <i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Metric Indicator</th>
                                <th>Current Value</th>
                                <th>Policy Limit</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${base.operationalRisk.kris.map(kri => {
                                const badgeClass = kri.status === 'success' ? 'badge-neutral text-success' : 'badge-warning';
                                return `
                                    <tr>
                                        <td><strong>${kri.name}</strong></td>
                                        <td class="value-cell">${kri.value}</td>
                                        <td class="value-cell">${kri.threshold}</td>
                                        <td>
                                            <span class="stat-badge ${badgeClass}">${kri.status === 'success' ? 'Normal' : 'Warning'}</span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // Setup Navigation Shortcuts
    document.getElementById("go-to-credit-tab").addEventListener("click", () => switchTab("credit"));
    document.getElementById("go-to-op-tab").addEventListener("click", () => switchTab("operational"));
    
    // Draw Overview Charts
    initOverviewCharts();
}

/**
 * Initialize charts for the Executive Summary view
 */
function initOverviewCharts() {
    const hist = appState.base.marketRisk.historicalVaR;
    const comp = appState.computed;
    const base = appState.base;
    
    // 1. VaR Historical Chart
    const varCtx = document.getElementById("overview-var-chart").getContext("2d");
    
    // Apply Volatility Scale to historical array to show stress shifts visually
    const activeMultiplier = comp.var99_1d / base.marketRisk.var99_1d;
    
    const labels = hist.map(h => h.date);
    const data99 = hist.map(h => h.var99 * activeMultiplier);
    const data95 = hist.map(h => h.var95 * activeMultiplier);
    
    new Chart(varCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '99% Value at Risk (1d)',
                    data: data99,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2
                },
                {
                    label: '95% Value at Risk (1d)',
                    data: data95,
                    borderColor: '#38bdf8',
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    borderWidth: 2
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
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
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
    
    // 2. Doughnut Chart for Asset Class Allocation
    const allocCtx = document.getElementById("overview-alloc-chart").getContext("2d");
    
    // Compute current weightings based on shock movements
    const eqWeight = 0.45;
    const fiWeight = 0.40;
    const comWeight = 0.10;
    const cashWeight = 0.05;
    const fiDuration = 6.2;
    const s = appState.shocks;
    
    const eqReturn = s.equityPrice / 100;
    const fiReturn = -fiDuration * (s.interestRate / 10000);
    const comReturn = (s.equityPrice * 0.4) / 100;
    
    const eqValue = base.portfolio.totalValue * eqWeight * (1 + eqReturn);
    const fiValue = base.portfolio.totalValue * fiWeight * (1 + fiReturn);
    const comValue = base.portfolio.totalValue * comWeight * (1 + comReturn);
    const cashValue = base.portfolio.totalValue * cashWeight;
    const sum = eqValue + fiValue + comValue + cashValue;
    
    new Chart(allocCtx, {
        type: 'doughnut',
        data: {
            labels: ['Equities', 'Fixed Income', 'Commodities', 'Cash & Equiv.'],
            datasets: [{
                data: [
                    ((eqValue / sum) * 100).toFixed(1), 
                    ((fiValue / sum) * 100).toFixed(1), 
                    ((comValue / sum) * 100).toFixed(1), 
                    ((cashValue / sum) * 100).toFixed(1)
                ],
                backgroundColor: ['#38bdf8', '#6366f1', '#f59e0b', '#10b981'],
                borderWidth: 2,
                borderColor: '#111827'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                }
            },
            cutout: '65%'
        }
    });
}

/**
 * Perform navigation tab switching
 */
export function switchTab(tabName) {
    appState.activeTab = tabName;
    
    // Update Sidebar Navigation state
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        if (item.getAttribute("data-tab") === tabName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
    
    // Update Topbar titles
    const titleNode = document.getElementById("active-tab-title");
    const descNode = document.getElementById("active-tab-desc");
    const container = document.getElementById("viewport");
    
    // Render the view according to tab selected
    if (tabName === "overview") {
        titleNode.innerText = "Executive Summary";
        descNode.innerText = "Comprehensive view of institutional risk metrics and limits.";
        renderOverviewTab(container);
    } else if (tabName === "market") {
        titleNode.innerText = "Market Risk Management";
        descNode.innerText = "Value at Risk analysis, Expected Shortfalls, and volatility vectors.";
        renderMarketRisk(container);
    } else if (tabName === "credit") {
        titleNode.innerText = "Credit & Counterparty Risk";
        descNode.innerText = "Expected credit losses, rating migrations, and counterparty limits.";
        renderCreditRisk(container);
    } else if (tabName === "liquidity") {
        titleNode.innerText = "Funding & Liquidity Stress";
        descNode.innerText = "Liquidity Coverage Ratio (LCR), Net Stable Funding Ratio (NSFR), cash projections.";
        renderLiquidityRisk(container);
    } else if (tabName === "operational") {
        titleNode.innerText = "Operational Risk & Controls";
        descNode.innerText = "Risk and Control Self Assessments (RCSA), key indicators, loss registers.";
        renderOperationalRisk(container);
    } else if (tabName === "simulator") {
        titleNode.innerText = "Macro Scenario Simulator";
        descNode.innerText = "Interactive stress testing sandbox for portfolio valuation and limit triggers.";
        renderSimulator(container);
    } else if (tabName === "report") {
        titleNode.innerText = "Executive Briefing Center";
        descNode.innerText = "Generate print-ready briefings and reports for Board MD and Executive Review.";
        renderReporter(container);
    } else if (tabName === "methodology") {
        titleNode.innerText = "Methodology & Research References";
        descNode.innerText = "Academic literature and mathematical foundations governing the risk engine.";
        renderMethodology(container);
    }
}

// ==========================================================================
// BOOTSTRAP INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Initial State Recalculation
    recalculateState();
    updateTopbarUI();
    
    // Register Tab click event listeners
    const navItems = document.querySelectorAll(".nav-item[data-tab]");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabName = item.getAttribute("data-tab");
            switchTab(tabName);
        });
    });
    
    // Default to Overview Tab
    switchTab("overview");
});

// Expose state update method for simulator
export function updateState(newShocks, scenario) {
    appState.shocks = { ...appState.shocks, ...newShocks };
    if (scenario) {
        appState.scenario = scenario;
    } else {
        // If sliders move away from default, mark as custom
        appState.scenario = STRESS_SCENARIOS.baseline;
        const isCustom = Object.values(appState.shocks).some(v => v !== 0);
        if (isCustom) {
            appState.scenario = {
                id: "custom",
                name: "Custom Stress Simulation",
                description: "User defined shifts in macro risk variables."
            };
        }
    }
    
    recalculateState();
    updateTopbarUI();
    
    // Trigger immediate refresh of current active view
    switchTab(appState.activeTab);
}
