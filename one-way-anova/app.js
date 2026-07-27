/**
 * One-Way ANOVA (Module 9) Guide
 * Mathematical computation engines, live assumption check, and canvas plotters.
 */

// --- STATE MANAGEMENT ---
const STATE = {
    // 3 groups of 4 points
    points: [
        // Group 0 (Cyan Theme)
        { id: 0, group: 0, x: 140, y: 190 },
        { id: 1, group: 0, x: 180, y: 230 },
        { id: 2, group: 0, x: 220, y: 170 },
        { id: 3, group: 0, x: 260, y: 210 },
        
        // Group 1 (Amber Theme)
        { id: 4, group: 1, x: 380, y: 220 },
        { id: 5, group: 1, x: 420, y: 180 },
        { id: 6, group: 1, x: 460, y: 240 },
        { id: 7, group: 1, x: 500, y: 200 },
        
        // Group 2 (Pink Theme)
        { id: 8, group: 2, x: 620, y: 240 },
        { id: 9, group: 2, x: 660, y: 260 },
        { id: 10, group: 2, x: 700, y: 200 },
        { id: 11, group: 2, x: 740, y: 220 }
    ],
    // value = 400 - y_svg
    groupMeans: [0, 0, 0],
    groupVariances: [0, 0, 0],
    grandMean: 0,
    
    // ANOVA Table Metrics
    ssTreatment: 0,
    ssError: 0,
    dfTreatment: 2,
    dfError: 9,
    msTreatment: 0,
    msError: 0,
    fStatistic: 0,
    fCritical: 4.2565, // for df=(2,9), alpha=0.05
    pValue: 1.0,
    
    // Hover highlight state
    hoveredTerm: null,
    
    // Dragging
    draggedElement: null, // { type: 'point'|'group-mean', id: number }
    dragStartY: 0,
    dragStartPointY: 0,
    dragStartGroupPointsY: []
};

const DEFAULT_POINTS = JSON.parse(JSON.stringify(STATE.points));
const GROUP_COLORS = ['var(--color-group-1)', 'var(--color-group-2)', 'var(--color-group-3)'];
const GROUP_NAMES = [
    "Layout A (Multi-Step)",
    "Layout B (One-Click)",
    "Layout C (Gamified)"
];
const GROUP_GLOWS = ['rgba(6, 182, 212, 0.4)', 'rgba(245, 158, 11, 0.4)', 'rgba(236, 72, 153, 0.4)'];

// --- DOM ELEMENTS ---
const svgEl = document.getElementById('anova-svg');
const gridLinesLayer = svgEl.querySelector('.grid-lines');
const pointsLayer = svgEl.querySelector('.points-group');
const groupMeansLayer = svgEl.querySelector('.group-means-lines');
const treatmentEffectsLayer = svgEl.querySelector('.treatment-effects-lines');
const residualsLayer = svgEl.querySelector('.residuals-lines');
const grandMeanLine = document.getElementById('line-grand-mean');

// Dashboard metrics
const lblDf = document.getElementById('lbl-df');
const lblFVal = document.getElementById('lbl-f-val');
const lblFCrit = document.getElementById('lbl-f-crit');
const lblPVal = document.getElementById('lbl-p-val');
const bannerDecision = document.getElementById('banner-decision');
const decisionTitle = document.getElementById('decision-title');
const decisionDesc = document.getElementById('decision-desc');
const decisionIconFa = document.getElementById('decision-icon-fa');

// Assumptions Check Elements
const statusNormality = document.getElementById('status-normality');
const cardNormality = document.getElementById('card-normality');
const lblSkewness = document.getElementById('lbl-skewness');
const statusVariance = document.getElementById('status-variance');
const cardVariance = document.getElementById('card-variance');
const lblVarianceRatio = document.getElementById('lbl-variance-ratio');

// Variance bar fills
const varBar1 = document.getElementById('var-bar-1');
const varBar2 = document.getElementById('var-bar-2');
const varBar3 = document.getElementById('var-bar-3');
const lblVar1 = document.getElementById('lbl-var-1');
const lblVar2 = document.getElementById('lbl-var-2');
const lblVar3 = document.getElementById('lbl-var-3');

