/* ==========================================================================
   StatLab - Core Application Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Check if running inside iframe for styling
    if (window.self !== window.top) {
        document.body.classList.add('in-iframe');
    }

    // ----------------------------------------------------
    // State Variables
    // ----------------------------------------------------
    let chartInstance = null;
    let activeTab = 'simulator';

    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // ----------------------------------------------------
    // Theme Management
    // ----------------------------------------------------
    const themeToggle = document.getElementById('themeToggle');
    const themeIconDark = document.querySelector('.theme-icon-dark');
    const themeIconLight = document.querySelector('.theme-icon-light');

    // Default to dark theme
    let currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcons();

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateThemeIcons();
        updateSimulator(); // Redraw chart with theme colors
    });

    function updateThemeIcons() {
        if (currentTheme === 'dark') {
            themeIconDark.style.display = 'none';
            themeIconLight.style.display = 'block';
        } else {
            themeIconDark.style.display = 'block';
            themeIconLight.style.display = 'none';
        }
    }

    // ----------------------------------------------------
    // Tab Switching
    // ----------------------------------------------------
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
            saveStateToURL();
        });
    });

    function switchTab(tabId) {
        activeTab = tabId;
        
        navButtons.forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-tab="${tabId}"]`).classList.add('active');

        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabId}Tab`).classList.add('active');

        // Re-render chart if switching to simulator since canvas might need resize
        if (tabId === 'simulator') {
            setTimeout(updateSimulator, 50);
        }
    }

    // Concept Sidebar Navigation
    const conceptBtns = document.querySelectorAll('.concept-nav-btn');
    const conceptContents = document.querySelectorAll('.concept-detail-content');

    conceptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            conceptBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const conceptId = btn.dataset.concept;
            conceptContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`concept-${conceptId}`).classList.add('active');
        });
    });

    // ----------------------------------------------------
    // Probability Distributions Math Helpers
    // ----------------------------------------------------

    // Abramowitz and Stegun formula 26.2.17 for Standard Normal CDF
    function normalCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989422804 * Math.exp(-x * x / 2);
        const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
        return x > 0 ? 1 - p : p;
    }

    // Rational approximation for Inverse Normal CDF (PPF)
    function normalInverseCDF(p) {
        if (p <= 0.0000001) return -5;
        if (p >= 0.9999999) return 5;
        
        const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
        const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
        
        if (p < 0.5) {
            const t = Math.sqrt(-2 * Math.log(p));
            return -(t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1));
        } else {
            const t = Math.sqrt(-2 * Math.log(1 - p));
            return t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1);
        }
    }

    // Lanczos approximation for log-Gamma
    function logGamma(z) {
        const g = 7;
        const p = [
            0.99999999999980993,
            676.5203681218851,
            -1259.1392167224028,
            771.32342877765313,
            -176.61502916214059,
            12.507399342048933,
            -0.13857109526572012,
            9.9843695780195716e-6,
            1.5056327351493116e-7
        ];
        if (z < 0.5) {
            return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
        }
        z -= 1;
        let x = p[0];
        for (let i = 1; i < g + 2; i++) {
            x += p[i] / (z + i);
        }
        const t = z + g + 0.5;
        return Math.log(Math.sqrt(2 * Math.PI)) + Math.log(t) * (z + 0.5) - t + Math.log(x);
    }

    function gamma(z) {
        return Math.exp(logGamma(z));
    }

    // Student's t PDF
    function tPDF(t, df) {
        const num = gamma((df + 1) / 2);
        const den = Math.sqrt(df * Math.PI) * gamma(df / 2);
        return (num / den) * Math.pow(1 + (t * t) / df, -(df + 1) / 2);
    }

    // Student's t CDF using Simpson's Rule integration
    function tCDF(t, df) {
        if (t === 0) return 0.5;
        if (t < 0) return 1 - tCDF(-t, df);
        
        // Simpson's rule integration from -6 to t
        const a = -6;
        const b = t;
        const n = 500; // sufficiently precise
        const h = (b - a) / n;
        let sum = tPDF(a, df) + tPDF(b, df);
        
        for (let i = 1; i < n; i++) {
            const x = a + i * h;
            sum += (i % 2 === 0 ? 2 : 4) * tPDF(x, df);
        }
        
        return Math.min(1.0, Math.max(0.0, (h / 3) * sum));
    }

    // Inverse Student's t CDF via Binary Search
    function tInverseCDF(p, df) {
        if (p <= 0.00001) return -6;
        if (p >= 0.99999) return 6;
        
        let low = -6;
        let high = 6;
        let mid = 0;
        
        for (let iter = 0; iter < 30; iter++) {
            mid = (low + high) / 2;
            const val = tCDF(mid, df);
            if (val < p) {
                low = mid;
            } else {
                high = mid;
            }
        }
        return mid;
    }

    // Helper to render KaTeX formula
    function renderMath(elementId, latexFormula, displayMode = true) {
        const el = document.getElementById(elementId);
        if (!el) return;
        try {
            if (window.katex) {
                window.katex.render(latexFormula, el, {
                    displayMode: displayMode,
                    throwOnError: false
                });
            } else {
                el.innerText = latexFormula;
            }
        } catch (err) {
            console.error('KaTeX failed:', err);
            el.innerText = latexFormula;
        }
    }

    // ----------------------------------------------------
    // SIMULATOR LOGIC
    // ----------------------------------------------------
    const distToggleBtns = document.querySelectorAll('#distributionTypeToggle .toggle-btn');
    const dfGroup = document.getElementById('dfGroup');
    const degreesOfFreedom = document.getElementById('degreesOfFreedom');
    const dfValueDisplay = document.getElementById('dfValueDisplay');
    
    const testTypeToggleBtns = document.querySelectorAll('#testTypeToggle .toggle-btn');
    const alphaSlider = document.getElementById('alphaSlider');
    const alphaValueDisplay = document.getElementById('alphaValueDisplay');
    
    const statisticSlider = document.getElementById('statisticSlider');
    const statisticValueDisplay = document.getElementById('statisticValueDisplay');
    const statisticNumber = document.getElementById('statisticNumber');
    
    const resetSimBtn = document.getElementById('resetSimBtn');

    // UI Listeners
    distToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            distToggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.value === 't') {
                dfGroup.style.display = 'block';
            } else {
                dfGroup.style.display = 'none';
            }
            updateSimulator();
            saveStateToURL();
        });
    });

    degreesOfFreedom.addEventListener('input', () => {
        dfValueDisplay.innerText = degreesOfFreedom.value;
        updateSimulator();
        saveStateToURL();
    });

    testTypeToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            testTypeToggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateSimulator();
            saveStateToURL();
        });
    });

    alphaSlider.addEventListener('input', () => {
        alphaValueDisplay.innerText = parseFloat(alphaSlider.value).toFixed(3);
        updateSimulator();
        saveStateToURL();
    });

    statisticSlider.addEventListener('input', () => {
        const val = parseFloat(statisticSlider.value);
        statisticValueDisplay.innerText = val.toFixed(2);
        statisticNumber.value = val.toFixed(2);
        updateSimulator();
        saveStateToURL();
    });

    statisticNumber.addEventListener('input', () => {
        let val = parseFloat(statisticNumber.value);
        if (isNaN(val)) return;
        if (val < -10) val = -10;
        if (val > 10) val = 10;
        
        statisticSlider.value = val;
        statisticValueDisplay.innerText = val.toFixed(2);
        updateSimulator();
        saveStateToURL();
    });

    resetSimBtn.addEventListener('click', () => {
        // Reset to default settings
        setToggleActive('#distributionTypeToggle', 'normal');
        dfGroup.style.display = 'none';
        degreesOfFreedom.value = 10;
        dfValueDisplay.innerText = 10;
        setToggleActive('#testTypeToggle', 'two');
        alphaSlider.value = 0.05;
        alphaValueDisplay.innerText = "0.050";
        statisticSlider.value = 1.96;
        statisticValueDisplay.innerText = "1.96";
        statisticNumber.value = "1.96";
        
        updateSimulator();
        saveStateToURL();
    });

    function setToggleActive(toggleContainerSelector, val) {
        const btns = document.querySelectorAll(`${toggleContainerSelector} .toggle-btn`);
        btns.forEach(btn => {
            if (btn.dataset.value === val) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function updateSimulator() {
        const distType = document.querySelector('#distributionTypeToggle .toggle-btn.active').dataset.value;
        const df = parseInt(degreesOfFreedom.value);
        const testType = document.querySelector('#testTypeToggle .toggle-btn.active').dataset.value;
        const alpha = parseFloat(alphaSlider.value);
        const observedStat = parseFloat(statisticSlider.value);

        // 1. Calculate boundaries & p-value
        let critL, critR, pValue, formulaLatex, rejectionCondition;
        
        const isT = distType === 't';
        
        if (!isT) {
            // Z-distribution calculations
            if (testType === 'two') {
                critR = normalInverseCDF(1 - alpha / 2);
                critL = -critR;
                pValue = 2 * (1 - normalCDF(Math.abs(observedStat)));
                formulaLatex = `p = 2 \\times P(Z > |z|) = 2 \\times P(Z > |${observedStat.toFixed(2)}|) = ${pValue.toFixed(4)}`;
                rejectionCondition = `|z| > z_{\\alpha/2} \\Rightarrow |${observedStat.toFixed(2)}| > ${critR.toFixed(3)}`;
            } else if (testType === 'right') {
                critR = normalInverseCDF(1 - alpha);
                critL = -Infinity;
                pValue = 1 - normalCDF(observedStat);
                formulaLatex = `p = P(Z > z) = P(Z > ${observedStat.toFixed(2)}) = ${pValue.toFixed(4)}`;
                rejectionCondition = `z > z_{\\alpha} \\Rightarrow ${observedStat.toFixed(2)} > ${critR.toFixed(3)}`;
            } else { // left
                critL = normalInverseCDF(alpha);
                critR = Infinity;
                pValue = normalCDF(observedStat);
                formulaLatex = `p = P(Z < z) = P(Z < ${observedStat.toFixed(2)}) = ${pValue.toFixed(4)}`;
                rejectionCondition = `z < -z_{\\alpha} \\Rightarrow ${observedStat.toFixed(2)} < ${critL.toFixed(3)}`;
            }
        } else {
            // Student's t calculations
            if (testType === 'two') {
                critR = tInverseCDF(1 - alpha / 2, df);
                critL = -critR;
                pValue = 2 * (1 - tCDF(Math.abs(observedStat), df));
                formulaLatex = `p = 2 \\times P(t_{${df}} > |t|) = 2 \\times P(t_{${df}} > |${observedStat.toFixed(2)}|) = ${pValue.toFixed(4)}`;
                rejectionCondition = `|t| > t_{\\alpha/2, ${df}} \\Rightarrow |${observedStat.toFixed(2)}| > ${critR.toFixed(3)}`;
            } else if (testType === 'right') {
                critR = tInverseCDF(1 - alpha, df);
                critL = -Infinity;
                pValue = 1 - tCDF(observedStat, df);
                formulaLatex = `p = P(t_{${df}} > t) = P(t_{${df}} > ${observedStat.toFixed(2)}) = ${pValue.toFixed(4)}`;
                rejectionCondition = `t > t_{\\alpha, ${df}} \\Rightarrow ${observedStat.toFixed(2)} > ${critR.toFixed(3)}`;
            } else { // left
                critL = tInverseCDF(alpha, df);
                critR = Infinity;
                pValue = tCDF(observedStat, df);
                formulaLatex = `p = P(t_{${df}} < t) = P(t_{${df}} < ${observedStat.toFixed(2)}) = ${pValue.toFixed(4)}`;
                rejectionCondition = `t < -t_{\\alpha, ${df}} \\Rightarrow ${observedStat.toFixed(2)} < ${critL.toFixed(3)}`;
            }
        }

        // Determine if Null is Rejected
        const isRejected = (testType === 'two' && Math.abs(observedStat) > Math.abs(critR)) || 
                           (testType === 'right' && observedStat > critR) || 
                           (testType === 'left' && observedStat < critL);

        // Update UI Text elements
        const critValBox = document.getElementById('criticalValueText');
        const observedStatBox = document.getElementById('observedStatText');
        const pValueBox = document.getElementById('pValueText');
        const pValInterpretation = document.getElementById('pValInterpretation');
        const verdictBadge = document.getElementById('verdictBadge');

        observedStatBox.innerText = observedStat.toFixed(3);
        pValueBox.innerText = pValue.toFixed(4);
        
        if (testType === 'two') {
            critValBox.innerText = `\u00B1 ${critR.toFixed(3)}`;
        } else if (testType === 'right') {
            critValBox.innerText = `> ${critR.toFixed(3)}`;
        } else {
            critValBox.innerText = `< ${critL.toFixed(3)}`;
        }

        if (isRejected) {
            verdictBadge.innerHTML = '<span class="badge badge-success">Reject H\u2080</span>';
            pValueBox.className = "stat-value highlight success-text";
            pValInterpretation.innerText = `Significant (p < ${alpha})`;
        } else {
            verdictBadge.innerHTML = '<span class="badge badge-fail-reject">Fail to Reject H\u2080</span>';
            pValueBox.className = "stat-value highlight danger-text";
            pValInterpretation.innerText = `Not Significant (p \u2265 ${alpha})`;
        }

        // Render Formula block
        renderMath('narrativeKaTexFormula', formulaLatex);

        // Set colors based on active theme
        const rootStyles = getComputedStyle(document.documentElement);
        const primaryColor = rootStyles.getPropertyValue('--primary').trim();
        const primaryBg = rootStyles.getPropertyValue('--primary-light').trim();
        const dangerColor = rootStyles.getPropertyValue('--danger').trim();
        const dangerBg = rootStyles.getPropertyValue('--danger-light').trim();
        const textColor = rootStyles.getPropertyValue('--text-primary').trim();
        const gridColor = rootStyles.getPropertyValue('--border-color').trim();

        // 2. Generate Chart Data
        const xMin = -4;
        const xMax = 4;
        const steps = 200;
        const stepSize = (xMax - xMin) / steps;
        
        const chartDataAccept = [];
        const chartDataRejectL = [];
        const chartDataRejectR = [];

        const pdf = (x) => (isT ? tPDF(x, df) : (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-x * x / 2));

        for (let i = 0; i <= steps; i++) {
            const x = xMin + i * stepSize;
            const y = pdf(x);

            // Left tail rejection
            if (x <= critL) {
                chartDataRejectL.push({ x: x, y: y });
                // bridge connection
                if (x + stepSize > critL) {
                    const edgeY = pdf(critL);
                    chartDataRejectL.push({ x: critL, y: edgeY });
                    chartDataAccept.push({ x: critL, y: edgeY });
                }
            } 
            // Right tail rejection
            else if (x >= critR) {
                if (chartDataAccept.length > 0 && chartDataAccept[chartDataAccept.length - 1].x !== critR) {
                    const edgeY = pdf(critR);
                    chartDataAccept.push({ x: critR, y: edgeY });
                    chartDataRejectR.push({ x: critR, y: edgeY });
                }
                chartDataRejectR.push({ x: x, y: y });
            } 
            // Acceptance region
            else {
                chartDataAccept.push({ x: x, y: y });
            }
        }

        // Max Y height for test statistic marker
        const maxValY = isT ? tPDF(0, df) * 1.05 : 0.4 * 1.05;

        // Render Chart.js
        if (chartInstance) {
            chartInstance.destroy();
        }

        const datasets = [
            {
                label: 'Acceptance Region',
                data: chartDataAccept,
                borderColor: primaryColor,
                backgroundColor: primaryBg,
                fill: true,
                tension: 0,
                pointRadius: 0,
                borderWidth: 2
            }
        ];

        if (chartDataRejectL.length > 0) {
            datasets.push({
                label: 'Rejection Region (Left)',
                data: chartDataRejectL,
                borderColor: dangerColor,
                backgroundColor: dangerBg,
                fill: true,
                tension: 0,
                pointRadius: 0,
                borderWidth: 2
            });
        }

        if (chartDataRejectR.length > 0) {
            datasets.push({
                label: 'Rejection Region (Right)',
                data: chartDataRejectR,
                borderColor: dangerColor,
                backgroundColor: dangerBg,
                fill: true,
                tension: 0,
                pointRadius: 0,
                borderWidth: 2
            });
        }

        // Add Vertical line for Observed statistic
        datasets.push({
            label: 'Observed Statistic',
            data: [{ x: observedStat, y: 0 }, { x: observedStat, y: maxValY }],
            borderColor: textColor,
            borderWidth: 2.5,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            showLine: true
        });

        chartInstance = new Chart(document.getElementById('distributionChart'), {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Using custom styled HTML legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `x: ${context.parsed.x.toFixed(3)}, Density: ${context.parsed.y.toFixed(4)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: -4,
                        max: 4,
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Outfit'
                            }
                        }
                    },
                    y: {
                        min: 0,
                        max: maxValY,
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                family: 'Outfit'
                            }
                        }
                    }
                }
            }
        });

        // 3. Write Narrative Text
        const narrativePar = document.getElementById('narrativeParagraph');
        const testSymbol = isT ? 't' : 'z';
        const distName = isT ? `Student's t-distribution (with ${df} df)` : 'Standard Normal Z-distribution';
        
        let decisionExplanation = "";
        if (isRejected) {
            decisionExplanation = `Because our observed test statistic of <strong>${observedStat.toFixed(2)}</strong> falls inside the rejection region (defined by critical threshold of <strong>${testType === 'two' ? '\u00B1' + critR.toFixed(3) : (testType === 'right' ? critR.toFixed(3) : critL.toFixed(3))}</strong>), we <strong>reject the null hypothesis (H₀)</strong>. The statistical weight of our evidence allows us to adopt the alternative hypothesis (Hₐ).`;
        } else {
            decisionExplanation = `Because our observed test statistic of <strong>${observedStat.toFixed(2)}</strong> lies inside the acceptance (non-rejection) region, we <strong>fail to reject the null hypothesis (H₀)</strong>. We do not have sufficient statistical evidence to claim that the effect is real.`;
        }

        narrativePar.innerHTML = `
            We are conducting a ${testType}-tailed hypothesis test using a <strong>${distName}</strong>. 
            We set our alpha threshold (\(\alpha\)) to <strong>${alpha.toFixed(3)}</strong>, which represents our tolerance for false positives. 
            Our calculation yielded an observed test statistic ${testSymbol} = <strong>${observedStat.toFixed(3)}</strong>, which corresponds to a p-value of <strong>${pValue.toFixed(4)}</strong>. 
            <br><br>
            ${decisionExplanation}
            The p-value tells us that if H₀ were absolutely true, the likelihood of drawing a sample this extreme by chance is only <strong>${(pValue * 100).toFixed(2)}%</strong>. 
            Since this value is ${isRejected ? 'less than' : 'greater than or equal to'} our threshold \(\alpha = ${(alpha * 100).toFixed(1)}%\), our result is ${isRejected ? 'statistically significant' : 'not statistically significant'}.
        `;
    }

    // ----------------------------------------------------
    // STATISTICAL CALCULATOR LOGIC
    // ----------------------------------------------------
    const calcTestSelect = document.getElementById('calcTestSelect');
    const calcAlternative = document.getElementById('calcAlternative');
    const calcAlpha = document.getElementById('calcAlpha');
    const calcOneSampleInputs = document.getElementById('calcOneSampleInputs');
    const calcTwoSampleInputs = document.getElementById('calcTwoSampleInputs');
    const calcComputeBtn = document.getElementById('calcComputeBtn');
    const stdDevLabel = document.getElementById('stdDevLabel');

    calcTestSelect.addEventListener('change', () => {
        updateCalculatorInputsVisibility();
    });

    function updateCalculatorInputsVisibility() {
        const test = calcTestSelect.value;
        if (test === 'z_one_mean') {
            calcOneSampleInputs.style.display = 'block';
            calcTwoSampleInputs.style.display = 'none';
            stdDevLabel.innerHTML = 'Population Std Dev (\\(\\sigma\\))';
        } else if (test === 't_one_mean') {
            calcOneSampleInputs.style.display = 'block';
            calcTwoSampleInputs.style.display = 'none';
            stdDevLabel.innerHTML = 'Sample Std Dev (\\(s\\))';
        } else if (test === 't_two_ind') {
            calcOneSampleInputs.style.display = 'none';
            calcTwoSampleInputs.style.display = 'block';
        }
    }

    calcComputeBtn.addEventListener('click', () => {
        runCalculator();
        saveStateToURL();
    });

    function runCalculator() {
        const test = calcTestSelect.value;
        const alt = calcAlternative.value;
        const alpha = parseFloat(calcAlpha.value);
        
        let stat, pValue, df, critText, verdict, summaryText, interpretationText;
        let latexStep1 = "", latexStep2 = "", latexStep3 = "", latexStep4 = "";
        
        if (test === 'z_one_mean') {
            // One Sample Z Test
            const mu0 = parseFloat(document.getElementById('calcNullMean').value);
            const xBar = parseFloat(document.getElementById('calcSampleMean').value);
            const sigma = parseFloat(document.getElementById('calcStdDev').value);
            const n = parseInt(document.getElementById('calcSampleSize').value);
            
            const se = sigma / Math.sqrt(n);
            stat = (xBar - mu0) / se;
            
            let zAlpha;
            if (alt === 'two') {
                zAlpha = normalInverseCDF(1 - alpha / 2);
                pValue = 2 * (1 - normalCDF(Math.abs(stat)));
                critText = `\\pm ${zAlpha.toFixed(3)}`;
                verdict = Math.abs(stat) > zAlpha;
            } else if (alt === 'greater') {
                zAlpha = normalInverseCDF(1 - alpha);
                pValue = 1 - normalCDF(stat);
                critText = `> ${zAlpha.toFixed(3)}`;
                verdict = stat > zAlpha;
            } else { // less
                zAlpha = -normalInverseCDF(1 - alpha);
                pValue = normalCDF(stat);
                critText = `< ${zAlpha.toFixed(3)}`;
                verdict = stat < zAlpha;
            }

            summaryText = verdict 
                ? `Null hypothesis is rejected at the ${(alpha * 100)}% significance level.`
                : `Failed to reject the null hypothesis at the ${(alpha * 100)}% significance level.`;
            
            interpretationText = verdict
                ? `There is sufficient statistical evidence to conclude that the population mean is ${alt === 'two' ? 'different from' : (alt === 'greater' ? 'greater than' : 'less than')} ${mu0}.`
                : `There is not enough statistical evidence to conclude that the population mean differs from ${mu0}. The observed sample mean of ${xBar} could be due to sampling variance.`;

            // LaTeX Formulas
            latexStep1 = `H_0: \\mu = ${mu0} \\quad vs \\quad H_a: \\mu ${alt === 'two' ? '\\neq' : (alt === 'greater' ? '>' : '<')} ${mu0}`;
            latexStep2 = `SE = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${sigma}}{\\sqrt{${n}}} = ${se.toFixed(4)} \\\\ Z_{obs} = \\frac{\\bar{x} - \\mu_0}{SE} = \\frac{${xBar} - ${mu0}}{${se.toFixed(4)}} = ${stat.toFixed(4)}`;
            latexStep3 = `\\text{Critical Value(s): } ${critText} \\\\ p\\text{-value} = ${pValue.toFixed(5)}`;
            
            if (alt === 'two') {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } |Z_{obs}| > z_{\\alpha/2} \\Rightarrow |${stat.toFixed(3)}| > ${zAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            } else if (alt === 'greater') {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } Z_{obs} > z_{\\alpha} \\Rightarrow ${stat.toFixed(3)} > ${zAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            } else {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } Z_{obs} < -z_{\\alpha} \\Rightarrow ${stat.toFixed(3)} < ${zAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            }
            
        } else if (test === 't_one_mean') {
            // One Sample T Test
            const mu0 = parseFloat(document.getElementById('calcNullMean').value);
            const xBar = parseFloat(document.getElementById('calcSampleMean').value);
            const s = parseFloat(document.getElementById('calcStdDev').value);
            const n = parseInt(document.getElementById('calcSampleSize').value);
            
            df = n - 1;
            const se = s / Math.sqrt(n);
            stat = (xBar - mu0) / se;
            
            let tAlpha;
            if (alt === 'two') {
                tAlpha = tInverseCDF(1 - alpha / 2, df);
                pValue = 2 * (1 - tCDF(Math.abs(stat), df));
                critText = `\\pm ${tAlpha.toFixed(3)}`;
                verdict = Math.abs(stat) > tAlpha;
            } else if (alt === 'greater') {
                tAlpha = tInverseCDF(1 - alpha, df);
                pValue = 1 - tCDF(stat, df);
                critText = `> ${tAlpha.toFixed(3)}`;
                verdict = stat > tAlpha;
            } else { // less
                tAlpha = tInverseCDF(alpha, df);
                pValue = tCDF(stat, df);
                critText = `< ${tAlpha.toFixed(3)}`;
                verdict = stat < tAlpha;
            }

            summaryText = verdict 
                ? `Null hypothesis is rejected at the ${(alpha * 100)}% significance level (df = ${df}).`
                : `Failed to reject the null hypothesis at the ${(alpha * 100)}% significance level (df = ${df}).`;
            
            interpretationText = verdict
                ? `There is sufficient statistical evidence to conclude that the population mean is ${alt === 'two' ? 'different from' : (alt === 'greater' ? 'greater than' : 'less than')} ${mu0}.`
                : `There is not enough statistical evidence to conclude that the population mean differs from ${mu0}.`;

            latexStep1 = `H_0: \\mu = ${mu0} \\quad vs \\quad H_a: \\mu ${alt === 'two' ? '\\neq' : (alt === 'greater' ? '>' : '<')} ${mu0}`;
            latexStep2 = `SE = \\frac{s}{\\sqrt{n}} = \\frac{${s}}{\\sqrt{${n}}} = ${se.toFixed(4)} \\\\ t_{obs} = \\frac{\\bar{x} - \\mu_0}{SE} = \\frac{${xBar} - ${mu0}}{${se.toFixed(4)}} = ${stat.toFixed(4)}`;
            latexStep3 = `\\text{df} = ${n} - 1 = ${df} \\\\ \\text{Critical Value: } ${critText} \\\\ p\\text{-value} = ${pValue.toFixed(5)}`;
            
            if (alt === 'two') {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } |t_{obs}| > t_{\\alpha/2, ${df}} \\Rightarrow |${stat.toFixed(3)}| > ${tAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            } else if (alt === 'greater') {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } t_{obs} > t_{\\alpha, ${df}} \\Rightarrow ${stat.toFixed(3)} > ${tAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            } else {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } t_{obs} < -t_{\\alpha, ${df}} \\Rightarrow ${stat.toFixed(3)} < ${tAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            }
            
        } else if (test === 't_two_ind') {
            // Two Sample T-Test
            const meanA = parseFloat(document.getElementById('calcMeanA').value);
            const sA = parseFloat(document.getElementById('calcStdDevA').value);
            const nA = parseInt(document.getElementById('calcSizeA').value);
            
            const meanB = parseFloat(document.getElementById('calcMeanB').value);
            const sB = parseFloat(document.getElementById('calcStdDevB').value);
            const nB = parseInt(document.getElementById('calcSizeB').value);
            
            const equalVar = document.getElementById('calcEqualVar').checked;
            
            let se, tAlpha;
            
            if (equalVar) {
                // Pooled Variance
                df = nA + nB - 2;
                const poolVar = ((nA - 1) * sA * sA + (nB - 1) * sB * sB) / df;
                const poolSD = Math.sqrt(poolVar);
                se = poolSD * Math.sqrt(1 / nA + 1 / nB);
                stat = (meanA - meanB) / se;
                
                latexStep2 = `s_p = \\sqrt{\\frac{(n_A-1)s_A^2 + (n_B-1)s_B^2}{n_A+n_B-2}} = \\sqrt{\\frac{${nA - 1}(${sA}^2) + ${nB - 1}(${sB}^2)}{${df}}} = ${poolSD.toFixed(4)} \\\\
                             SE = s_p \\sqrt{\\frac{1}{n_A} + \\frac{1}{n_B}} = ${se.toFixed(4)} \\\\
                             t_{obs} = \\frac{\\bar{x}_A - \\bar{x}_B}{SE} = \\frac{${meanA} - ${meanB}}{${se.toFixed(4)}} = ${stat.toFixed(4)}`;
            } else {
                // Welch's T-Test (Unequal Variance)
                const termA = (sA * sA) / nA;
                const termB = (sB * sB) / nB;
                se = Math.sqrt(termA + termB);
                stat = (meanA - meanB) / se;
                
                // Welch-Satterthwaite df
                df = (termA + termB) * (termA + termB) / ((termA * termA) / (nA - 1) + (termB * termB) / (nB - 1));
                df = Math.max(1, Math.round(df * 100) / 100); // 2 decimal round
                
                latexStep2 = `SE = \\sqrt{\\frac{s_A^2}{n_A} + \\frac{s_B^2}{n_B}} = \\sqrt{\\frac{${sA}^2}{${nA}} + \\frac{${sB}^2}{${nB}}} = ${se.toFixed(4)} \\\\
                             t_{obs} = \\frac{\\bar{x}_A - \\bar{x}_B}{SE} = \\frac{${meanA} - ${meanB}}{${se.toFixed(4)}} = ${stat.toFixed(4)}`;
            }
            
            if (alt === 'two') {
                tAlpha = tInverseCDF(1 - alpha / 2, Math.round(df));
                pValue = 2 * (1 - tCDF(Math.abs(stat), Math.round(df)));
                critText = `\\pm ${tAlpha.toFixed(3)}`;
                verdict = Math.abs(stat) > tAlpha;
            } else if (alt === 'greater') {
                tAlpha = tInverseCDF(1 - alpha, Math.round(df));
                pValue = 1 - tCDF(stat, Math.round(df));
                critText = `> ${tAlpha.toFixed(3)}`;
                verdict = stat > tAlpha;
            } else { // less
                tAlpha = tInverseCDF(alpha, Math.round(df));
                pValue = tCDF(stat, Math.round(df));
                critText = `< ${tAlpha.toFixed(3)}`;
                verdict = stat < tAlpha;
            }

            summaryText = verdict 
                ? `Null hypothesis is rejected at the ${(alpha * 100)}% significance level (df = ${Math.round(df)}).`
                : `Failed to reject the null hypothesis at the ${(alpha * 100)}% significance level (df = ${Math.round(df)}).`;
            
            interpretationText = verdict
                ? `There is a statistically significant difference between Group A and Group B. Mean of A (${meanA}) is different from B (${meanB}).`
                : `The difference between the two groups (${(meanA - meanB).toFixed(2)}) is not statistically significant and could likely be due to chance.`;

            latexStep1 = `H_0: \\mu_A = \\mu_B \\quad vs \\quad H_a: \\mu_A ${alt === 'two' ? '\\neq' : (alt === 'greater' ? '>' : '<')} \\mu_B`;
            latexStep3 = `\\text{df (calculated)} = ${df} \\\\ \\text{Critical Value: } ${critText} \\\\ p\\text{-value} = ${pValue.toFixed(5)}`;
            
            if (alt === 'two') {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } |t_{obs}| > t_{\\alpha/2, ${Math.round(df)}} \\Rightarrow |${stat.toFixed(3)}| > ${tAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            } else if (alt === 'greater') {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } t_{obs} > t_{\\alpha, ${Math.round(df)}} \\Rightarrow ${stat.toFixed(3)} > ${tAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            } else {
                latexStep4 = `\\text{Rule: Reject } H_0 \\text{ if } t_{obs} < -t_{\\alpha, ${Math.round(df)}} \\Rightarrow ${stat.toFixed(3)} < ${tAlpha.toFixed(3)} \\quad (${verdict ? '\\text{True - Reject } H_0' : '\\text{False - Do not Reject } H_0'})`;
            }
        }

        // Apply results to UI
        const calcVerdictBadge = document.getElementById('calcVerdictBadge');
        if (verdict) {
            calcVerdictBadge.innerHTML = '<span class="badge badge-success">Reject H\u2080</span>';
        } else {
            calcVerdictBadge.innerHTML = '<span class="badge badge-fail-reject">Fail to Reject H\u2080</span>';
        }
        
        document.getElementById('calcSummaryVerdictText').innerText = summaryText;
        document.getElementById('calcSummaryInterpretation').innerText = interpretationText;

        // Render equations
        renderMath('mathStep1', latexStep1);
        renderMath('mathStep2', latexStep2);
        renderMath('mathStep3', latexStep3);
        renderMath('mathStep4', latexStep4);

        // Update Python Code block dynamically
        let pythonCode = "";
        if (test === 'z_one_mean') {
            const mu0 = parseFloat(document.getElementById('calcNullMean').value);
            const xBar = parseFloat(document.getElementById('calcSampleMean').value);
            const sigma = parseFloat(document.getElementById('calcStdDev').value);
            const n = document.getElementById('calcSampleSize').value;
            pythonCode = `import numpy as np
from scipy import stats

# Inputs
mu0 = ${mu0}  # hypothesized mean
x_bar = ${xBar}  # sample mean
sigma = ${sigma}  # population standard deviation
n = ${n}  # sample size

# Calculate standard error and Z-statistic
se = sigma / np.sqrt(n)
z_stat = (x_bar - mu0) / se
p_val = 2 * (1 - stats.norm.cdf(np.abs(z_stat)))  # Two-sided

print(f"Z-statistic: {z_stat:.4f}")
print(f"P-value: {p_val:.5f}")`;
        } else if (test === 't_one_mean') {
            const mu0 = parseFloat(document.getElementById('calcNullMean').value);
            const xBar = parseFloat(document.getElementById('calcSampleMean').value);
            const s = parseFloat(document.getElementById('calcStdDev').value);
            const n = document.getElementById('calcSampleSize').value;
            
            // Check if this is the BP medication preset
            if (mu0 === 0 && xBar === -3.9 && s === 1.37 && n === 10) {
                pythonCode = `import numpy as np
from scipy import stats

# Blood pressure readings before and after treatment
before = np.array([120, 122, 118, 130, 125, 128, 115, 121, 123, 119])
after = np.array([115, 120, 112, 128, 122, 125, 110, 117, 119, 114])

# Run paired t-test
t_stat, p_val = stats.ttest_rel(after, before)

# Or run one-sample t-test on differences (equivalent)
diff = after - before
t_stat_one_sample, p_val_one_sample = stats.ttest_1samp(diff, 0)

print(f"T-statistic: {t_stat:.4f}")
print(f"P-value: {p_val:.8f}")`;
            } else {
                pythonCode = `import numpy as np
from scipy import stats

# Inputs
mu0 = ${mu0}  # hypothesized mean
x_bar = ${xBar}  # sample mean
s = ${s}  # sample standard deviation
n = ${n}  # sample size

# Calculate standard error and T-statistic
se = s / np.sqrt(n)
t_stat = (x_bar - mu0) / se
p_val = 2 * (1 - stats.t.cdf(np.abs(t_stat), df=n-1))  # Two-sided

print(f"T-statistic: {t_stat:.4f}")
print(f"P-value: {p_val:.5f}")`;
            }
        } else if (test === 't_two_ind') {
            const meanA = parseFloat(document.getElementById('calcMeanA').value);
            const sA = parseFloat(document.getElementById('calcStdDevA').value);
            const nA = document.getElementById('calcSizeA').value;
            const meanB = parseFloat(document.getElementById('calcMeanB').value);
            const sB = parseFloat(document.getElementById('calcStdDevB').value);
            const nB = document.getElementById('calcSizeB').value;
            const equalVar = document.getElementById('calcEqualVar').checked;
            
            pythonCode = `import numpy as np
from scipy import stats

# Group A (Control) & Group B (Treatment) summary statistics
mean_A = ${meanA}
s_A = ${sA}
n_A = ${nA}

mean_B = ${meanB}
s_B = ${sB}
n_B = ${nB}

# Compute two-sample t-test from summary statistics
t_stat, p_val = stats.ttest_ind_from_stats(
    mean1=mean_A, std1=s_A, nobs1=n_A,
    mean2=mean_B, std2=s_B, nobs2=n_B,
    equal_var=${equalVar ? 'True' : 'False'}
)

print(f"T-statistic: {t_stat:.4f}")
print(f"P-value: {p_val:.5f}")`;
        }
        document.getElementById('calcPythonCode').innerText = pythonCode;
    }

    // ----------------------------------------------------
    // A/B TEST PLANNER LOGIC
    // ----------------------------------------------------
    const planBaseline = document.getElementById('planBaseline');
    const planMde = document.getElementById('planMde');
    const planMdeType = document.getElementById('planMdeType');
    const planAlpha = document.getElementById('planAlpha');
    const planPower = document.getElementById('planPower');
    const planDailyTraffic = document.getElementById('planDailyTraffic');
    const planComputeBtn = document.getElementById('planComputeBtn');

    planComputeBtn.addEventListener('click', () => {
        runPlanner();
        saveStateToURL();
    });

    function runPlanner() {
        const p1 = parseFloat(planBaseline.value) / 100.0;
        const mdeVal = parseFloat(planMde.value);
        const mdeType = planMdeType.value;
        const alpha = parseFloat(planAlpha.value);
        const power = parseFloat(planPower.value);
        const dailyTraffic = parseInt(planDailyTraffic.value);

        let p2;
        let absMde, relMde;

        if (mdeType === 'absolute') {
            absMde = mdeVal / 100.0;
            p2 = p1 + absMde;
            relMde = absMde / p1;
        } else { // relative
            relMde = mdeVal / 100.0;
            absMde = p1 * relMde;
            p2 = p1 + absMde;
        }

        // Standard Normal Percentiles
        const zAlpha = normalInverseCDF(1 - alpha / 2);
        const zBeta = normalInverseCDF(power);

        // Average pooled proportion
        const pBar = (p1 + p2) / 2;

        // Two-proportion sample size formula:
        // n = (Z_{1-a/2}*sqrt(2*pbar*(1-pbar)) + Z_{1-b}*sqrt(p1(1-p1) + p2(1-p2)))^2 / (p1 - p2)^2
        const term1 = zAlpha * Math.sqrt(2 * pBar * (1 - pBar));
        const term2 = zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
        const numerator = (term1 + term2) * (term1 + term2);
        const denominator = (p1 - p2) * (p1 - p2);
        
        let nPerVariant = Math.ceil(numerator / denominator);
        
        // Safety checks for boundary conversions
        if (isNaN(nPerVariant) || nPerVariant <= 0 || p2 >= 1.0 || p2 <= 0.0) {
            nPerVariant = 0;
        }

        const totalN = nPerVariant * 2;
        let days = Math.ceil(totalN / dailyTraffic);
        if (isNaN(days) || !isFinite(days)) days = 0;

        // Update UI
        document.getElementById('planSampleSizeVal').innerText = nPerVariant.toLocaleString();
        document.getElementById('planTotalSizeVal').innerText = totalN.toLocaleString();
        document.getElementById('planDurationVal').innerText = days > 0 ? `${days} Days` : 'N/A';

        document.getElementById('planControlRateText').innerText = `${(p1 * 100).toFixed(2)}%`;
        document.getElementById('planTreatmentRateText').innerText = `${(p2 * 100).toFixed(2)}%`;
        document.getElementById('planAbsMdeText').innerText = `${(absMde * 100).toFixed(2)}%`;
        document.getElementById('planRelMdeText').innerText = `${(relMde * 100).toFixed(2)}%`;

        const textNarrative = `
            To detect a <strong>${(absMde * 100).toFixed(2)}% absolute</strong> improvement (which represents a <strong>${(relMde * 100).toFixed(2)}% relative</strong> change) from your baseline conversion of <strong>${(p1 * 100).toFixed(2)}%</strong> with a significance level of <strong>${(alpha * 100).toFixed(1)}%</strong> (\(\alpha = ${alpha}\)) and statistical power of <strong>${(power * 100).toFixed(1)}%</strong>, you need to collect <strong>${nPerVariant.toLocaleString()}</strong> samples per variant. 
            <br><br>
            With an equal 50/50 traffic split, you will need a total sample size of <strong>${totalN.toLocaleString()}</strong>. Given a daily traffic volume of <strong>${dailyTraffic.toLocaleString()}</strong> combined visitors, your experiment must run uninterrupted for at least <strong>${days} days</strong>.
        `;
        document.getElementById('planTextNarrative').innerHTML = textNarrative;

        // Render KaTeX for the equation used
        const latexFormula = `n \\approx \\frac{\\left( z_{1-\\alpha/2}\\sqrt{2\\bar{p}(1-\\bar{p})} + z_{1-\\beta}\\sqrt{p_1(1-p_1) + p_2(1-p_2)} \\right)^2}{(p_1 - p_2)^2} \\\\ 
                              \\bar{p} = \\frac{${p1.toFixed(3)} + ${p2.toFixed(3)}}{2} = ${pBar.toFixed(4)} \\\\
                              n \\approx \\frac{\\left( ${zAlpha.toFixed(3)}\\sqrt{2(${pBar.toFixed(4)})(${ (1-pBar).toFixed(4) })} + ${zBeta.toFixed(3)}\\sqrt{${p1.toFixed(3)}(${(1-p1).toFixed(3)}) + ${p2.toFixed(3)}(${(1-p2).toFixed(3)})} \\right)^2}{(${p1.toFixed(3)} - ${p2.toFixed(3)})^2} = ${nPerVariant.toLocaleString()}`;
        
        renderMath('planFormulaBlock', latexFormula);
    }

    // ----------------------------------------------------
    // URL SHARING CONFIG
    // ----------------------------------------------------
    const shareBtn = document.getElementById('shareBtn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    shareBtn.addEventListener('click', () => {
        // Build direct URL with hash state
        const state = buildStateObject();
        const jsonStr = JSON.stringify(state);
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        const shareUrl = `${window.location.origin}${window.location.pathname}#state=${base64}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Share link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy share link:', err);
            showToast('Failed to copy. URL: ' + shareUrl, 5000);
        });
    });

    function buildStateObject() {
        const distType = document.querySelector('#distributionTypeToggle .toggle-btn.active').dataset.value;
        const testType = document.querySelector('#testTypeToggle .toggle-btn.active').dataset.value;
        
        return {
            tab: activeTab,
            theme: currentTheme,
            sim: {
                dist: distType,
                df: parseInt(degreesOfFreedom.value),
                tail: testType,
                alpha: parseFloat(alphaSlider.value),
                stat: parseFloat(statisticSlider.value)
            },
            calc: {
                test: calcTestSelect.value,
                alt: calcAlternative.value,
                alpha: parseFloat(calcAlpha.value),
                nullMean: parseFloat(document.getElementById('calcNullMean').value),
                sampleMean: parseFloat(document.getElementById('calcSampleMean').value),
                stdDev: parseFloat(document.getElementById('calcStdDev').value),
                n: parseInt(document.getElementById('calcSampleSize').value),
                meanA: parseFloat(document.getElementById('calcMeanA').value),
                stdDevA: parseFloat(document.getElementById('calcStdDevA').value),
                nA: parseInt(document.getElementById('calcSizeA').value),
                meanB: parseFloat(document.getElementById('calcMeanB').value),
                stdDevB: parseFloat(document.getElementById('calcStdDevB').value),
                nB: parseInt(document.getElementById('calcSizeB').value),
                equalVar: document.getElementById('calcEqualVar').checked
            },
            plan: {
                p1: parseFloat(planBaseline.value),
                mde: parseFloat(planMde.value),
                mdeType: planMdeType.value,
                alpha: parseFloat(planAlpha.value),
                power: parseFloat(planPower.value),
                traffic: parseInt(planDailyTraffic.value)
            }
        };
    }

    function saveStateToURL() {
        const state = buildStateObject();
        const jsonStr = JSON.stringify(state);
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        // replaceState to avoid cluttering history
        history.replaceState(null, null, `${document.location.pathname}#state=${base64}`);
    }

    function loadStateFromURL() {
        const hash = window.location.hash;
        if (!hash.startsWith('#state=')) return;
        try {
            const base64 = hash.replace('#state=', '');
            const jsonStr = decodeURIComponent(escape(atob(base64)));
            const state = JSON.parse(jsonStr);
            
            // Apply Theme
            if (state.theme) {
                currentTheme = state.theme;
                document.documentElement.setAttribute('data-theme', currentTheme);
                updateThemeIcons();
            }

            // Apply tab
            if (state.tab) {
                switchTab(state.tab);
            }
            
            // Apply Sim state
            if (state.sim) {
                setToggleActive('#distributionTypeToggle', state.sim.dist);
                degreesOfFreedom.value = state.sim.df;
                dfValueDisplay.innerText = state.sim.df;
                if (state.sim.dist === 't') {
                    dfGroup.style.display = 'block';
                } else {
                    dfGroup.style.display = 'none';
                }
                setToggleActive('#testTypeToggle', state.sim.tail);
                alphaSlider.value = state.sim.alpha;
                alphaValueDisplay.innerText = parseFloat(state.sim.alpha).toFixed(3);
                statisticSlider.value = state.sim.stat;
                statisticValueDisplay.innerText = parseFloat(state.sim.stat).toFixed(2);
                statisticNumber.value = parseFloat(state.sim.stat).toFixed(2);
            }
            
            // Apply Calc state
            if (state.calc) {
                calcTestSelect.value = state.calc.test;
                calcAlternative.value = state.calc.alt;
                calcAlpha.value = state.calc.alpha;
                document.getElementById('calcNullMean').value = state.calc.nullMean;
                document.getElementById('calcSampleMean').value = state.calc.sampleMean;
                document.getElementById('calcStdDev').value = state.calc.stdDev;
                document.getElementById('calcSampleSize').value = state.calc.n;
                document.getElementById('calcMeanA').value = state.calc.meanA;
                document.getElementById('calcStdDevA').value = state.calc.stdDevA;
                document.getElementById('calcSizeA').value = state.calc.nA;
                document.getElementById('calcMeanB').value = state.calc.meanB;
                document.getElementById('calcStdDevB').value = state.calc.stdDevB;
                document.getElementById('calcSizeB').value = state.calc.nB;
                document.getElementById('calcEqualVar').checked = state.calc.equalVar;
            }
            
            // Apply Plan state
            if (state.plan) {
                planBaseline.value = state.plan.p1;
                planMde.value = state.plan.mde;
                planMdeType.value = state.plan.mdeType;
                planAlpha.value = state.plan.alpha;
                planPower.value = state.plan.power;
                planDailyTraffic.value = state.plan.traffic;
            }
        } catch (e) {
            console.error('Failed to parse URL hash state:', e);
        }
    }

    function showToast(message, duration = 3000) {
        toastMessage.innerText = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // ----------------------------------------------------
    // CASE STUDY PRESETS
    // ----------------------------------------------------
    const presetVisitorBtn = document.getElementById('presetVisitorBtn');
    const presetBpBtn = document.getElementById('presetBpBtn');
    const presetAbBtn = document.getElementById('presetAbBtn');

    presetVisitorBtn.addEventListener('click', () => {
        // Z-Test Website Visitors Case (\mu_0 = 50, \bar{x} = 53, \sigma = 10, n = 100)
        switchTab('calculator');
        calcTestSelect.value = 'z_one_mean';
        calcAlternative.value = 'two';
        calcAlpha.value = '0.05';
        
        document.getElementById('calcNullMean').value = 50;
        document.getElementById('calcSampleMean').value = 53;
        document.getElementById('calcStdDev').value = 10;
        document.getElementById('calcSampleSize').value = 100;
        
        updateCalculatorInputsVisibility();
        runCalculator();
        saveStateToURL();
        
        // Sync simulator values as well
        setToggleActive('#distributionTypeToggle', 'normal');
        setToggleActive('#testTypeToggle', 'two');
        alphaSlider.value = 0.05;
        alphaValueDisplay.innerText = "0.050";
        statisticSlider.value = 3.0;
        statisticValueDisplay.innerText = "3.00";
        statisticNumber.value = "3.00";
        updateSimulator();
        
        showToast("Loaded Website Traffic Case Study!");
    });

    presetBpBtn.addEventListener('click', () => {
        // T-Test BP Medication Case (paired differences \mu_0 = 0, \bar{x} = -3.9, s = 1.37, n = 10)
        switchTab('calculator');
        calcTestSelect.value = 't_one_mean';
        calcAlternative.value = 'two';
        calcAlpha.value = '0.05';
        
        document.getElementById('calcNullMean').value = 0;
        document.getElementById('calcSampleMean').value = -3.9;
        document.getElementById('calcStdDev').value = 1.37;
        document.getElementById('calcSampleSize').value = 10;
        
        updateCalculatorInputsVisibility();
        runCalculator();
        saveStateToURL();
        
        // Sync simulator values
        setToggleActive('#distributionTypeToggle', 't');
        degreesOfFreedom.value = 9;
        dfValueDisplay.innerText = 9;
        dfGroup.style.display = 'block';
        setToggleActive('#testTypeToggle', 'two');
        alphaSlider.value = 0.05;
        alphaValueDisplay.innerText = "0.050";
        statisticSlider.value = -4.0; // slider limit
        statisticValueDisplay.innerText = "-9.00"; // visual override
        statisticNumber.value = "-9.00";
        
        updateSimulator();
        saveStateToURL();
        
        showToast("Loaded Blood Pressure Trial Case Study!");
    });

    presetAbBtn.addEventListener('click', () => {
        // A/B Test design preset
        switchTab('planner');
        
        planBaseline.value = 10;
        planMde.value = 20;
        planMdeType.value = 'relative';
        planAlpha.value = '0.05';
        planPower.value = '0.80';
        planDailyTraffic.value = 1000;
        
        runPlanner();
        saveStateToURL();
        showToast("Loaded Algorithm Optimization Preset!");
    });

    // Copy Python Code
    const copyPythonBtn = document.getElementById('copyPythonBtn');
    copyPythonBtn.addEventListener('click', () => {
        const codeText = document.getElementById('calcPythonCode').innerText;
        navigator.clipboard.writeText(codeText).then(() => {
            showToast("Python code copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy code:", err);
        });
    });

    // ----------------------------------------------------
    // INITIALIZATION RUN
    // ----------------------------------------------------
    
    // Load hash state if present
    if (window.location.hash.startsWith('#state=')) {
        loadStateFromURL();
    }
    
    // Perform initial calculations & rendering
    updateSimulator();
    updateCalculatorInputsVisibility();
    runCalculator();
    runPlanner();
});
