import { appState } from './app.js';

/**
 * Render Executive Briefing / Report View
 */
export function renderReporter(container) {
    const comp = appState.computed;
    const base = appState.base;
    const scen = appState.scenario;
    const shocks = appState.shocks;
    
    const change = ((comp.portfolioValue - base.portfolio.totalValue) / base.portfolio.totalValue) * 100;
    
    // Generate default briefing commentary text based on active shocks
    const defaultCommentary = `EXECUTIVE EVALUATION SUMMARY:
Under the active stress environment [${scen.name}], the fund valuation is modeled at $${(comp.portfolioValue/1e9).toFixed(3)}B, representing a variance of ${change.toFixed(2)}% from baseline AUM.

1. MARKET RISK: Stressed 99% 1-Day VaR is calculated at $${(comp.var99_1d/1e6).toFixed(2)}M, compared to the board limit of $30.0M. Expected Shortfall (tail risk) is $${(comp.expectedShortfall/1e6).toFixed(2)}M. 

2. CREDIT RISK: Interbank exposure totals $${(comp.counterparties.reduce((acc, cp) => acc + cp.exposure, 0)/1e6).toFixed(1)}M with Expected Credit Loss (ECL) standing at $${(comp.creditLoss/1e6).toFixed(2)}M.

3. LIQUIDITY: The liquid asset buffer (HQLA) sits at $${(comp.hqla/1e6).toFixed(1)}M, yielding a Liquidity Coverage Ratio (LCR) of ${comp.lcr.toFixed(1)}% (regulatory threshold: 100%). Survival horizon under severe rollover freeze is estimated at ${comp.survivalHorizon} days.

STRATEGIC RECOMMENDATIONS:
- Trim equity exposures by 5% and reallocate capital to AAA sovereign fixed income to protect against volatility creep.
- Monitor counterparty limits, particularly BNP Paribas and Societe Generale, which show elevated limit utilization.`;

    container.innerHTML = `
        <div class="report-controls-panel">
            <span style="font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-circle-info text-info"></i> Edit commentary text below. PDF downloads render the exact layout.
            </span>
            <div style="display: flex; gap: 12px;">
                <button class="btn btn-secondary" id="btn-system-print"><i class="fa-solid fa-print"></i> System Print</button>
                <button class="btn btn-primary" id="btn-export-pdf"><i class="fa-solid fa-file-pdf"></i> Download PDF Report</button>
            </div>
        </div>

        <div class="report-container" id="report-sheet">
            <!-- Header section -->
            <div class="report-header-sheet">
                <div class="report-header-left">
                    <h2>Executive Risk Briefing</h2>
                    <p>${base.portfolio.name}</p>
                </div>
                <div class="report-metadata">
                    <div>Valuation Date: ${base.portfolio.valuationDate}</div>
                    <div>Run Date: ${new Date().toISOString().slice(0, 10)}</div>
                    <div>Prepared by: Dipayan Dey, VP</div>
                    <div>Risk Engine Status: <strong class="text-success">Validated</strong></div>
                </div>
            </div>
            
            <!-- Summary Stats Table -->
            <div class="report-section">
                <h3>I. Executive Metric Summary</h3>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Stressor Metrics</th>
                                <th>Baseline</th>
                                <th>Stressed Valuation</th>
                                <th>Change % / Basis</th>
                                <th>Compliance Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Fund Valuation (AUM)</strong></td>
                                <td>$${(base.portfolio.totalValue/1e9).toFixed(3)}B</td>
                                <td>$${(comp.portfolioValue/1e9).toFixed(3)}B</td>
                                <td>${change.toFixed(2)}%</td>
                                <td><span class="text-success"><i class="fa-solid fa-circle-check"></i> Normal</span></td>
                            </tr>
                            <tr>
                                <td><strong>99% 1-Day Value at Risk</strong></td>
                                <td>$${(base.marketRisk.var99_1d/1e6).toFixed(2)}M</td>
                                <td>$${(comp.var99_1d/1e6).toFixed(2)}M</td>
                                <td>+${(((comp.var99_1d - base.marketRisk.var99_1d)/base.marketRisk.var99_1d)*100).toFixed(1)}%</td>
                                <td>
                                    <span class="${comp.var99_1d >= base.marketRisk.varLimit ? 'text-danger' : comp.var99_1d >= base.marketRisk.varWarningThreshold ? 'text-warning' : 'text-success'}">
                                        ${comp.var99_1d >= base.marketRisk.varLimit ? 'BREACHED' : 'COMPLIANT'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Expected Credit Loss</strong></td>
                                <td>$${(base.creditRisk.expectedCreditLoss/1e6).toFixed(2)}M</td>
                                <td>$${(comp.creditLoss/1e6).toFixed(2)}M</td>
                                <td>+${(((comp.creditLoss - base.creditRisk.expectedCreditLoss)/base.creditRisk.expectedCreditLoss)*100).toFixed(1)}%</td>
                                <td><span class="text-success"><i class="fa-solid fa-circle-check"></i> Covered</span></td>
                            </tr>
                            <tr>
                                <td><strong>Liquidity Ratio (LCR)</strong></td>
                                <td>${base.liquidityRisk.lcr.toFixed(1)}%</td>
                                <td>${comp.lcr.toFixed(1)}%</td>
                                <td>${(comp.lcr - base.liquidityRisk.lcr).toFixed(1)}%</td>
                                <td>
                                    <span class="${comp.lcr < 100 ? 'text-danger' : comp.lcr < 115 ? 'text-warning' : 'text-success'}">
                                        ${comp.lcr < 100 ? 'BREACHED' : 'COMPLIANT'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Commentary section -->
            <div class="report-section">
                <h3>II. Risk commentary & stress assessment</h3>
                <textarea class="report-commentary-editor" id="report-commentary-box">${defaultCommentary}</textarea>
                <!-- This div is shown in print instead of the textarea -->
                <div class="print-commentary-display" id="print-commentary-text"></div>
            </div>
            
            <!-- Side-by-side Sub-component ledgers -->
            <div class="report-table-grid">
                <div>
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Counterparty Standings</h4>
                    <table class="data-table" style="font-size: 11px;">
                        <thead>
                            <tr>
                                <th>Entity</th>
                                <th>Exposure</th>
                                <th>Limit</th>
                                <th>Util.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comp.counterparties.slice(0, 3).map(cp => `
                                <tr>
                                    <td><strong>${cp.name}</strong></td>
                                    <td>$${(cp.exposure/1e6).toFixed(1)}M</td>
                                    <td>$${(cp.limit/1e6).toFixed(0)}M</td>
                                    <td class="${(cp.exposure/cp.limit) >= 1.0 ? 'text-danger font-bold' : (cp.exposure/cp.limit) >= 0.9 ? 'text-warning' : 'text-success'}">
                                        ${((cp.exposure/cp.limit)*100).toFixed(0)}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div>
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Key Risk Indicators</h4>
                    <table class="data-table" style="font-size: 11px;">
                        <thead>
                            <tr>
                                <th>KRI Metric</th>
                                <th>Current</th>
                                <th>Policy Limit</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${base.operationalRisk.kris.slice(0, 3).map(kri => `
                                <tr>
                                    <td>${kri.name}</td>
                                    <td><strong>${kri.value}</strong></td>
                                    <td>${kri.threshold}</td>
                                    <td class="${kri.status === 'success' ? 'text-success' : 'text-warning'}">
                                        ${kri.status.toUpperCase()}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="report-section" style="margin-bottom: 0; border-top: 1px solid var(--border-light); padding-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted);">
                <span>Active Scenario: <strong>${scen.name}</strong> (Eq: ${shocks.equityPrice}%, Rates: ${shocks.interestRate}bps, Vol: +${shocks.volatility}%)</span>
                <span>Antigrav Analytics Engine v2.4</span>
            </div>
        </div>
    `;
    
    // Bind print utilities
    setupReportActions(container);
}

/**
 * Handle print actions and export PDF bindings
 */
function setupReportActions(container) {
    const commentaryBox = container.querySelector("#report-commentary-box");
    const printDisplay = container.querySelector("#print-commentary-text");
    
    // Sync textarea text with printable element
    const syncText = () => {
        printDisplay.innerText = commentaryBox.value;
    };
    
    commentaryBox.addEventListener("input", syncText);
    syncText(); // initial sync
    
    // System Print
    container.querySelector("#btn-system-print").addEventListener("click", () => {
        window.print();
    });
    
    // Download PDF (html2pdf)
    container.querySelector("#btn-export-pdf").addEventListener("click", () => {
        const element = document.getElementById('report-sheet');
        const opt = {
            margin:       [0.4, 0.4, 0.4, 0.4],
            filename:     `Executive_Risk_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#0b0f19', // Preserve dark theme in PDF
                scrollY: 0,
                scrollX: 0
            },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        // Temporarily set overflow auto and margins to print properly in html2pdf
        element.style.borderRadius = "0";
        element.style.boxShadow = "none";
        
        html2pdf().set(opt).from(element).save().then(() => {
            // Restore visual layout styles
            element.style.borderRadius = "12px";
            element.style.boxShadow = "0 10px 40px rgba(0, 0, 0, 0.4)";
        });
    });
}