// Inflation Elements
const sliderGroups = document.getElementById('slider-groups');
const lblSliderK = document.getElementById('lbl-slider-k');
const lblTestsCount = document.getElementById('lbl-tests-count');
const lblCompoundRisk = document.getElementById('lbl-compound-risk');
const gaugeBarFill = document.getElementById('gauge-bar-fill');
const gaugeWarningTag = document.getElementById('gauge-warning-tag');
const lblGaugeExplanation = document.getElementById('lbl-gauge-explanation');

// Interactive Equation elements
const eqTerms = document.querySelectorAll('.eq-term');
const eqLabels = document.querySelectorAll('.label-item');

// Canvases
const fCanvas = document.getElementById('f-distribution-canvas');
const normCanvas = document.getElementById('residual-normality-canvas');

// --- MATH COMPUTATIONS ---
function calculateANOVA() {
    const N = STATE.points.length;
    const k = 3;
    STATE.dfTreatment = k - 1;
    STATE.dfError = N - k;
    
    // 1. Group Means
    const groupSums = [0, 0, 0];
    const groupCounts = [0, 0, 0];
    
    STATE.points.forEach(p => {
        const val = 400 - p.y;
        groupSums[p.group] += val;
        groupCounts[p.group]++;
    });
    
    for (let g = 0; g < k; g++) {
        STATE.groupMeans[g] = groupSums[g] / groupCounts[g];
    }
    
    // 2. Grand Mean
    const totalSum = groupSums.reduce((a, b) => a + b, 0);
    STATE.grandMean = totalSum / N;
    
    // 3. Group Variances (n-1 degrees of freedom)
    const groupSqDevs = [0, 0, 0];
    STATE.points.forEach(p => {
        const val = 400 - p.y;
        groupSqDevs[p.group] += Math.pow(val - STATE.groupMeans[p.group], 2);
    });
    for (let g = 0; g < k; g++) {
        STATE.groupVariances[g] = groupSqDevs[g] / (groupCounts[g] - 1 || 1);
    }
    
    // 4. Sum of Squares
    let ssTreatment = 0;
    let ssError = 0;
    
    for (let g = 0; g < k; g++) {
        ssTreatment += groupCounts[g] * Math.pow(STATE.groupMeans[g] - STATE.grandMean, 2);
        ssError += groupSqDevs[g];
    }
    
    STATE.ssTreatment = ssTreatment;
    STATE.ssError = ssError;
    
    // 5. Mean Squares
    STATE.msTreatment = ssTreatment / STATE.dfTreatment;
    STATE.msError = ssError / STATE.dfError;
    
    // 6. F Statistic
    if (STATE.msError > 0.001) {
        STATE.fStatistic = STATE.msTreatment / STATE.msError;
    } else {
        STATE.fStatistic = 99.9; // Arbitrary high value
    }
    
    // 7. F Critical
    // For df=(2, 9), alpha=0.05, critical F value is exactly 4.2565
    STATE.fCritical = 4.2565;
    
    // 8. Exact p-Value for df1 = 2 (Closed form survival function)
    // p = (1 + (df1/df2)*F)^(-df2/2)
    const df1 = STATE.dfTreatment;
    const df2 = STATE.dfError;
    STATE.pValue = Math.pow(1 + (df1 / df2) * STATE.fStatistic, -df2 / 2);
}

// --- RENDER DYNAMICS ---
function updateDashboard() {
    lblDf.textContent = `df = (${STATE.dfTreatment}, ${STATE.dfError})`;
    lblFVal.textContent = STATE.fStatistic.toFixed(2);
    lblFCrit.textContent = STATE.fCritical.toFixed(2);
    lblPVal.textContent = STATE.pValue < 0.001 ? '< 0.001' : STATE.pValue.toFixed(3);
    
    // Update decision banner
    if (STATE.pValue < 0.05) {
        bannerDecision.className = 'decision-banner reject';
        decisionTitle.textContent = 'Reject Null Hypothesis (H₀)';
        decisionDesc.innerHTML = `At least one group mean is significantly different from another (p < 0.05). The calculated F-statistic (<strong>${STATE.fStatistic.toFixed(2)}</strong>) exceeds critical threshold <strong>${STATE.fCritical.toFixed(2)}</strong>.`;
        decisionIconFa.className = 'fa-solid fa-circle-check';
    } else {
        bannerDecision.className = 'decision-banner fail';
        decisionTitle.textContent = 'Fail to Reject H₀';
        decisionDesc.textContent = `The difference between group means is not statistically significant (p ≥ 0.05). Any observed differences are likely due to random sampling variance.`;
        decisionIconFa.className = 'fa-solid fa-circle-xmark';
    }
}

