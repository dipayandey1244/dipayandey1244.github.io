/**
 * Variance Decomposition (ANOVA) Guide
 * Interactive logic, visualization math, and custom animations.
 */

// --- STATE MANAGEMENT ---
const STATE = {
    // 3 groups of 4 points
    points: [
        // Group 0 (Cyan Theme)
        { id: 0, group: 0, x: 140, y: 180 },
        { id: 1, group: 0, x: 180, y: 240 },
        { id: 2, group: 0, x: 220, y: 140 },
        { id: 3, group: 0, x: 260, y: 200 },
        
        // Group 1 (Amber Theme)
        { id: 4, group: 1, x: 380, y: 280 },
        { id: 5, group: 1, x: 420, y: 340 },
        { id: 6, group: 1, x: 460, y: 220 },
        { id: 7, group: 1, x: 500, y: 300 },
        
        // Group 2 (Pink Theme)
        { id: 8, group: 2, x: 620, y: 320 },
        { id: 9, group: 2, x: 660, y: 380 },
        { id: 10, group: 2, x: 700, y: 260 },
        { id: 11, group: 2, x: 740, y: 340 }
    ],
    // Math equivalents: data value = 400 - y_svg (so higher Y is a higher value)
    groupMeans: [0, 0, 0],
    grandMean: 0,
    ssTotal: 0,
    ssTreatment: 0,
    ssError: 0,
    
    // View state
    activeView: 'none', // 'none', 'total', 'treatment', 'error'
    
    // Dragging tracking
    draggedElement: null, // { type: 'point'|'group-mean', id: number }
    dragStartY: 0,
    dragStartPointY: 0,
    dragStartGroupPointsY: [] // Store initial Y of all group points during mean drag
};

// Colors for branding
const GROUP_COLORS = ['var(--color-group-1)', 'var(--color-group-2)', 'var(--color-group-3)'];
const GROUP_COLOR_GLOWS = ['rgba(6, 182, 212, 0.4)', 'rgba(245, 158, 11, 0.4)', 'rgba(236, 72, 153, 0.4)'];
const GROUP_NAMES = [
    "Layout A (Multi-Step)",
    "Layout B (One-Click)",
    "Layout C (Gamified)"
];

// Copy of default points for resetting
const DEFAULT_POINTS = JSON.parse(JSON.stringify(STATE.points));

// --- DOM ELEMENTS ---
const svgEl = document.getElementById('playground-svg');
const pointsLayer = svgEl.querySelector('.points-layer');
const groupMeansLayer = svgEl.querySelector('.group-means-layer');
const deviationsLayer = svgEl.querySelector('.deviations-layer');
const squaresLayer = svgEl.querySelector('.squares-layer');
const gridLinesLayer = svgEl.querySelector('.grid-lines');
const grandMeanLine = document.getElementById('line-grand-mean');
const grandMeanLabel = document.getElementById('label-grand-mean');

// Metric Values
const valSsTotal = document.getElementById('val-ss-total');
const valSsTreatment = document.getElementById('val-ss-treatment');
const valSsError = document.getElementById('val-ss-error');

// Bar Segments
const barTreatment = document.getElementById('bar-treatment');
const barError = document.getElementById('bar-error');
const labelTreatPercent = document.querySelector('.label-treat-percent');
const labelErrPercent = document.querySelector('.label-err-percent');

// Buttons & Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const btnReset = document.getElementById('btn-reset');
const btnDecompose = document.getElementById('btn-decompose');
const btnResetDecomp = document.getElementById('btn-reset-decomp');

