/**
 * Methodological Framework & Research References view
 * Grounds the simulator's calculations in academic finance literature and Basel regulatory standards.
 */

export function renderMethodology(container) {
    container.innerHTML = `
        <div class="risk-grid">
            <!-- Executive Literature Intro -->
            <div class="card col-12">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-graduation-cap"></i> Methodological Rigor & Theoretical Foundation</span>
                    <span class="stat-badge badge-neutral">Validated Models</span>
                </div>
                <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0;">
                    This dashboard is not merely an interactive display; its underlying calculation engines are derived from official regulatory guidelines (Basel III Accord, IFRS 9 Standards) and foundational financial econometrics. This tab presents the mathematical models and academic references that govern our real-time stress testing simulations.
                </p>
            </div>
        </div>

        <div class="risk-grid">
            <!-- Market Risk Section -->
            <div class="card col-6 accent-market">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-chart-area"></i> I. Market Risk: VaR vs. Coherent Expected Shortfall</span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.6;">
                    <h4 style="color: var(--text-primary); font-size: 13px; margin-bottom: 6px;">1. The Coherence Debate (Yamai & Yoshiba, 2002; Acerbi & Tasche, 2002)</h4>
                    <p style="margin-bottom: 12px;">
                        Value at Risk (VaR) is widely criticized in academic literature for failing to satisfy the property of <strong>sub-additivity</strong> when asset return distributions exhibit fat tails. A risk measure \(\rho\) is sub-additive if:
                        <div style="font-family: var(--font-mono); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; text-align: center; margin: 8px 0; color: var(--color-info);">
                            \(\rho(X + Y) \le \rho(X) + \rho(Y)\)
                        </div>
                        If sub-additivity is violated, merging portfolios can artificially inflate measured risk, which disincentivizes diversification. Expected Shortfall (ES) solves this as a <em>coherent</em> risk measure, calculating the conditional expectation of loss exceeding the VaR threshold:
                        <div style="font-family: var(--font-mono); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; text-align: center; margin: 8px 0; color: var(--color-info);">
                            \(\text{ES}_\alpha(X) = E[X \mid X \ge \text{VaR}_\alpha(X)]\)
                        </div>
                    </p>
                    
                    <h4 style="color: var(--text-primary); font-size: 13px; margin-bottom: 6px;">2. Active Simulation Math</h4>
                    <p>
                        In our simulator, as you adjust the volatility spike \(\Delta\sigma\) and credit spread expansion \(\Delta s\), the Value at Risk and Expected Shortfall are re-scaled using:
                        <div style="font-family: var(--font-mono); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; text-align: center; margin: 8px 0; color: var(--color-info); font-size: 11px;">
                            \(\text{VaR}_{\text{stressed}} = \text{VaR}_{\text{baseline}} \times \sqrt{1 + \frac{\Delta\sigma}{100}} \times \left(1 + \frac{\Delta s}{4000}\right)\)
                        </div>
                        This captures the non-linear relationship between asset variance shocks and portfolio loss bounds.
                    </p>
                </div>
            </div>

            <!-- Credit Risk Section -->
            <div class="card col-6 accent-credit">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-building-columns"></i> II. Credit Risk: IFRS 9 Expected Credit Loss (ECL)</span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.6;">
                    <h4 style="color: var(--text-primary); font-size: 13px; margin-bottom: 6px;">1. Impairment Staging & Duality (Porretta et al., 2020)</h4>
                    <p style="margin-bottom: 12px;">
                        The transition from IAS 39 (incurred loss) to **IFRS 9** (expected credit loss) mandates forward-looking credit provisions. Banks must model default parameters over three stages:
                        <ul style="margin-left: 20px; margin-bottom: 12px;">
                            <li><strong>Stage 1 (Performing):</strong> 12-month expected credit losses.</li>
                            <li><strong>Stage 2 (Underperforming / SICR):</strong> Lifetime expected credit losses.</li>
                            <li><strong>Stage 3 (Non-performing):</strong> Default has occurred; lifetime provisioning.</li>
                        </ul>
                        The foundational calculation for credit provisioning relies on:
                        <div style="font-family: var(--font-mono); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; text-align: center; margin: 8px 0; color: var(--color-accent);">
                            \(\text{ECL} = \text{PD} \times \text{LGD} \times \text{EAD}\)
                        </div>
                    </p>
                    
                    <h4 style="color: var(--text-primary); font-size: 13px; margin-bottom: 6px;">2. Active Simulation Math</h4>
                    <p>
                        Under macro stress testing, the average Probability of Default (PD) moves dynamically with credit spreads widening (\(\Delta s\)) and equity market shocks (\(\Delta Eq\)):
                        <div style="font-family: var(--font-mono); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; text-align: center; margin: 8px 0; color: var(--color-accent); font-size: 11px;">
                            \(\text{PD}_{\text{stressed}} = \text{PD}_{\text{baseline}} \times \left(1 + \frac{\Delta s}{200}\right) \times \left(1 - \frac{\Delta Eq}{100}\right)\)
                        </div>
                        This models the historical correlation between macroeconomic downturns, corporate balance sheet erosion, and systemic default rates.
                    </p>
                </div>
            </div>
        </div>

        <div class="risk-grid">
            <!-- Liquidity Risk Section -->
            <div class="card col-6 accent-liquidity">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-droplet"></i> III. Liquidity Risk: Basel III LCR Stress Buffers</span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.6;">
                    <h4 style="color: var(--text-primary); font-size: 13px; margin-bottom: 6px;">1. Basel III Liquidity Standards (BCBS, 2013)</h4>
                    <p style="margin-bottom: 12px;">
                        Following the 2008 funding freeze, the Basel Committee introduced the **Liquidity Coverage Ratio (LCR)**. It requires banks to maintain an adequate buffer of unencumbered High-Quality Liquid Assets (HQLA) that can be easily converted into cash to meet net liquidity cash outflows over a severe 30-day stress horizon:
                        <div style="font-family: var(--font-mono); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; text-align: center; margin: 8px 0; color: var(--color-warning);">
                            \(\text{LCR} = \frac{\text{Stock of HQLA}}{\text{Net Cash Outflows over 30 days}} \ge 100\%\)
                        </div>
                    </p>
                    
                    <h4 style="color: var(--text-primary); font-size: 13px; margin-bottom: 6px;">2. Active Simulation Math</h4>
                    <p>
                        Our simulator models asset value haircuts and systemic run-off rate surges:
                        <ul style="margin-left: 20px; margin-top: 6px;">
                            <li><strong>HQLA Value Haircut:</strong> Equities held in HQLA suffer a 25% asset haircut if \(\Delta Eq < 0\).</li>
                            <li><strong>Outflow Expansion:</strong> Outflows expand by a liquidity stress factor representing interbank funding roll-over freezes:
                                <div style="font-family: var(--font-mono); background: rgba(0,0,0,0.15); padding: 4px; margin-top: 4px; text-align: center;">
                                    \(f_{\text{stress}} = 1 + \frac{\Delta s}{1000} + \frac{\Delta \sigma}{300}\)
                                </div>
                            </li>
                        </ul>
                    </p>
                </div>
            </div>

            <!-- Academic bibliography list -->
            <div class="card col-6">
                <div class="card-header">
                    <span class="card-title"><i class="fa-solid fa-book"></i> IV. Core Academic Bibliography</span>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                    <ul style="list-style: none;">
                        <li style="margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
                            <strong style="color: var(--text-primary);">[1] Acerbi, C., & Tasche, D. (2002).</strong><br>
                            <em>"Expected Shortfall: A Natural Coherent Alternative to Value at Risk."</em> Economic Notes, 31(2), 379-388.<br>
                            <span style="font-size: 10px; color: var(--text-muted);">Key contribution: Proved the sub-additivity and coherence of Expected Shortfall.</span>
                        </li>
                        <li style="margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
                            <strong style="color: var(--text-primary);">[2] Yamai, Y., & Yoshiba, T. (2002).</strong><br>
                            <em>"Comparative analyses of expected shortfall and value-at-risk: their validity under market stress."</em> Journal of Banking & Finance, 26(5), 951-985.<br>
                            <span style="font-size: 10px; color: var(--text-muted);">Key contribution: Highlighted VaR's model risk during asset price bubbles.</span>
                        </li>
                        <li style="margin-bottom: 10px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
                            <strong style="color: var(--text-primary);">[3] Porretta, P., Letizia, A., & Santoboni, F. (2020).</strong><br>
                            <em>"Credit risk management in bank: Impacts of IFRS 9 and Basel 3."</em> Journal of Financial Regulation and Compliance, 28(2).<br>
                            <span style="font-size: 10px; color: var(--text-muted);">Key contribution: Analyzed regulatory interactions between ECL provisions and Tier 1 capital.</span>
                        </li>
                        <li style="margin-bottom: 0;">
                            <strong style="color: var(--text-primary);">[4] Basel Committee on Banking Supervision (BCBS) (2013).</strong><br>
                            <em>"Basel III: The Liquidity Coverage Ratio and liquidity risk monitoring tools."</em> Bank for International Settlements.<br>
                            <span style="font-size: 10px; color: var(--text-muted);">Key contribution: Outlined HQLA classifications and 30-day cash outflow criteria.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}
