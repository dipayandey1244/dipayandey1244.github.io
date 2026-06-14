import { appState } from './app.js';

// Selected quadrant filter state (null means all)
let selectedFilter = null; // { likelihood, impact }

/**
 * Render Operational Risk & Controls View
 */
export function renderOperationalRisk(container) {
    const base = appState.base;
    
    // Sum total operational loss
    const totalLoss = base.operationalRisk.incidents.reduce((acc, inc) => acc + inc.loss, 0);

    container.innerHTML = `
        <!-- Metrics Row -->
        <div class="risk-grid">
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-coins"></i> YTD Operational Losses</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large text-danger">$${(totalLoss/1e3).toFixed(1)}K</span>
                    <span class="metric-subtitle">Across ${base.operationalRisk.incidents.length} recorded events</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-triangle-exclamation"></i> Critical Red KRIs</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large text-warning">2 Warnings</span>
                    <span class="metric-subtitle">KRI limit exceedances</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-clipboard-check"></i> RCSAs Completed</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large text-success">98.5%</span>
                    <span class="metric-subtitle">Annual control assessment coverage</span>
                </div>
            </div>
            
            <div class="card col-3">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-shield-halved"></i> Control Effectiveness</span>
                </div>
                <div class="metric-summary">
                    <span class="metric-value-large">Strong</span>
                    <span class="metric-subtitle">Audit Rating: Satisfactory</span>
                </div>
            </div>
        </div>
        
        <!-- Interactive Heatmap and KRI status -->
        <div class="risk-grid">
            <div class="card col-12">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-table-cells"></i> Interactive Risk & Control Self Assessment (RCSA) Matrix</span>
                    ${selectedFilter ? `<button class="btn btn-secondary" id="clear-heatmap-filter" style="padding: 4px 8px; font-size: 11px;"><i class="fa-solid fa-filter-circle-xmark"></i> Clear Filter</button>` : ''}
                </div>
                
                <div class="heatmap-layout">
                    <!-- Heatmap Grid -->
                    <div class="heatmap-grid-container">
                        <div class="heatmap-wrapper">
                            <div class="heatmap-y-axis">
                                <div>5 - Certain</div>
                                <div>4 - Likely</div>
                                <div>3 - Possible</div>
                                <div>2 - Unlikely</div>
                                <div>1 - Rare</div>
                            </div>
                            <div class="heatmap-core">
                                ${base.operationalRisk.rcsaMatrix.map((row, rIndex) => {
                                    const likelihood = 5 - rIndex;
                                    return `
                                        <div class="heatmap-row">
                                            ${row.map((cell, cIndex) => {
                                                const impact = cIndex + 1;
                                                const isActive = selectedFilter && selectedFilter.likelihood === likelihood && selectedFilter.impact === impact;
                                                const activeClass = isActive ? 'active-cell' : '';
                                                
                                                return `
                                                    <div class="heatmap-cell ${cell.level} ${activeClass}" 
                                                         data-likelihood="${likelihood}" 
                                                         data-impact="${impact}">
                                                        ${cell.count}
                                                        <span>L${likelihood} x I${impact}</span>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div class="heatmap-x-axis">
                            <div>1 - Insignif.</div>
                            <div>2 - Minor</div>
                            <div>3 - Moderate</div>
                            <div>4 - Major</div>
                            <div>5 - Critical</div>
                        </div>
                    </div>
                    
                    <!-- Selected cell drill-down panel -->
                    <div class="heatmap-drilldown">
                        <h3 id="drilldown-title">
                            ${selectedFilter 
                                ? `<i class="fa-solid fa-filter"></i> Coordinates: L${selectedFilter.likelihood} x I${selectedFilter.impact}` 
                                : '<i class="fa-solid fa-folder-open"></i> Full Incident Register Preview'}
                        </h3>
                        <ul class="incident-log-small" id="drilldown-incidents-list">
                            ${generateDrilldownListHtml(base.operationalRisk.incidents)}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Detailed incident register -->
        <div class="risk-grid">
            <div class="card col-12">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-bug"></i> Operational Loss Event Logs</span>
                    <span style="font-size: 11px; color: var(--text-muted);">Audit-trail of operational risk occurrences</span>
                </div>
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Incident ID</th>
                                <th>Date</th>
                                <th>Risk Event Details</th>
                                <th>Category</th>
                                <th>Likelihood / Impact</th>
                                <th>Financial Impact</th>
                                <th>Mitigation Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateFullIncidentTableRows(base.operationalRisk.incidents)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // Attach event listeners
    attachHeatmapEvents(container);
}

/**
 * Filter and generate small drilldown list html
 */
function generateDrilldownListHtml(incidents) {
    const filtered = selectedFilter 
        ? incidents.filter(inc => inc.likelihood === selectedFilter.likelihood && inc.impact === selectedFilter.impact)
        : incidents;
        
    if (filtered.length === 0) {
        return `<li style="text-align: center; color: var(--text-muted); padding: 20px 0;">No active incidents recorded at these risk coordinates.</li>`;
    }
    
    return filtered.map(inc => `
        <li>
            <div class="incident-header">
                <span><strong>${inc.id}</strong></span>
                <span class="${inc.loss > 100000 ? 'text-danger' : 'text-warning'}">$${(inc.loss/1e3).toFixed(1)}K Loss</span>
            </div>
            <div class="incident-desc">${inc.title}</div>
            <div class="incident-desc" style="font-size: 10px; margin-top: 2px;">Category: ${inc.category} | status: ${inc.status}</div>
        </li>
    `).join('');
}

/**
 * Generate rows for the full incident list
 */
function generateFullIncidentTableRows(incidents) {
    const filtered = selectedFilter 
        ? incidents.filter(inc => inc.likelihood === selectedFilter.likelihood && inc.impact === selectedFilter.impact)
        : incidents;
        
    if (filtered.length === 0) {
        return `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">No incident matches the active heatmap coordinates filters.</td></tr>`;
    }
    
    return filtered.map(inc => `
        <tr>
            <td><strong>${inc.id}</strong></td>
            <td>${inc.date}</td>
            <td><strong>${inc.title}</strong></td>
            <td>${inc.category}</td>
            <td class="value-cell">L${inc.likelihood} x I${inc.impact}</td>
            <td class="value-cell text-danger">$${inc.loss.toLocaleString()}</td>
            <td><span class="stat-badge ${inc.status === 'Resolved' ? 'badge-neutral text-success' : 'badge-warning'}">${inc.status}</span></td>
        </tr>
    `).join('');
}

/**
 * Register Click events on Heatmap cell items
 */
function attachHeatmapEvents(container) {
    const cells = container.querySelectorAll(".heatmap-cell");
    cells.forEach(cell => {
        cell.addEventListener("click", () => {
            const likelihood = parseInt(cell.getAttribute("data-likelihood"));
            const impact = parseInt(cell.getAttribute("data-impact"));
            
            // Toggle filter
            if (selectedFilter && selectedFilter.likelihood === likelihood && selectedFilter.impact === impact) {
                selectedFilter = null;
            } else {
                selectedFilter = { likelihood, impact };
            }
            
            // Re-render
            renderOperationalRisk(container);
        });
    });
    
    const clearBtn = container.querySelector("#clear-heatmap-filter");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            selectedFilter = null;
            renderOperationalRisk(container);
        });
    }
}