// --- MATHEMATICAL COMPUTATIONS ---
function calculateStatistics() {
    // 1. Group Means
    const groupSums = [0, 0, 0];
    const groupCounts = [0, 0, 0];
    
    STATE.points.forEach(p => {
        // value = 400 - y
        const val = 400 - p.y;
        groupSums[p.group] += val;
        groupCounts[p.group]++;
    });
    
    for (let g = 0; g < 3; g++) {
        STATE.groupMeans[g] = groupSums[g] / groupCounts[g];
    }
    
    // 2. Grand Mean
    const totalSum = groupSums.reduce((a, b) => a + b, 0);
    STATE.grandMean = totalSum / STATE.points.length;
    
    // 3. Sum of Squares
    let ssTotal = 0;
    let ssTreatment = 0;
    let ssError = 0;
    
    STATE.points.forEach(p => {
        const val = 400 - p.y;
        const groupMean = STATE.groupMeans[p.group];
        
        ssTotal += Math.pow(val - STATE.grandMean, 2);
        ssError += Math.pow(val - groupMean, 2);
    });
    
    for (let g = 0; g < 3; g++) {
        ssTreatment += groupCounts[g] * Math.pow(STATE.groupMeans[g] - STATE.grandMean, 2);
    }
    
    STATE.ssTotal = ssTotal;
    // Round to avoid float precision drift (SS_Total = SS_Treatment + SS_Error exactly)
    STATE.ssTreatment = ssTreatment;
    STATE.ssError = Math.max(0, ssTotal - ssTreatment); // Enforce algebraic identity strictly
}

// --- RENDER DYNAMICS ---
function updateDashboard() {
    // Update metric cards text
    valSsTotal.textContent = STATE.ssTotal.toFixed(2);
    valSsTreatment.textContent = STATE.ssTreatment.toFixed(2);
    valSsError.textContent = STATE.ssError.toFixed(2);
    
    // Update percentages bar
    const total = STATE.ssTotal || 1;
    const treatPercent = (STATE.ssTreatment / total) * 100;
    const errorPercent = (STATE.ssError / total) * 100;
    
    barTreatment.style.width = `${treatPercent}%`;
    barError.style.width = `${errorPercent}%`;
    
    labelTreatPercent.textContent = `Between (Treat): ${treatPercent.toFixed(1)}%`;
    labelErrPercent.textContent = `Within (Error): ${errorPercent.toFixed(1)}%`;
    
    // Update active highlight classes in dashboard
    document.getElementById('card-total').classList.toggle('focused', STATE.activeView === 'total');
    document.getElementById('card-treatment').classList.toggle('focused', STATE.activeView === 'treatment');
    document.getElementById('card-error').classList.toggle('focused', STATE.activeView === 'error');
}

function drawGrid() {
    gridLinesLayer.innerHTML = '';
    // Draw horizontal grid lines
    for (let y = 50; y <= 400; y += 50) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'grid-line');
        line.setAttribute('x1', '50');
        line.setAttribute('y1', y);
        line.setAttribute('x2', '750');
        line.setAttribute('y2', y);
        gridLinesLayer.appendChild(line);
        
        // Draw axis value labels
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '20');
        text.setAttribute('y', y + 4);
        text.setAttribute('fill', 'var(--text-muted)');
        text.setAttribute('font-size', '10');
        text.setAttribute('font-weight', '500');
        text.textContent = 400 - y;
        gridLinesLayer.appendChild(text);
    }
}

