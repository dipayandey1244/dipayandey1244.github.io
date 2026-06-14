/**
 * Institutional Risk Analytics - Mock Data and Simulation Configs
 * Representing a typical mid-sized institutional asset management portfolio (~$1.25B AUM)
 */

export const INITIAL_DATA = {
    // Global Portfolio Metrics
    portfolio: {
        totalValue: 1245680000, // $1.245 Billion
        name: "Antigrav Global Multi-Asset Fund",
        valuationDate: "2026-06-12",
        currency: "USD"
    },
    
    // Asset Allocation
    allocation: [
        { assetClass: "Equities", value: 560556000, percentage: 45, color: "#38bdf8" },
        { assetClass: "Fixed Income", value: 498272000, percentage: 40, color: "#6366f1" },
        { assetClass: "Commodities", value: 124568000, percentage: 10, color: "#f59e0b" },
        { assetClass: "Cash & Equivalents", value: 62284000, percentage: 5, color: "#10b981" }
    ],

    // Sector Distribution
    sectors: [
        { name: "Financials", percentage: 22 },
        { name: "Information Technology", percentage: 25 },
        { name: "Healthcare", percentage: 15 },
        { name: "Energy & Utilities", percentage: 12 },
        { name: "Consumer Discretionary", percentage: 10 },
        { name: "Government/Sovereign Bonds", percentage: 16 }
    ],
    
    // Market Risk Domain
    marketRisk: {
        var99_1d: 24510000,        // Value at Risk (99% Confidence, 1-day)
        var95_1d: 17230000,        // Value at Risk (95% Confidence, 1-day)
        expectedShortfall: 31850000, // Expected Shortfall (99%)
        portfolioBeta: 1.12,
        annualVolatility: 0.142,    // 14.2% Volatility
        varLimit: 30000000,         // Hard board limit
        varWarningThreshold: 25000000, // Amber warning threshold
        
        // 30-day Historical VaR trend data (for charts)
        historicalVaR: [
            { date: "May 14", var99: 22.4, var95: 16.1, sp500: 5120 },
            { date: "May 15", var99: 22.5, var95: 16.2, sp500: 5100 },
            { date: "May 18", var99: 22.1, var95: 15.9, sp500: 5150 },
            { date: "May 19", var99: 21.9, var95: 15.7, sp500: 5180 },
            { date: "May 20", var99: 22.2, var95: 16.0, sp500: 5170 },
            { date: "May 21", var99: 22.8, var95: 16.4, sp500: 5110 },
            { date: "May 22", var99: 23.1, var95: 16.6, sp500: 5080 },
            { date: "May 25", var99: 23.0, var95: 16.5, sp500: 5090 },
            { date: "May 26", var99: 22.7, var95: 16.3, sp500: 5120 },
            { date: "May 27", var99: 22.9, var95: 16.4, sp500: 5100 },
            { date: "May 28", var99: 23.4, var95: 16.8, sp500: 5050 },
            { date: "May 29", var99: 23.8, var95: 17.1, sp500: 5010 },
            { date: "Jun 01", var99: 24.2, var95: 17.3, sp500: 4980 },
            { date: "Jun 02", var99: 24.1, var95: 17.2, sp500: 4995 },
            { date: "Jun 03", var99: 23.9, var95: 17.0, sp500: 5020 },
            { date: "Jun 04", var99: 23.6, var95: 16.8, sp500: 5040 },
            { date: "Jun 05", var99: 23.2, var95: 16.5, sp500: 5080 },
            { date: "Jun 08", var99: 23.5, var95: 16.7, sp500: 5070 },
            { date: "Jun 09", var99: 24.0, var95: 17.0, sp500: 5030 },
            { date: "Jun 10", var99: 24.6, var95: 17.3, sp500: 4990 },
            { date: "Jun 11", var99: 24.8, var95: 17.4, sp500: 4970 },
            { date: "Jun 12", var99: 24.51, var95: 17.23, sp500: 4985 }
        ]
    },
    
    // Credit Risk Domain
    creditRisk: {
        totalExposure: 850000000,
        expectedCreditLoss: 4120000,
        averagePd: 0.0085, // 0.85% average probability of default
        lgd: 0.40,         // 40% loss given default
        
        // Exposure distribution by credit rating
        ratingsDistribution: [
            { rating: "AAA", exposure: 250000000, color: "#10b981" },
            { rating: "AA", exposure: 200000000, color: "#34d399" },
            { rating: "A", exposure: 180000000, color: "#60a5fa" },
            { rating: "BBB", exposure: 140000000, color: "#fbbf24" },
            { rating: "BB", exposure: 50000000, color: "#f59e0b" },
            { rating: "B & Below", exposure: 30000000, color: "#f43f5e" }
        ],
        
        // Counterparty limits vs current exposures
        counterparties: [
            { name: "JP Morgan Chase", rating: "AA-", exposure: 95000000, limit: 120000000 },
            { name: "Barclays Capital", rating: "A+", exposure: 78000000, limit: 100000000 },
            { name: "BNP Paribas", rating: "A", exposure: 72000000, limit: 80000000 }, // 90% utilization
            { name: "HSBC Group", rating: "AA-", exposure: 45000000, limit: 90000000 },
            { name: "Societe Generale", rating: "A-", exposure: 68000000, limit: 70000000 }, // 97% - Alert!
            { name: "Citigroup Inc", rating: "A+", exposure: 52000000, limit: 110000000 }
        ]
    },
    
    // Liquidity Risk Domain
    liquidityRisk: {
        hqla: 320000000,               // High Quality Liquid Assets
        netOutflows30d: 225000000,      // Net Cash Outflow over 30d stress period
        lcr: 142.2,                    // Liquidity Coverage Ratio (HQLA / Net Outflows)
        nsfr: 118.5,                   // Net Stable Funding Ratio
        lcrLimit: 100.0,               // Regulatory threshold
        lcrWarningThreshold: 115.0,    // Warning alert threshold
        survivalHorizonDays: 45,        // Days the firm can survive under severe funding stress
        
        // Weekly cash forecast for next 6 weeks (in Millions)
        cashForecast: [
            { week: "Week 1", inflows: 45, outflows: 35, netCumulative: 330 }, // Starting with 320 HQLA + 10
            { week: "Week 2", inflows: 28, outflows: 42, netCumulative: 316 },
            { week: "Week 3", inflows: 55, outflows: 60, netCumulative: 311 },
            { week: "Week 4", inflows: 38, outflows: 25, netCumulative: 324 },
            { week: "Week 5", inflows: 42, outflows: 50, netCumulative: 316 },
            { week: "Week 6", inflows: 30, outflows: 38, netCumulative: 308 }
        ]
    },
    
    // Operational Risk Domain (RCSA Heatmap and Incident Logs)
    operationalRisk: {
        // Likelihood (1-5) vs Impact (1-5) incident count matrix
        rcsaMatrix: [
            // Row 5 (Almost Certain)
            [
                { likelihood: 5, impact: 1, count: 4, level: "level-low-2" },
                { likelihood: 5, impact: 2, count: 2, level: "level-med-3" },
                { likelihood: 5, impact: 3, count: 1, level: "level-high-4" },
                { likelihood: 5, impact: 4, count: 0, level: "level-crit-5" },
                { likelihood: 5, impact: 5, count: 0, level: "level-crit-5" }
            ],
            // Row 4 (Likely)
            [
                { likelihood: 4, impact: 1, count: 6, level: "level-low-2" },
                { likelihood: 4, impact: 2, count: 4, level: "level-med-3" },
                { likelihood: 4, impact: 3, count: 2, level: "level-high-4" },
                { likelihood: 4, impact: 4, count: 1, level: "level-crit-5" },
                { likelihood: 4, impact: 5, count: 0, level: "level-crit-5" }
            ],
            // Row 3 (Possible)
            [
                { likelihood: 3, impact: 1, count: 12, level: "level-low-1" },
                { likelihood: 3, impact: 2, count: 5, level: "level-med-3" },
                { likelihood: 3, impact: 3, count: 3, level: "level-med-3" },
                { likelihood: 3, impact: 4, count: 2, level: "level-high-4" },
                { likelihood: 3, impact: 5, count: 1, level: "level-crit-5" } // Breached operational threshold!
            ],
            // Row 2 (Unlikely)
            [
                { likelihood: 2, impact: 1, count: 18, level: "level-low-1" },
                { likelihood: 2, impact: 2, count: 8, level: "level-low-2" },
                { likelihood: 2, impact: 3, count: 4, level: "level-med-3" },
                { likelihood: 2, impact: 4, count: 1, level: "level-high-4" },
                { likelihood: 2, impact: 5, count: 0, level: "level-crit-5" }
            ],
            // Row 1 (Rare)
            [
                { likelihood: 1, impact: 1, count: 25, level: "level-low-1" },
                { likelihood: 1, impact: 2, count: 14, level: "level-low-1" },
                { likelihood: 1, impact: 3, count: 6, level: "level-low-2" },
                { likelihood: 1, impact: 4, count: 1, level: "level-med-3" },
                { likelihood: 1, impact: 5, count: 0, level: "level-high-4" }
            ]
        ],
        
        // Detailed incident registers linked to RCSA coordinates
        incidents: [
            { id: "INC-2026-89", date: "2026-06-10", likelihood: 3, impact: 5, title: "Third-party custody API outage", loss: 420000, category: "IT / Infrastructure", status: "Mitigated" },
            { id: "INC-2026-85", date: "2026-06-05", likelihood: 4, impact: 4, title: "Trade routing manual error (duplicate order)", loss: 180000, category: "Execution & Delivery", status: "Resolved" },
            { id: "INC-2026-80", date: "2026-05-28", likelihood: 3, impact: 4, title: "Late clearing settlement fee breach", loss: 95000, category: "Execution & Delivery", status: "Resolved" },
            { id: "INC-2026-77", date: "2026-05-18", likelihood: 2, impact: 4, title: "Data vendor connection dropout in trading hours", loss: 50000, category: "IT / Infrastructure", status: "Resolved" },
            { id: "INC-2026-72", date: "2026-05-05", likelihood: 5, impact: 3, title: "Minor phishing attempt - quarantined", loss: 0, category: "Cybersecurity", status: "Resolved" },
            { id: "INC-2026-69", date: "2026-04-20", likelihood: 3, impact: 3, title: "Pricing model code drift on illiquid bonds", loss: 35000, category: "Model Risk", status: "Resolved" }
        ],
        
        // Key Risk Indicators
        kris: [
            { name: "Critical Trading System Uptime", value: "99.98%", status: "success", threshold: "> 99.95%" },
            { name: "Unresolved Reconciliation Breaks (> 24h)", value: "14", status: "warning", threshold: "< 10" },
            { name: "Risk Policy Limit Compliance Excursions", value: "1", status: "warning", threshold: "0" },
            { name: "Key Staff Turnover Rate (Annualized)", value: "6.2%", status: "success", threshold: "< 12.0%" }
        ]
    }
};