function updateVisuals() {
    const grandMeanY = 400 - STATE.grandMean;
    grandMeanLine.setAttribute('y1', grandMeanY);
    grandMeanLine.setAttribute('y2', grandMeanY);
    grandMeanLine.classList.toggle('highlighted', STATE.hoveredTerm === 'mu');
    
    // Render group means lines
    groupMeansLayer.innerHTML = '';
    for (let g = 0; g < 3; g++) {
        const groupMeanY = 400 - STATE.groupMeans[g];
        const color = GROUP_COLORS[g];
        const groupPoints = STATE.points.filter(p => p.group === g);
        const minX = Math.min(...groupPoints.map(p => p.x)) - 20;
        const maxX = Math.max(...groupPoints.map(p => p.x)) + 20;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'group-mean-line');
        line.setAttribute('x1', minX);
        line.setAttribute('y1', groupMeanY);
        line.setAttribute('x2', maxX);
        line.setAttribute('y2', groupMeanY);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        line.setAttribute('filter', 'url(#glow-effect)');
        line.addEventListener('pointerdown', (e) => startDrag(e, 'group-mean', g));
        groupMeansLayer.appendChild(line);
        
        // Group label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', minX);
        text.setAttribute('y', groupMeanY - 8);
        text.setAttribute('fill', color);
        text.setAttribute('font-size', '10');
        text.setAttribute('font-weight', '600');
        text.textContent = `${GROUP_NAMES[g]} Mean = ${STATE.groupMeans[g].toFixed(1)}s`;
        groupMeansLayer.appendChild(text);
    }
    
    // Render treatment effects lines
    treatmentEffectsLayer.innerHTML = '';
    for (let g = 0; g < 3; g++) {
        const groupMeanY = 400 - STATE.groupMeans[g];
        const groupPoints = STATE.points.filter(p => p.group === g);
        const avgX = groupPoints.reduce((sum, p) => sum + p.x, 0) / groupPoints.length;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'treatment-effect-line');
        line.setAttribute('x1', avgX);
        line.setAttribute('y1', grandMeanY);
        line.setAttribute('x2', avgX);
        line.setAttribute('y2', groupMeanY);
        line.setAttribute('stroke', 'var(--color-treatment)');
        line.setAttribute('stroke-width', '2');
        if (STATE.hoveredTerm === 'tau') {
            line.classList.add('highlighted');
        }
        treatmentEffectsLayer.appendChild(line);
    }
    
    // Render residuals lines
    residualsLayer.innerHTML = '';
    STATE.points.forEach(p => {
        const groupMeanY = 400 - STATE.groupMeans[p.group];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'residual-line');
        line.setAttribute('x1', p.x);
        line.setAttribute('y1', p.y);
        line.setAttribute('x2', p.x);
        line.setAttribute('y2', groupMeanY);
        line.setAttribute('stroke', 'var(--color-error)');
        line.setAttribute('stroke-width', '1.5');
        if (STATE.hoveredTerm === 'epsilon') {
            line.classList.add('highlighted');
        }
        residualsLayer.appendChild(line);
    });
    
    // Render points
    pointsLayer.innerHTML = '';
    STATE.points.forEach(p => {
        const color = GROUP_COLORS[p.group];
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'draggable-point');
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('r', '7');
        circle.setAttribute('fill', '#090e17');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('style', `filter: drop-shadow(0 0 5px ${color});`);
        circle.addEventListener('pointerdown', (e) => startDrag(e, 'point', p.id));
        if (STATE.hoveredTerm === 'y') {
            circle.classList.add('highlighted');
        }
        pointsLayer.appendChild(circle);
    });
}

function drawGrid() {
    gridLinesLayer.innerHTML = '';
    for (let y = 50; y <= 350; y += 50) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'grid-line');
        line.setAttribute('x1', '50');
        line.setAttribute('y1', y);
        line.setAttribute('x2', '750');
        line.setAttribute('y2', y);
        gridLinesLayer.appendChild(line);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '20');
        text.setAttribute('y', y + 3);
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '10');
        text.setAttribute('font-weight', '500');
        text.textContent = 400 - y;
        gridLinesLayer.appendChild(text);
    }
}