function updateVisuals() {
    // 1. Calculate positions
    const grandMeanY = 400 - STATE.grandMean;
    grandMeanLine.setAttribute('y1', grandMeanY);
    grandMeanLine.setAttribute('y2', grandMeanY);
    grandMeanLabel.setAttribute('y', grandMeanY + 4);
    
    // 2. Render group means lines & drag handles
    groupMeansLayer.innerHTML = '';
    for (let g = 0; g < 3; g++) {
        const groupMeanY = 400 - STATE.groupMeans[g];
        const color = GROUP_COLORS[g];
        const glow = GROUP_COLOR_GLOWS[g];
        
        // Determine group X bounds based on points
        const groupPoints = STATE.points.filter(p => p.group === g);
        const minX = Math.min(...groupPoints.map(p => p.x)) - 30;
        const maxX = Math.max(...groupPoints.map(p => p.x)) + 30;
        
        // Group Mean Line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'group-mean-handle');
        line.setAttribute('x1', minX);
        line.setAttribute('y1', groupMeanY);
        line.setAttribute('x2', maxX);
        line.setAttribute('y2', groupMeanY);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('filter', 'url(#glow-effect)');
        line.addEventListener('pointerdown', (e) => startDrag(e, 'group-mean', g));
        groupMeansLayer.appendChild(line);
        
        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', minX);
        text.setAttribute('y', groupMeanY - 8);
        text.setAttribute('fill', color);
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '600');
        text.textContent = `${GROUP_NAMES[g]} Mean = ${STATE.groupMeans[g].toFixed(1)}s`;
        groupMeansLayer.appendChild(text);
    }
    
    // 3. Render deviations & squares
    deviationsLayer.innerHTML = '';
    squaresLayer.innerHTML = '';
    
    STATE.points.forEach(p => {
        const groupMeanY = 400 - STATE.groupMeans[p.group];
        const color = GROUP_COLORS[p.group];
        
        let startY, endY, strokeColor, fillColor, glowColor, activeSquare = false;
        
        if (STATE.activeView === 'total') {
            startY = p.y;
            endY = grandMeanY;
            strokeColor = 'var(--color-total)';
            fillColor = 'url(#total-grad)';
            glowColor = 'var(--color-total-glow)';
            activeSquare = true;
        } else if (STATE.activeView === 'treatment') {
            startY = groupMeanY;
            endY = grandMeanY;
            strokeColor = 'var(--color-treatment)';
            fillColor = 'url(#treatment-grad)';
            glowColor = 'var(--color-treatment-glow)';
            activeSquare = true;
        } else if (STATE.activeView === 'error') {
            startY = p.y;
            endY = groupMeanY;
            strokeColor = 'var(--color-error)';
            fillColor = 'url(#error-grad)';
            glowColor = 'var(--color-error-glow)';
            activeSquare = true;
        }
        
        if (activeSquare && Math.abs(startY - endY) > 0.5) {
            const side = Math.abs(startY - endY);
            const topY = Math.min(startY, endY);
            
            // Draw Deviation Line
            const devLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            devLine.setAttribute('class', 'deviation-line');
            devLine.setAttribute('x1', p.x);
            devLine.setAttribute('y1', startY);
            devLine.setAttribute('x2', p.x);
            devLine.setAttribute('y2', endY);
            devLine.setAttribute('stroke', strokeColor);
            devLine.setAttribute('stroke-width', '1.5');
            deviationsLayer.appendChild(devLine);
            
            // Draw Deviation Square (drawn to the right of the point X)
            const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            square.setAttribute('class', 'deviation-square');
            square.setAttribute('x', p.x);
            square.setAttribute('y', topY);
            square.setAttribute('width', side);
            square.setAttribute('height', side);
            square.setAttribute('fill', fillColor);
            square.setAttribute('stroke', strokeColor);
            square.setAttribute('stroke-width', '1.5');
            square.setAttribute('style', `filter: drop-shadow(0 0 4px ${glowColor});`);
            squaresLayer.appendChild(square);
        }
    });
    
    // 4. Render points
    pointsLayer.innerHTML = '';
    STATE.points.forEach(p => {
        const color = GROUP_COLORS[p.group];
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'draggable-point');
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('r', '7.5');
        circle.setAttribute('fill', '#090e17');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '2.5');
        circle.setAttribute('style', `filter: drop-shadow(0 0 6px ${color});`);
        circle.addEventListener('pointerdown', (e) => startDrag(e, 'point', p.id));
        pointsLayer.appendChild(circle);
    });
}

// --- POINTER DRAG HANDLERS ---
function startDrag(e, type, id) {
    e.preventDefault();
    STATE.draggedElement = { type, id };
    STATE.dragStartY = e.clientY;
    
    if (type === 'point') {
        const point = STATE.points.find(p => p.id === id);
        STATE.dragStartPointY = point.y;
        
        // Highlight active point visually
        const circles = pointsLayer.querySelectorAll('circle');
        const draggedIndex = STATE.points.findIndex(p => p.id === id);
        circles[draggedIndex].classList.add('dragging');
    } else if (type === 'group-mean') {
        // Record starting Y of all points in this group
        const groupPoints = STATE.points.filter(p => p.group === id);
        STATE.dragStartGroupPointsY = groupPoints.map(p => ({ id: p.id, y: p.y }));
        
        // Highlight corresponding group mean line
        const handles = groupMeansLayer.querySelectorAll('.group-mean-handle');
        handles[id].classList.add('dragging');
    }
    
    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', endDrag);
}