// ==========================================================================
// MACRO SHOCK SCENARIOS CONFIGURATION
// Defines multipliers and percentage shifts applied to the baseline data.
// ==========================================================================
export const STRESS_SCENARIOS = {
    baseline: {
        id: "baseline",
        name: "Baseline Economy",
        description: "Standard market conditions, matching current central bank interest rates and historical volatilities.",
        shocks: {
            equityPrice: 0,       // % shift
            interestRate: 0,      // bps shift (1bp = 0.01%)
            volatility: 0,        // % shift
            creditSpreads: 0      // bps shift
        }
    },
    gfc_2008: {
        id: "gfc_2008",
        name: "2008 Financial Crisis",
        description: "Severe credit freeze, asset fire sales, and unprecedented equity drawdowns resembling Lehman Brothers collapse.",
        shocks: {
            equityPrice: -35,
            interestRate: -150, // Rates slashed in liquidity crunch
            volatility: 120,    // VIX spike
            creditSpreads: 350  // Massive spread widening for corporate debt
        }
    },
    covid_2020: {
        id: "covid_2020",
        name: "COVID-19 Liquidity Shock",
        description: "Sudden economic shutdown, dash for cash, severe equity selloff, and extreme volatility spikes.",
        shocks: {
            equityPrice: -25,
            interestRate: -100,
            volatility: 150,
            creditSpreads: 200
        }
    },
    stagflation: {
        id: "stagflation",
        name: "Stagflationary Rate Hike",
        description: "Supply chain disruptions fuel inflation, forcing central banks to spike interest rates amid slowing growth.",
        shocks: {
            equityPrice: -15,
            interestRate: 250,  // Rate hike cycle (+2.50%)
            volatility: 45,
            creditSpreads: 150
        }
    },
    geopolitical: {
        id: "geopolitical",
        name: "Energy Shock & Escalation",
        description: "Oil supply disruption forces oil to spike to $150+, sparking inflation and hitting energy-dependent equities.",
        shocks: {
            equityPrice: -20,
            interestRate: 50,
            volatility: 75,
            creditSpreads: 120
        }
    }
};