// --- DRAG HANDLERS ---
function startDrag(e, type, id) {
    e.preventDefault();
    STATE.draggedElement = { type, id };
    STATE.dragStartY = e.clientY;
    
    if (type === 'point') {
        const point = STATE.points.find(p => p.id === id);
        STATE.dragStartPointY = point.y;
        
        const circles = pointsLayer.querySelectorAll('circle');
        const draggedIdx = STATE.points.findIndex(p => p.id === id);
        circles[draggedIdx].classList.add('dragging');
    } else if (type === 'group-mean') {
        const groupPoints = STATE.points.filter(p => p.group === id);
        STATE.dragStartGroupPointsY = groupPoints.map(p => ({ id: p.id, y: p.y }));
        
        const lines = groupMeansLayer.querySelectorAll('.group-mean-line');
        lines[id].classList.add('dragging');
    }
    
    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', endDrag);
}

function onDrag(e) {
    if (!STATE.draggedElement) return;
    
    const svgRect = svgEl.getBoundingClientRect();
    const scaleY = 420 / svgRect.height;
    const deltaY = (e.clientY - STATE.dragStartY) * scaleY;
    
    if (STATE.draggedElement.type === 'point') {
        const point = STATE.points.find(p => p.id === STATE.draggedElement.id);
        let newY = STATE.dragStartPointY + deltaY;
        newY = Math.max(50, Math.min(370, newY)); // Clamped margins
        point.y = newY;
    } else if (STATE.draggedElement.type === 'group-mean') {
        STATE.dragStartGroupPointsY.forEach(sp => {
            const p = STATE.points.find(point => point.id === sp.id);
            let newY = sp.y + deltaY;
            newY = Math.max(50, Math.min(370, newY));
            p.y = newY;
        });
    }
    
    calculateANOVA();
    updateDashboard();
    updateVisuals();
    drawFDistribution();
    drawResidualNormality();
    updateAssumptionsGauges();
}

function endDrag() {
    if (STATE.draggedElement) {
        if (STATE.draggedElement.type === 'point') {
            const circles = pointsLayer.querySelectorAll('circle');
            circles.forEach(c => c.classList.remove('dragging'));
        } else if (STATE.draggedElement.type === 'group-mean') {
            const lines = groupMeansLayer.querySelectorAll('.group-mean-line');
            lines.forEach(l => l.classList.remove('dragging'));
        }
    }
    STATE.draggedElement = null;
    document.removeEventListener('pointermove', onDrag);
    document.removeEventListener('pointerup', endDrag);
}

// --- PLOTTING F-DISTRIBUTION ---
function fPDF(x, df1, df2) {
    if (x < 0.001) x = 0.001;
    const power1 = df1 / 2 - 1;
    const power2 = -(df1 + df2) / 2;
    return Math.pow(x, power1) * Math.pow(1 + (df1 / df2) * x, power2);
}