function onDrag(e) {
    if (!STATE.draggedElement) return;
    
    // Calculate delta in SVG space (height of SVG is 450, we scale ClientY appropriately)
    const svgRect = svgEl.getBoundingClientRect();
    const scaleY = 450 / svgRect.height;
    const deltaY = (e.clientY - STATE.dragStartY) * scaleY;
    
    if (STATE.draggedElement.type === 'point') {
        const point = STATE.points.find(p => p.id === STATE.draggedElement.id);
        let newY = STATE.dragStartPointY + deltaY;
        
        // Clamp Y to reasonable visualization margins (50 to 400)
        newY = Math.max(50, Math.min(400, newY));
        point.y = newY;
        
    } else if (STATE.draggedElement.type === 'group-mean') {
        // Drag all group points by the same delta
        STATE.dragStartGroupPointsY.forEach(sp => {
            const point = STATE.points.find(p => p.id === sp.id);
            let newY = sp.y + deltaY;
            
            // Constraint: don't let any point in the group go out of bounds
            newY = Math.max(50, Math.min(400, newY));
            point.y = newY;
        });
    }
    
    // Recalculate and update views
    calculateStatistics();
    updateDashboard();
    updateVisuals();
}

function endDrag() {
    if (STATE.draggedElement) {
        if (STATE.draggedElement.type === 'point') {
            const circles = pointsLayer.querySelectorAll('circle');
            circles.forEach(c => c.classList.remove('dragging'));
        } else if (STATE.draggedElement.type === 'group-mean') {
            const handles = groupMeansLayer.querySelectorAll('.group-mean-handle');
            handles.forEach(h => h.classList.remove('dragging'));
        }
    }
    
    STATE.draggedElement = null;
    document.removeEventListener('pointermove', onDrag);
    document.removeEventListener('pointerup', endDrag);
}

// --- DECOMPOSITION ANIMATION ENGINE ---
let isAnimating = false;

function buildStaticDecompSource() {
    const sourceSvg = document.getElementById('decomp-source-svg');
    sourceSvg.innerHTML = '';
    
    // Draw grand mean
    const grandMeanY = (400 - STATE.grandMean) * (280/450); // Scale to fit mini SVG height (280)
    const gmLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gmLine.setAttribute('x1', '20');
    gmLine.setAttribute('y1', grandMeanY);
    gmLine.setAttribute('x2', '360');
    gmLine.setAttribute('y2', grandMeanY);
    gmLine.setAttribute('stroke', 'var(--color-grand-mean)');
    gmLine.setAttribute('stroke-width', '1.5');
    gmLine.setAttribute('stroke-dasharray', '4,3');
    gmLine.setAttribute('opacity', '0.6');
    sourceSvg.appendChild(gmLine);
    
    // Draw group means & points
    for (let g = 0; g < 3; g++) {
        const groupMeanY = (400 - STATE.groupMeans[g]) * (280/450);
        const color = GROUP_COLORS[g];
        
        const groupPoints = STATE.points.filter(p => p.group === g);
        const minX = (Math.min(...groupPoints.map(p => p.x)) - 15) * (380/800);
        const maxX = (Math.max(...groupPoints.map(p => p.x)) + 15) * (380/800);
        
        // Group Mean
        const gm = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gm.setAttribute('x1', minX);
        gm.setAttribute('y1', groupMeanY);
        gm.setAttribute('x2', maxX);
        gm.setAttribute('y2', groupMeanY);
        gm.setAttribute('stroke', color);
        gm.setAttribute('stroke-width', '1.5');
        sourceSvg.appendChild(gm);
    }
    
    // Draw points
    STATE.points.forEach(p => {
        const px = p.x * (380/800);
        const py = p.y * (280/450);
        const color = GROUP_COLORS[p.group];
        
        // Draw standard deviation line depending on selected view or default to total
        let devColor = 'var(--color-total)';
        let startY = py;
        let endY = (400 - STATE.grandMean) * (280/450);
        
        if (STATE.activeView === 'treatment') {
            devColor = 'var(--color-treatment)';
            startY = (400 - STATE.groupMeans[p.group]) * (280/450);
        } else if (STATE.activeView === 'error') {
            devColor = 'var(--color-error)';
            endY = (400 - STATE.groupMeans[p.group]) * (280/450);
        }
        
        const dLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        dLine.setAttribute('x1', px);
        dLine.setAttribute('y1', startY);
        dLine.setAttribute('x2', px);
        dLine.setAttribute('y2', endY);
        dLine.setAttribute('stroke', devColor);
        dLine.setAttribute('stroke-width', '1');
        dLine.setAttribute('stroke-dasharray', '2,2');
        sourceSvg.appendChild(dLine);
        
        const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circ.setAttribute('cx', px);
        circ.setAttribute('cy', py);
        circ.setAttribute('r', '4');
        circ.setAttribute('fill', '#090e17');
        circ.setAttribute('stroke', color);
        circ.setAttribute('stroke-width', '1.5');
        sourceSvg.appendChild(circ);
    });
}

function handleDecompose() {
    if (isAnimating) return;
    isAnimating = true;
    
    // Clear out target stack containers
    const boxTotal = document.getElementById('box-total-ss');
    const boxTreatment = document.getElementById('box-treatment-ss');
    const boxError = document.getElementById('box-error-ss');
    
    // Remove placeholders
    boxTotal.querySelectorAll('.stack-block, .empty-state-label').forEach(el => el.remove());
    boxTreatment.querySelectorAll('.stack-block, .empty-state-label').forEach(el => el.remove());
    boxError.querySelectorAll('.stack-block, .empty-state-label').forEach(el => el.remove());
    
    // Temporarily build static copy of active workspace into the source card
    buildStaticDecompSource();
    
    // Calculate scaling factor. Stacks maximum height is 180px.
    const maxSSVal = Math.max(1, STATE.ssTotal);
    const scaleFactor = 170 / maxSSVal; // Keep 10px buffer inside boxes
    
    // Create elements, animate them flying, and then insert into accumulator
    const pointsList = [...STATE.points];
    
    // Generate block sizes for each point
    const animations = [];
    
    pointsList.forEach((p, idx) => {
        const val = 400 - p.y;
        const gm = STATE.groupMeans[p.group];
        
        // Sums of Squares contributions
        const dTotal = Math.pow(val - STATE.grandMean, 2);
        const dTreatment = Math.pow(gm - STATE.grandMean, 2);
        const dError = Math.pow(val - gm, 2);
        
        // Final stacked heights
        const hTotal = Math.max(1.5, dTotal * scaleFactor);
        const hTreatment = Math.max(1.5, dTreatment * scaleFactor);
        const hError = Math.max(1.5, dError * scaleFactor);
        
        // Find starting positions of elements in main SVG
        const svgRect = svgEl.getBoundingClientRect();
        
        // Compute coordinates in SVG relative to screen viewport
        const startX = svgRect.left + (p.x / 800) * svgRect.width;
        const startY = svgRect.top + (p.y / 450) * svgRect.height;
        
        animations.push({
            point: p,
            startX,
            startY,
            hTotal,
            hTreatment,
            hError,
            dTotal,
            dTreatment,
            dError
        });
    });
    
    // Sequential delay flying animation
    animations.forEach((anim, i) => {
        setTimeout(() => {
            // 1. Total SS Block Animation
            animateBlockFly(anim.startX, anim.startY, boxTotal, anim.hTotal, 'stack-block-total');
            
            // 2. Treatment Block Animation
            animateBlockFly(anim.startX, anim.startY, boxTreatment, anim.hTreatment, 'stack-block-treatment');
            
            // 3. Error Block Animation
            animateBlockFly(anim.startX, anim.startY, boxError, anim.hError, 'stack-block-error');
        }, i * 80);
    });
    
    // Update numerical readouts progressively
    let runningTotal = 0;
    let runningTreatment = 0;
    let runningError = 0;
    
    const totalDuration = (animations.length * 80) + 800; // time for final block to land
    
    const countInterval = setInterval(() => {
        runningTotal += STATE.ssTotal / 20;
        runningTreatment += STATE.ssTreatment / 20;
        runningError += STATE.ssError / 20;
        
        if (runningTotal >= STATE.ssTotal) {
            clearInterval(countInterval);
            document.getElementById('lbl-total-sum').textContent = STATE.ssTotal.toFixed(1);
            document.getElementById('lbl-treatment-sum').textContent = STATE.ssTreatment.toFixed(1);
            document.getElementById('lbl-error-sum').textContent = STATE.ssError.toFixed(1);
            isAnimating = false;
        } else {
            document.getElementById('lbl-total-sum').textContent = runningTotal.toFixed(1);
            document.getElementById('lbl-treatment-sum').textContent = runningTreatment.toFixed(1);
            document.getElementById('lbl-error-sum').textContent = runningError.toFixed(1);
        }
    }, totalDuration / 20);
}