function drawFDistribution() {
    const ctx = fCanvas.getContext('2d');
    const width = fCanvas.width;
    const height = fCanvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;
    
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    
    const maxValX = 8.0; // Show F-statistic up to 8 on scale
    
    // Find PDF max to normalize Y scale
    let maxPDF = 0.001;
    for (let x = 0; x <= maxValX; x += 0.05) {
        const y = fPDF(x, STATE.dfTreatment, STATE.dfError);
        if (y > maxPDF) maxPDF = y;
    }
    
    // Draw grid axis lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(width - paddingRight, height - paddingBottom);
    ctx.stroke();
    
    // Draw ticks
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '9px Inter';
    ctx.textAlign = 'center';
    for (let i = 0; i <= maxValX; i += 2) {
        const cx = paddingLeft + (i / maxValX) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(cx, height - paddingBottom);
        ctx.lineTo(cx, height - paddingBottom + 4);
        ctx.stroke();
        ctx.fillText(i, cx, height - paddingBottom + 14);
    }
    
    // Shaded rejection region (F_crit = 4.26 to 8.0)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.beginPath();
    const critX = STATE.fCritical;
    const critCanvasX = paddingLeft + (critX / maxValX) * plotWidth;
    ctx.moveTo(critCanvasX, height - paddingBottom);
    
    for (let cx = critX; cx <= maxValX; cx += 0.05) {
        const valX = paddingLeft + (cx / maxValX) * plotWidth;
        const valY = height - paddingBottom - (fPDF(cx, STATE.dfTreatment, STATE.dfError) / maxPDF) * plotHeight;
        ctx.lineTo(valX, valY);
    }
    ctx.lineTo(paddingLeft + plotWidth, height - paddingBottom);
    ctx.closePath();
    ctx.fill();
    
    // Label for Critical Region
    ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
    ctx.font = '8px Inter';
    ctx.textAlign = 'right';
    ctx.fillText('Rejection Region (α=0.05)', paddingLeft + plotWidth - 5, paddingTop + 20);
    
    // Draw the F-distribution curve
    ctx.strokeStyle = '#60a5fa'; // neon light-blue
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let cx = 0; cx <= maxValX; cx += 0.05) {
        const valX = paddingLeft + (cx / maxValX) * plotWidth;
        const valY = height - paddingBottom - (fPDF(cx, STATE.dfTreatment, STATE.dfError) / maxPDF) * plotHeight;
        if (cx === 0) {
            ctx.moveTo(valX, valY);
        } else {
            ctx.lineTo(valX, valY);
        }
    }
    ctx.stroke();
    
    // Draw critical line at 4.26
    ctx.strokeStyle = 'var(--color-error)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.beginPath();
    ctx.moveTo(critCanvasX, paddingTop);
    ctx.lineTo(critCanvasX, height - paddingBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw calculated F indicator
    const currentF = STATE.fStatistic;
    const currentFClamped = Math.min(currentF, maxValX);
    const indicatorCanvasX = paddingLeft + (currentFClamped / maxValX) * plotWidth;
    
    ctx.strokeStyle = currentF > STATE.fCritical ? 'var(--color-total)' : 'var(--color-treatment)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(indicatorCanvasX, paddingTop - 5);
    ctx.lineTo(indicatorCanvasX, height - paddingBottom);
    ctx.stroke();
    
    // Dot intersection
    const currentFY = height - paddingBottom - (fPDF(currentFClamped, STATE.dfTreatment, STATE.dfError) / maxPDF) * plotHeight;
    ctx.fillStyle = currentF > STATE.fCritical ? 'var(--color-total)' : 'var(--color-treatment)';
    ctx.beginPath();
    ctx.arc(indicatorCanvasX, currentFY, 5.5, 0, 2*Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Label for F-statistic
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Space Grotesk';
    ctx.textAlign = indicatorCanvasX > (width / 2) ? 'right' : 'left';
    const offsetX = indicatorCanvasX > (width / 2) ? -10 : 10;
    ctx.fillText(`F = ${currentF.toFixed(2)}`, indicatorCanvasX + offsetX, paddingTop + 5);
}

// --- PLOTTING RESIDUAL NORMALITY ---
function normalPDF(x, mean, variance) {
    const stdDev = Math.sqrt(variance) || 1;
    const coeff = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const power = -Math.pow(x - mean, 2) / (2 * variance || 2);
    return coeff * Math.exp(power);
}

function drawResidualNormality() {
    const ctx = normCanvas.getContext('2d');
    const width = normCanvas.width;
    const height = normCanvas.height;
    ctx.clearRect(0, 0, width, height);
    
    const paddingLeft = 30;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 20;
    
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    
    // Get residuals
    const residuals = STATE.points.map(p => (400 - p.y) - STATE.groupMeans[p.group]);
    
    // Bin residuals (Range -80 to 80, 5 bins)
    const binCount = 5;
    const binWidth = 32; // 160 / 5
    const bins = new Array(binCount).fill(0);
    
    residuals.forEach(r => {
        const binIdx = Math.floor((r + 80) / binWidth);
        const clampedIdx = Math.max(0, Math.min(binCount - 1, binIdx));
        bins[clampedIdx]++;
    });
    
    const maxBinVal = Math.max(1, ...bins);
    
    // Draw Axis lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(plotWidth + paddingLeft, height - paddingBottom);
    ctx.stroke();
    
    // Draw Histogram bars
    const barSpacing = 4;
    const barWidth = (plotWidth / binCount) - barSpacing;
    
    ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < binCount; i++) {
        const xPos = paddingLeft + (i * (plotWidth / binCount)) + (barSpacing / 2);
        const barHeight = (bins[i] / maxBinVal) * plotHeight * 0.8; // Leave buffer
        const yPos = height - paddingBottom - barHeight;
        
        ctx.beginPath();
        ctx.rect(xPos, yPos, barWidth, barHeight);
        ctx.fill();
        ctx.stroke();
    }
    
    // Draw theoretical Normal curve
    // pooled residual variance is STATE.msError
    const mean = 0;
    const variance = STATE.msError;
    
    // Scale normal PDF to match histogram height
    const normCoeff = normalPDF(0, mean, variance);
    
    ctx.strokeStyle = 'var(--color-error)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let cx = -80; cx <= 80; cx += 2) {
        const valX = paddingLeft + ((cx + 80) / 160) * plotWidth;
        const normVal = normalPDF(cx, mean, variance);
        // Normalize against peak height and scale to fit 80% plotHeight
        const valY = height - paddingBottom - (normVal / normCoeff) * (plotHeight * 0.8);
        if (cx === -80) {
            ctx.moveTo(valX, valY);
        } else {
            ctx.lineTo(valX, valY);
        }
    }
    ctx.stroke();
    
    // Add X-axis labels
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '8px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('-50', paddingLeft + (30/160)*plotWidth, height - paddingBottom + 12);
    ctx.fillText('0', paddingLeft + (80/160)*plotWidth, height - paddingBottom + 12);
    ctx.fillText('50', paddingLeft + (130/160)*plotWidth, height - paddingBottom + 12);
}