function animateBlockFly(startX, startY, destContainer, height, blockClass) {
    const particle = document.createElement('div');
    particle.className = `flying-particle ${blockClass}`;
    particle.style.left = `${startX - 10}px`;
    particle.style.top = `${startY - 5}px`;
    particle.style.width = '20px';
    particle.style.height = '10px';
    particle.style.opacity = '0.9';
    document.body.appendChild(particle);
    
    // Bounding target container position
    const destRect = destContainer.getBoundingClientRect();
    const destX = destRect.left + (destRect.width / 2) - 10;
    const destY = destRect.bottom - height - 10;
    
    // Trigger paint reflow before applying transform
    particle.offsetWidth;
    
    // Slide and fade
    particle.style.transform = `translate(${destX - startX}px, ${destY - startY}px) scale(0.85)`;
    particle.style.height = `${height}px`;
    particle.style.opacity = '0.4';
    
    // Append to container after transition completed
    setTimeout(() => {
        particle.remove();
        
        const realBlock = document.createElement('div');
        realBlock.className = `stack-block ${blockClass}`;
        realBlock.style.height = `${height}px`;
        destContainer.appendChild(realBlock);
        
        // Clean up stacking layouts to align tightly
        destContainer.style.display = 'flex';
        destContainer.style.flexDirection = 'column-reverse';
    }, 800);
}

function handleResetDecompose() {
    isAnimating = false;
    
    const boxTotal = document.getElementById('box-total-ss');
    const boxTreatment = document.getElementById('box-treatment-ss');
    const boxError = document.getElementById('box-error-ss');
    
    // Re-insert placeholder labels
    boxTotal.innerHTML = '<div class="empty-state-label">Total SS</div>';
    boxTreatment.innerHTML = '<div class="empty-state-label">Treatment SS</div>';
    boxError.innerHTML = '<div class="empty-state-label">Error SS</div>';
    
    document.getElementById('lbl-total-sum').textContent = '0.0';
    document.getElementById('lbl-treatment-sum').textContent = '0.0';
    document.getElementById('lbl-error-sum').textContent = '0.0';
    
    const sourceSvg = document.getElementById('decomp-source-svg');
    sourceSvg.innerHTML = '';
}

// --- DEGREES OF FREEDOM SANDBOX ---
const DF_STATE = {
    // 4 points
    points: [
        { id: 0, x: 120, y: 120, draggable: true, color: 'var(--color-group-1)' },
        { id: 1, x: 240, y: 180, draggable: true, color: 'var(--color-group-2)' },
        { id: 2, x: 360, y: 100, draggable: true, color: 'var(--color-group-3)' },
        { id: 3, x: 480, y: 200, draggable: false, color: '#ffffff' } // locked point (Point 4)
    ],
    fixedMean: 150, // center Y line
    draggedId: null,
    dragStartY: 0,
    dragStartPointY: 0
};

const dfSvg = document.getElementById('df-svg');
const dfDotsLayer = dfSvg.querySelector('.df-dots');
const dfGuidelinesLayer = dfSvg.querySelector('.df-guidelines');

function initDfSandbox() {
    dfDotsLayer.innerHTML = '';
    
    DF_STATE.points.forEach(p => {
        // Guideline connecting to mean anchor line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('id', `df-line-${p.id}`);
        line.setAttribute('x1', p.x);
        line.setAttribute('y1', p.y);
        line.setAttribute('x2', p.x);
        line.setAttribute('y2', DF_STATE.fixedMean);
        line.setAttribute('stroke', p.color);
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-dasharray', p.draggable ? '3,3' : 'none');
        line.setAttribute('opacity', p.draggable ? '0.5' : '0.8');
        dfGuidelinesLayer.appendChild(line);
        
        // Point circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('id', `df-dot-${p.id}`);
        circle.setAttribute('class', p.draggable ? 'df-dot' : 'df-dot df-dot-locked');
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#090e17');
        circle.setAttribute('stroke', p.color);
        circle.setAttribute('stroke-width', p.draggable ? '2.5' : '3.5');
        
        if (!p.draggable) {
            circle.setAttribute('filter', 'url(#glow-effect)');
        } else {
            circle.setAttribute('style', `filter: drop-shadow(0 0 6px ${p.color});`);
            circle.addEventListener('pointerdown', (e) => startDfDrag(e, p.id));
        }
        
        dfDotsLayer.appendChild(circle);
        
        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('id', `df-lbl-${p.id}`);
        text.setAttribute('x', p.x + 12);
        text.setAttribute('y', p.y + 4);
        text.setAttribute('fill', p.color);
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', p.draggable ? '500' : '700');
        text.textContent = p.draggable ? `Point ${p.id+1} (${200 - p.y})` : `Point 4 Locked (${200 - p.y})`;
        dfDotsLayer.appendChild(text);
    });
}