// --- ASSUMPTIONS DYNAMIC MONITORS ---
function updateAssumptionsGauges() {
    // 1. Homoscedasticity check (Variance ratio max / min)
    const variances = [...STATE.groupVariances];
    const maxVar = Math.max(...variances);
    const minVar = Math.min(...variances);
    
    // Ratio
    const varRatio = minVar > 0.01 ? (maxVar / minVar) : 1.0;
    lblVarianceRatio.textContent = `Ratio Max/Min Var: ${varRatio.toFixed(2)}`;
    
    // Variance display bars
    // Scale bars: max variance on scale is 3000
    const maxScaleVar = 3000;
    varBar1.style.width = `${Math.min(100, (variances[0] / maxScaleVar) * 100)}%`;
    varBar2.style.width = `${Math.min(100, (variances[1] / maxScaleVar) * 100)}%`;
    varBar3.style.width = `${Math.min(100, (variances[2] / maxScaleVar) * 100)}%`;
    
    lblVar1.textContent = variances[0].toFixed(0);
    lblVar2.textContent = variances[1].toFixed(0);
    lblVar3.textContent = variances[2].toFixed(0);
    
    if (varRatio > 4.0) {
        statusVariance.textContent = 'Violated';
        statusVariance.className = 'check-status status-fail';
        cardVariance.style.borderColor = 'rgba(244, 63, 94, 0.2)';
    } else {
        statusVariance.textContent = 'Passed';
        statusVariance.className = 'check-status status-pass';
        cardVariance.style.borderColor = 'var(--border-glass)';
    }
    
    // 2. Normality check (skewness of residuals)
    const residuals = STATE.points.map(p => (400 - p.y) - STATE.groupMeans[p.group]);
    
    // Compute Skewness = [mean(r^3)] / [mean(r^2)^1.5]
    let sumSq = 0;
    let sumCube = 0;
    residuals.forEach(r => {
        sumSq += Math.pow(r, 2);
        sumCube += Math.pow(r, 3);
    });
    
    const meanSq = sumSq / residuals.length;
    const meanCube = sumCube / residuals.length;
    const skewness = meanSq > 1 ? (meanCube / Math.pow(meanSq, 1.5)) : 0;
    
    lblSkewness.textContent = `Skewness: ${skewness.toFixed(2)} ${Math.abs(skewness) > 0.8 ? '(Skewed)' : '(Normal)'}`;
    
    if (Math.abs(skewness) > 0.8) {
        statusNormality.textContent = 'Violated';
        statusNormality.className = 'check-status status-fail';
        cardNormality.style.borderColor = 'rgba(244, 63, 94, 0.2)';
    } else {
        statusNormality.textContent = 'Passed';
        statusNormality.className = 'check-status status-pass';
        cardNormality.style.borderColor = 'var(--border-glass)';
    }
}