function updateDfVisuals() {
    DF_STATE.points.forEach(p => {
        const dot = document.getElementById(`df-dot-${p.id}`);
        const line = document.getElementById(`df-line-${p.id}`);
        const lbl = document.getElementById(`df-lbl-${p.id}`);
        
        dot.setAttribute('cy', p.y);
        line.setAttribute('y1', p.y);
        lbl.setAttribute('y', p.y + 4);
        lbl.textContent = p.draggable ? `Point ${p.id+1} (${(200 - p.y).toFixed(0)})` : `Point 4 Locked (${(200 - p.y).toFixed(0)})`;
    });
}

function startDfDrag(e, id) {
    e.preventDefault();
    DF_STATE.draggedId = id;
    DF_STATE.dragStartY = e.clientY;
    DF_STATE.dragStartPointY = DF_STATE.points.find(p => p.id === id).y;
    
    document.getElementById(`df-dot-${id}`).classList.add('dragging');
    
    document.addEventListener('pointermove', onDfDrag);
    document.addEventListener('pointerup', endDfDrag);
}

function onDfDrag(e) {
    if (DF_STATE.draggedId === null) return;
    
    const svgRect = dfSvg.getBoundingClientRect();
    const scaleY = 300 / svgRect.height;
    const deltaY = (e.clientY - DF_STATE.dragStartY) * scaleY;
    
    const pDrag = DF_STATE.points.find(p => p.id === DF_STATE.draggedId);
    let newY = DF_STATE.dragStartPointY + deltaY;
    newY = Math.max(30, Math.min(270, newY)); // Keep within workspace boundary
    
    // Temp calculate Point 4 Y to ensure it stays in boundaries
    // sum of all points Y must equal 4 * fixedMean (since (y1+y2+y3+y4)/4 = fixedMean)
    // 4 * 150 = 600
    const sumOtherY = DF_STATE.points
        .filter(p => p.id !== DF_STATE.draggedId && p.id !== 3)
        .reduce((sum, p) => sum + p.y, 0);
        
    let p4Y = 600 - (sumOtherY + newY);
    
    // Clamp Point 4 within bounds (30 to 270) and adjust dragged point if needed
    if (p4Y < 30) {
        p4Y = 30;
        newY = 600 - (sumOtherY + p4Y);
    } else if (p4Y > 270) {
        p4Y = 270;
        newY = 600 - (sumOtherY + p4Y);
    }
    
    pDrag.y = newY;
    DF_STATE.points[3].y = p4Y; // Locked point Y
    
    updateDfVisuals();
}

function endDfDrag() {
    if (DF_STATE.draggedId !== null) {
        document.getElementById(`df-dot-${DF_STATE.draggedId}`).classList.remove('dragging');
    }
    DF_STATE.draggedId = null;
    document.removeEventListener('pointermove', onDfDrag);
    document.removeEventListener('pointerup', endDfDrag);
}


// --- GENERAL APP FLOWS ---
function initApp() {
    // Math computations
    calculateStatistics();
    
    // Render initial layers
    drawGrid();
    updateVisuals();
    updateDashboard();
    
    // Init Degrees of Freedom Sandbox
    initDfSandbox();
    
    // Tabs actions
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            STATE.activeView = btn.dataset.view;
            updateVisuals();
            updateDashboard();
        });
    });
    
    // Reset Data buttons
    btnReset.addEventListener('click', () => {
        STATE.points = JSON.parse(JSON.stringify(DEFAULT_POINTS));
        calculateStatistics();
        updateVisuals();
        updateDashboard();
    });
    
    // Decompose buttons
    btnDecompose.addEventListener('click', handleDecompose);
    btnResetDecomp.addEventListener('click', handleResetDecompose);
    
    // Scroll highlighters for navigation links
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
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

// Start everything
window.addEventListener('DOMContentLoaded', initApp);