// --- T-TEST ERROR INFLATION WIDGET ---
function updateTTestInflation() {
    const k = parseInt(sliderGroups.value);
    const m = (k * (k - 1)) / 2;
    const alphaFW = 1 - Math.pow(0.95, m);
    const alphaFWPercent = alphaFW * 100;
    
    // Update texts
    lblSliderK.textContent = `${k} Groups`;
    lblTestsCount.textContent = `${m} Test${m > 1 ? 's' : ''}`;
    lblCompoundRisk.textContent = `${alphaFWPercent.toFixed(1)}%`;
    
    // Update gauge width
    gaugeBarFill.style.width = `${alphaFWPercent}%`;
    
    // Update warning classes
    if (alphaFWPercent < 15) {
        gaugeWarningTag.textContent = 'Controlled';
        gaugeWarningTag.className = 'warning-badge safe';
        gaugeBarFill.style.background = 'var(--color-total)';
        lblGaugeExplanation.style.borderColor = 'var(--color-total)';
    } else if (alphaFWPercent < 45) {
        gaugeWarningTag.textContent = 'High Risk';
        gaugeWarningTag.className = 'warning-badge warn';
        gaugeBarFill.style.background = 'var(--color-group-2)';
        lblGaugeExplanation.style.borderColor = 'var(--color-group-2)';
    } else {
        gaugeWarningTag.textContent = 'Explosion!';
        gaugeWarningTag.className = 'warning-badge danger';
        gaugeBarFill.style.background = 'var(--color-error)';
        lblGaugeExplanation.style.borderColor = 'var(--color-error)';
    }
    
    lblGaugeExplanation.innerHTML = `Comparing <strong>${k} groups</strong> requires <strong>${m} pairwise t-tests</strong>. Running them individually at $\\alpha = 0.05$ compounds the false alarm rate (Type I error) to exactly <strong>${alphaFWPercent.toFixed(1)}%</strong>. ANOVA circumvents this entirely by executing a single, joint F-test that preserves the error rate at <strong>5.0%</strong>.`;
    
    // Re-trigger LaTeX math rendering just in the explanation box
    if (window.renderMathInElement) {
        renderMathInElement(lblGaugeExplanation, {delimiters: [{left: '$', right: '$', display: false}]});
    }
}

// --- EQUATION DYNAMIC HOVER HOOKS ---
function initHoverBindings() {
    eqTerms.forEach(term => {
        term.addEventListener('mouseenter', () => {
            const sym = term.dataset.term;
            STATE.hoveredTerm = sym;
            
            // Highlight equation label card
            const labelCard = document.getElementById(`lbl-${sym}`);
            if (labelCard) labelCard.classList.add('highlighted');
            
            updateVisuals();
        });
        
        term.addEventListener('mouseleave', () => {
            const sym = term.dataset.term;
            STATE.hoveredTerm = null;
            
            const labelCard = document.getElementById(`lbl-${sym}`);
            if (labelCard) labelCard.classList.remove('highlighted');
            
            updateVisuals();
        });
    });
}

// --- ACCORDION PREP ACTIONS ---
function initAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = item.querySelector('.accordion-content');
            
            // Close other items
            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.accordion-content').style.maxHeight = '0';
                }
            });
            
            item.classList.toggle('active');
            
            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = '0';
            }
        });
    });
}

// --- APP ROOT INITIALIZER ---
function initApp() {
    calculateANOVA();
    drawGrid();
    updateVisuals();
    updateDashboard();
    drawFDistribution();
    drawResidualNormality();
    updateAssumptionsGauges();
    updateTTestInflation();
    initHoverBindings();
    initAccordion();
    
    // Reset Data
    document.getElementById('btn-reset').addEventListener('click', () => {
        STATE.points = JSON.parse(JSON.stringify(DEFAULT_POINTS));
        calculateANOVA();
        updateVisuals();
        updateDashboard();
        drawFDistribution();
        drawResidualNormality();
        updateAssumptionsGauges();
    });
    
    // Slider t-test inflation
    sliderGroups.addEventListener('input', updateTTestInflation);
    
    // Tabs scroll navigation links
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

window.addEventListener('DOMContentLoaded', initApp);
