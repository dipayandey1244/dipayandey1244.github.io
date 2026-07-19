document.addEventListener('DOMContentLoaded', () => {

  // =================================================================
  // RETRO GAME AUDIO ENGINE (Web Audio API Synthesizer)
  // =================================================================
  let audioCtx = null;
  let isAudioOn = true;
  const audioToggleBtn = document.getElementById('audio-toggle-btn');

  audioToggleBtn.addEventListener('click', () => {
    isAudioOn = !isAudioOn;
    if (isAudioOn) {
      audioToggleBtn.classList.add('active');
      audioToggleBtn.textContent = '🔊 ON';
      initAudio();
    } else {
      audioToggleBtn.classList.remove('active');
      audioToggleBtn.textContent = '🔇 OFF';
    }
  });

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playBlip(freq, duration, type = 'sine') {
    if (!isAudioOn) return;
    initAudio();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio failed:", e);
    }
  }

  function playCoinSound() {
    if (!isAudioOn) return;
    playBlip(523.25, 0.08, 'sine'); // C5
    setTimeout(() => {
      playBlip(783.99, 0.15, 'sine'); // G5
    }, 70);
  }

  function playShuffleSound() {
    playBlip(Math.random() * 200 + 400, 0.03, 'triangle');
  }

  function playSuccessFanfare() {
    if (!isAudioOn) return;
    initAudio();
    const chords = [523.25, 659.25, 783.99, 1046.50];
    chords.forEach((note, idx) => {
      setTimeout(() => {
        playBlip(note, 0.25, 'sine');
      }, idx * 80);
    });
  }

  function playFailFanfare() {
    if (!isAudioOn) return;
    initAudio();
    const chords = [440.00, 415.30, 392.00, 311.13];
    chords.forEach((note, idx) => {
      setTimeout(() => {
        playBlip(note, 0.22, 'triangle');
      }, idx * 90);
    });
  }


  // =================================================================
  // TAB NAVIGATION
  // =================================================================
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetTab = tab.getAttribute('data-tab');
      document.getElementById(targetTab).classList.add('active');

      playCoinSound();

      if (targetTab === 'fisher') {
        stopFisherSimulation();
        resetFisherLab();
      } else if (targetTab === 'neyman') {
        updateNeymanCalculations();
      }
    });
  });


  // =================================================================
  // PART A: FISHER'S EXACT TEST (HONEY STUDY)
  // =================================================================
  
  const defaultFisherData = [
    { child: 1, group: 1, outcome: 3 },
    { child: 2, group: 1, outcome: 5 },
    { child: 3, group: 1, outcome: 0 },
    { child: 4, group: 0, outcome: 4 },
    { child: 5, group: 0, outcome: 0 },
    { child: 6, group: 0, outcome: 1 }
  ];

  let currentFisherData = JSON.parse(JSON.stringify(defaultFisherData));
  let fisherPermutationsList = [];
  let activeSimulationInterval = null;
  let activeSimulationIndex = 0;
  let simulatedATEs = [];

  const tableBody = document.querySelector('#fisher-table tbody');
  const coinElement = document.getElementById('coin-element');
  const deckContainer = document.getElementById('shuffle-card-container');
  const speedSlider = document.getElementById('sim-speed-slider');
  const speedVal = document.getElementById('sim-speed-val');

  const btnPlaySim = document.getElementById('btn-play-sim');
  const btnStopSim = document.getElementById('btn-stop-sim');
  const btnInstantFisher = document.getElementById('btn-instant-fisher');
  const btnResetFisher = document.getElementById('btn-reset-fisher');

  speedSlider.addEventListener('input', () => {
    speedVal.textContent = `${speedSlider.value}ms`;
  });

  function renderFisherTable() {
    tableBody.innerHTML = '';
    currentFisherData.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-hud); font-size: 0.8rem; font-weight: 500;">Child ${row.child}</td>
        <td>
          <select class="arcade-select fisher-group-select" data-index="${index}">
            <option value="1" ${row.group === 1 ? 'selected' : ''}>Treated (T)</option>
            <option value="0" ${row.group === 0 ? 'selected' : ''}>Control (C)</option>
          </select>
        </td>
        <td>
          <input type="number" class="arcade-input fisher-outcome-input" data-index="${index}" min="0" max="6" value="${row.outcome}">
        </td>
      `;
      tableBody.appendChild(tr);
    });

    document.querySelectorAll('.fisher-group-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        currentFisherData[idx].group = parseInt(e.target.value);
        playBlip(300, 0.05);
        resetFisherLab();
      });
    });

    document.querySelectorAll('.fisher-outcome-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        let val = parseFloat(e.target.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 6) val = 6;
        e.target.value = val;
        currentFisherData[idx].outcome = val;
        playBlip(350, 0.05);
        resetFisherLab();
      });
    });
  }

  function resetFisherLab() {
    stopFisherSimulation();
    simulatedATEs = [];
    activeSimulationIndex = 0;

    const treatment = currentFisherData.map(d => d.group);
    const outcomes = currentFisherData.map(d => d.outcome);
    const observedDiff = getATE(treatment, outcomes);

    const n = treatment.length;
    const n_t = treatment.reduce((sum, v) => sum + v, 0);
    const allIndices = Array.from({length: n}, (_, i) => i);
    fisherPermutationsList = getCombinations(allIndices, n_t);

    document.getElementById('fisher-val-obs').textContent = observedDiff.toFixed(2);
    document.getElementById('fisher-val-active').textContent = '---';
    document.getElementById('fisher-val-runs').textContent = '0';
    document.getElementById('fisher-val-pval').textContent = '---';
    
    const pvalHudBox = document.getElementById('fisher-pval-hud-box');
    pvalHudBox.className = 'hud-box';

    document.getElementById('fisher-result-alert').className = 'hud-alert info';
    document.getElementById('fisher-result-alert').innerHTML = `
      Honey Study dataset loaded! Click <strong>▶️ Play Sim</strong> to watch assignments shuffle.
    `;

    renderDeck(treatment);
    renderHistogram([], observedDiff);
  }

  function renderDeck(treatment) {
    deckContainer.innerHTML = '';
    treatment.forEach((grp, idx) => {
      const card = document.createElement('div');
      card.className = `shuffle-unit-card ${grp === 1 ? 'treated' : 'control'}`;
      card.innerHTML = `
        <span style="font-size: 0.6rem; color: var(--text-muted);">#${idx + 1}</span>
        <span style="font-weight: 600;">${grp === 1 ? 'Treat' : 'Ctrl'}</span>
      `;
      deckContainer.appendChild(card);
    });
  }

  function animateSimulationStep() {
    if (activeSimulationIndex >= fisherPermutationsList.length) {
      finishFisherSimulation();
      return;
    }

    coinElement.classList.remove('flipping');
    void coinElement.offsetWidth;
    coinElement.classList.add('flipping');
    coinElement.textContent = Math.random() > 0.5 ? 'T' : 'C';

    const tIndices = fisherPermutationsList[activeSimulationIndex];
    const n = currentFisherData.length;
    const currentW = Array(n).fill(0);
    tIndices.forEach(idx => currentW[idx] = 1);

    playShuffleSound();
    renderDeck(currentW);

    const outcomes = currentFisherData.map(d => d.outcome);
    const currentDiff = getATE(currentW, outcomes);
    simulatedATEs.push(currentDiff);

    document.getElementById('fisher-val-active').textContent = currentDiff.toFixed(2);
    document.getElementById('fisher-val-runs').textContent = simulatedATEs.length;

    const observedDiff = getATE(currentFisherData.map(d => d.group), outcomes);
    const extremeCount = simulatedATEs.filter(d => Math.abs(d) >= Math.abs(observedDiff) - 1e-9).length;
    const pValueSoFar = extremeCount / simulatedATEs.length;
    document.getElementById('fisher-val-pval').textContent = pValueSoFar.toFixed(4);

    renderHistogram(simulatedATEs, observedDiff);
    activeSimulationIndex++;
  }

  btnPlaySim.addEventListener('click', () => {
    initAudio();
    btnPlaySim.style.display = 'none';
    btnStopSim.style.display = 'inline-flex';
    
    if (activeSimulationIndex >= fisherPermutationsList.length) {
      simulatedATEs = [];
      activeSimulationIndex = 0;
    }

    const intervalTime = parseInt(speedSlider.value);
    activeSimulationInterval = setInterval(animateSimulationStep, intervalTime);
  });

  function stopFisherSimulation() {
    if (activeSimulationInterval) {
      clearInterval(activeSimulationInterval);
      activeSimulationInterval = null;
    }
    btnPlaySim.style.display = 'inline-flex';
    btnStopSim.style.display = 'none';
  }
  btnStopSim.addEventListener('click', stopFisherSimulation);

  btnInstantFisher.addEventListener('click', () => {
    stopFisherSimulation();
    playCoinSound();

    const treatment = currentFisherData.map(d => d.group);
    const outcomes = currentFisherData.map(d => d.outcome);
    const observedDiff = getATE(treatment, outcomes);

    simulatedATEs = [];
    fisherPermutationsList.forEach(tIndices => {
      const dummyW = Array(treatment.length).fill(0);
      tIndices.forEach(idx => dummyW[idx] = 1);
      simulatedATEs.push(getATE(dummyW, outcomes));
    });

    activeSimulationIndex = fisherPermutationsList.length;
    document.getElementById('fisher-val-active').textContent = 'DONE';
    document.getElementById('fisher-val-runs').textContent = simulatedATEs.length;
    finishFisherSimulation();
  });

  btnResetFisher.addEventListener('click', () => {
    currentFisherData = JSON.parse(JSON.stringify(defaultFisherData));
    renderFisherTable();
    resetFisherLab();
    playCoinSound();
  });

  function finishFisherSimulation() {
    stopFisherSimulation();
    
    const outcomes = currentFisherData.map(d => d.outcome);
    const observedDiff = getATE(currentFisherData.map(d => d.group), outcomes);
    const extremeCount = simulatedATEs.filter(d => Math.abs(d) >= Math.abs(observedDiff) - 1e-9).length;
    const pValue = extremeCount / simulatedATEs.length;

    document.getElementById('fisher-val-pval').textContent = pValue.toFixed(4);

    const alertBox = document.getElementById('fisher-result-alert');
    const pvalHudBox = document.getElementById('fisher-pval-hud-box');
    pvalHudBox.className = 'hud-box';

    if (pValue < 0.05) {
      pvalHudBox.classList.add('success');
      alertBox.className = 'hud-alert success';
      alertBox.innerHTML = `
        <strong>🏆 Statistically Significant (Significant at 5%):</strong> 
        The exact p-value is <strong>${pValue.toFixed(4)}</strong>. Under Fisher's sharp null hypothesis 
        of a zero treatment effect for everyone, there is only a ${(pValue * 100).toFixed(1)}% chance we would 
        observe a difference in cough severity of ${observedDiff.toFixed(2)} or larger by random assignment alone. Reject H₀!
      `;
      playSuccessFanfare();
    } else {
      pvalHudBox.classList.add('error');
      alertBox.className = 'hud-alert warning';
      alertBox.innerHTML = `
        <strong>⚠️ Fail to Reject H₀ (Not Significant):</strong> 
        The p-value is <strong>${pValue.toFixed(4)}</strong>. Under the sharp null, there is a ${(pValue * 100).toFixed(1)}% 
        chance of getting an average difference of ${observedDiff.toFixed(2)} by random assignment split alone. The treatment effect is not significant.
      `;
      playFailFanfare();
    }

    renderDeck(currentFisherData.map(d => d.group));
    renderHistogram(simulatedATEs, observedDiff);
  }

  function getATE(treatment, outcome) {
    let sumT = 0, countT = 0;
    let sumC = 0, countC = 0;
    for (let i = 0; i < treatment.length; i++) {
      if (treatment[i] === 1) { sumT += outcome[i]; countT++; }
      else { sumC += outcome[i]; countC++; }
    }
    return countT > 0 && countC > 0 ? (sumT / countT) - (sumC / countC) : 0;
  }

  function getCombinations(array, k) {
    const result = [];
    function helper(temp, start) {
      if (temp.length === k) { result.push([...temp]); return; }
      for (let i = start; i < array.length; i++) {
        temp.push(array[i]);
        helper(temp, i + 1);
        temp.pop();
      }
    }
    helper([], 0);
    return result;
  }

  function renderHistogram(diffs, observedDiff) {
    const svg = document.getElementById('fisher-svg');
    svg.innerHTML = '';

    const width = 650;
    const height = 280;
    const padding = { top: 25, right: 35, bottom: 40, left: 45 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const uniqueValues = [-3.667, -2.333, -1.667, -1.0, -0.333, 0.333, 1.0, 1.667, 2.333, 3.667];
    const minX = -4.2;
    const maxX = 4.2;
    const xRange = maxX - minX;

    function getX(val) {
      return padding.left + ((val - minX) / xRange) * chartWidth;
    }

    const freqs = {};
    uniqueValues.forEach(v => freqs[v.toFixed(3)] = 0);
    diffs.forEach(d => {
      let closest = uniqueValues[0];
      let minDst = Math.abs(d - closest);
      uniqueValues.forEach(uv => {
        if (Math.abs(d - uv) < minDst) {
          minDst = Math.abs(d - uv);
          closest = uv;
        }
      });
      freqs[closest.toFixed(3)] = (freqs[closest.toFixed(3)] || 0) + 1;
    });

    const maxFreq = Math.max(3, ...Object.values(freqs));

    function getY(f) {
      return padding.top + chartHeight - (f / maxFreq) * chartHeight;
    }

    // Grid
    const gridTicks = 3;
    for (let i = 0; i <= gridTicks; i++) {
      const val = (i / gridTicks) * maxFreq;
      const y = getY(val);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', width - padding.right);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'chart-grid-line');
      svg.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', padding.left - 8);
      text.setAttribute('y', y + 3);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('class', 'chart-text');
      text.textContent = Math.round(val);
      svg.appendChild(text);
    }

    // Bars
    const barWidth = 32;
    uniqueValues.forEach(uv => {
      const freq = freqs[uv.toFixed(3)];
      const x = getX(uv) - barWidth / 2;
      const y = getY(freq);
      const h = padding.top + chartHeight - y;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', h);
      
      const isObs = Math.abs(uv - observedDiff) < 0.1;
      rect.setAttribute('class', `chart-bar ${isObs ? 'observed' : ''}`);
      
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `ATE: ${uv.toFixed(3)} | Frequency: ${freq}`;
      rect.appendChild(title);
      svg.appendChild(rect);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', getX(uv));
      text.setAttribute('y', padding.top + chartHeight + 16);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'chart-text');
      text.textContent = uv.toFixed(1);
      svg.appendChild(text);
    });

    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', padding.left);
    xAxis.setAttribute('y1', padding.top + chartHeight);
    xAxis.setAttribute('x2', width - padding.right);
    xAxis.setAttribute('y2', padding.top + chartHeight);
    xAxis.setAttribute('class', 'chart-axis-line');
    svg.appendChild(xAxis);

    const obsX = getX(observedDiff);
    const obsLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    obsLine.setAttribute('x1', obsX);
    obsLine.setAttribute('y1', padding.top - 5);
    obsLine.setAttribute('x2', obsX);
    obsLine.setAttribute('y2', padding.top + chartHeight);
    obsLine.setAttribute('stroke', 'var(--accent-secondary)');
    obsLine.setAttribute('stroke-width', '2.5');
    obsLine.setAttribute('stroke-dasharray', '5 3');
    svg.appendChild(obsLine);

    const obsText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    obsText.setAttribute('x', obsX);
    obsText.setAttribute('y', padding.top - 10);
    obsText.setAttribute('text-anchor', 'middle');
    obsText.setAttribute('fill', 'var(--accent-secondary)');
    obsText.setAttribute('font-family', 'var(--font-body)');
    obsText.setAttribute('font-size', '10px');
    obsText.setAttribute('font-weight', '700');
    obsText.textContent = `OBS ATE: ${observedDiff.toFixed(2)}`;
    svg.appendChild(obsText);
  }


  // =================================================================
  // NEYMAN CAUSAL LAB (TEACHER INCENTIVES)
  // =================================================================

  const sliderNc = document.getElementById('slider-nc');
  const sliderMeanC = document.getElementById('slider-meanc');
  const sliderSdC = document.getElementById('slider-sdc');
  const sliderNt = document.getElementById('slider-nt');
  const sliderMeanT = document.getElementById('slider-meant');
  const sliderSdT = document.getElementById('slider-sdt');
  const selectAlpha = document.getElementById('slider-alpha');

  const presetAttendanceBtn = document.getElementById('preset-attendance');
  const presetTestBtn = document.getElementById('preset-test-attempt');

  const controlTeacherGrid = document.getElementById('control-teacher-grid');
  const treatmentTeacherGrid = document.getElementById('treatment-teacher-grid');

  let activePreset = 'attendance'; // 'attendance' or 'test_attempt'

  const neymanSliders = [sliderNc, sliderMeanC, sliderSdC, sliderNt, sliderMeanT, sliderSdT];

  neymanSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const rawVal = parseFloat(e.target.value);
      let dispVal = `${rawVal}%`;
      if (e.target.id.includes('sd')) {
        dispVal = (rawVal / 100).toFixed(2);
      } else if (e.target.id.includes('nc') || e.target.id.includes('nt')) {
        dispVal = rawVal;
      }
      
      const labelId = e.target.id.replace('slider', 'val');
      document.getElementById(labelId).textContent = dispVal;

      playBlip(Math.random() * 50 + 600, 0.02, 'sine');
      updateNeymanCalculations();
    });
  });

  selectAlpha.addEventListener('change', () => {
    playCoinSound();
    updateNeymanCalculations();
  });

  // Presets
  presetAttendanceBtn.addEventListener('click', () => {
    activePreset = 'attendance';
    setupPresetSlidersLabels();
    applyNeymanPreset(56, 58, 16, 57, 80, 14, '0.05');
  });

  presetTestBtn.addEventListener('click', () => {
    activePreset = 'test_attempt';
    setupPresetSlidersLabels();
    applyNeymanPreset(56, 40, 20, 57, 45, 21, '0.05');
  });

  function setupPresetSlidersLabels() {
    const lblMeanC = document.getElementById('label-meanc');
    const lblMeanT = document.getElementById('label-meant');
    const gridTitle = document.getElementById('classroom-grid-title');
    const treatHeader = document.getElementById('treatment-grid-header');

    if (activePreset === 'attendance') {
      lblMeanC.textContent = 'Control Attendance Rate';
      lblMeanT.textContent = 'Treatment Attendance Rate';
      gridTitle.textContent = 'Visual Grid: Teacher Attendance';
      treatHeader.textContent = 'Treatment Cohort (Incentive Pay) 📷';
    } else {
      lblMeanC.textContent = 'Control Student Test Rate';
      lblMeanT.textContent = 'Treatment Student Test Rate';
      gridTitle.textContent = 'Visual Grid: Test Attempt Rates';
      treatHeader.textContent = 'Treatment Cohort (Incentive Pay) ✏️';
    }
  }

  function applyNeymanPreset(n_c, mean_c, sd_c, n_t, mean_t, sd_t, alpha) {
    sliderNc.value = n_c;
    sliderMeanC.value = mean_c;
    sliderSdC.value = sd_c;
    sliderNt.value = n_t;
    sliderMeanT.value = mean_t;
    sliderSdT.value = sd_t;
    selectAlpha.value = alpha;

    // Display updates
    document.getElementById('val-nc').textContent = n_c;
    document.getElementById('val-nt').textContent = n_t;
    document.getElementById('val-meanc').textContent = `${mean_c}%`;
    document.getElementById('val-sdc').textContent = (sd_c / 100).toFixed(2);
    document.getElementById('val-meant').textContent = `${mean_t}%`;
    document.getElementById('val-sdt').textContent = (sd_t / 100).toFixed(2);

    updateNeymanCalculations();
  }

  function erf(x) {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function getZCritical(alpha) {
    if (alpha === 0.01) return 2.576;
    if (alpha === 0.10) return 1.645;
    return 1.96;
  }

  function updateNeymanCalculations() {
    const n_c = parseInt(sliderNc.value);
    const mean_c = parseInt(sliderMeanC.value) / 100;
    const sd_c = parseInt(sliderSdC.value) / 100;

    const n_t = parseInt(sliderNt.value);
    const mean_t = parseInt(sliderMeanT.value) / 100;
    const sd_t = parseInt(sliderSdT.value) / 100;

    const alpha = parseFloat(selectAlpha.value);

    // point ATE
    const ate = mean_t - mean_c;
    const variance = (Math.pow(sd_c, 2) / n_c) + (Math.pow(sd_t, 2) / n_t);
    const se = Math.sqrt(variance);

    const tStat = se > 0 ? (ate / se) : 0;
    const pValue = 2 * (1 - 0.5 * (1 + erf(Math.abs(tStat) / Math.sqrt(2))));

    const z = getZCritical(alpha);
    const ciLower = ate - z * se;
    const ciUpper = ate + z * se;

    // HUD values
    document.getElementById('neyman-val-ate').textContent = (ate * 100).toFixed(1) + '%';
    document.getElementById('neyman-val-se').textContent = se.toFixed(4);
    document.getElementById('neyman-val-t').textContent = tStat.toFixed(2);

    const pValBox = document.getElementById('neyman-val-pval');
    if (pValue < 0.0001) pValBox.textContent = '< 0.0001';
    else pValBox.textContent = pValue.toFixed(4);

    const alertBox = document.getElementById('neyman-result-alert');
    const pvalHudBox = document.getElementById('neyman-pval-hud-box');
    pvalHudBox.className = 'hud-box';

    const confidencePct = Math.round((1 - alpha) * 100);

    // Alerts updates
    if (pValue < alpha) {
      pvalHudBox.classList.add('success');
      alertBox.className = 'hud-alert success';
      alertBox.innerHTML = `
        <strong>🏆 Statistically Significant:</strong> The estimated ATE of <strong>${(ate * 100).toFixed(1)}%</strong> is 
        statistically significant at the ${confidencePct}% level (t = ${tStat.toFixed(2)}, p = ${pValue < 0.0001 ? '&lt; 0.0001' : pValue.toFixed(4)}). 
        The confidence interval is <strong>[${(ciLower * 100).toFixed(1)}%, ${(ciUpper * 100).toFixed(1)}%]</strong>, which excludes 0.
      `;
    } else {
      pvalHudBox.classList.add('error');
      alertBox.className = 'hud-alert warning';
      alertBox.innerHTML = `
        <strong>⚠️ Not Statistically Significant:</strong> The estimated ATE of <strong>${(ate * 100).toFixed(1)}%</strong> is 
        not statistically significant at the ${confidencePct}% level (t = ${tStat.toFixed(2)}, p = ${pValue.toFixed(4)}). 
        The confidence interval is <strong>[${(ciLower * 100).toFixed(1)}%, ${(ciUpper * 100).toFixed(1)}%]</strong>, which includes 0.
      `;
    }

    renderVisualClassroom(mean_c, mean_t);
    renderNeymanCurves(mean_c, sd_c, mean_t, sd_t);
    renderNeymanCI(ate, ciLower, ciUpper);
  }

  // Grid rendering
  function renderVisualClassroom(meanC, meanT) {
    const totalSlots = 30;
    controlTeacherGrid.innerHTML = '';
    treatmentTeacherGrid.innerHTML = '';

    const presentCountC = Math.round(totalSlots * meanC);
    const presentCountT = Math.round(totalSlots * meanT);

    if (activePreset === 'attendance') {
      document.getElementById('control-grid-pct').textContent = `${Math.round(meanC * 100)}% Present`;
      document.getElementById('treatment-grid-pct').textContent = `${Math.round(meanT * 100)}% Present`;

      // Control
      for (let i = 0; i < totalSlots; i++) {
        const icon = document.createElement('div');
        icon.className = 'teacher-avatar';
        if (i < presentCountC) {
          icon.classList.add('present');
          icon.textContent = '👩‍🏫';
        } else {
          icon.textContent = '💤';
        }
        controlTeacherGrid.appendChild(icon);
      }

      // Treatment
      for (let i = 0; i < totalSlots; i++) {
        const icon = document.createElement('div');
        icon.className = 'teacher-avatar';
        if (i < presentCountT) {
          icon.classList.add('present');
          icon.textContent = '👩‍🏫';
          const camera = document.createElement('span');
          camera.style.fontSize = '0.5rem';
          camera.style.verticalAlign = 'super';
          camera.textContent = '📷';
          icon.appendChild(camera);
        } else {
          icon.textContent = '💤';
        }
        treatmentTeacherGrid.appendChild(icon);
      }
    } else {
      // Test attempt rate
      document.getElementById('control-grid-pct').textContent = `${Math.round(meanC * 100)}% Took Test`;
      document.getElementById('treatment-grid-pct').textContent = `${Math.round(meanT * 100)}% Took Test`;

      // Control
      for (let i = 0; i < totalSlots; i++) {
        const icon = document.createElement('div');
        icon.className = 'teacher-avatar';
        if (i < presentCountC) {
          icon.classList.add('present');
          icon.textContent = '📖'; // student taking test
        } else {
          icon.textContent = '💤'; // absent on test day
        }
        controlTeacherGrid.appendChild(icon);
      }

      // Treatment
      for (let i = 0; i < totalSlots; i++) {
        const icon = document.createElement('div');
        icon.className = 'teacher-avatar';
        if (i < presentCountT) {
          icon.classList.add('present');
          icon.textContent = '📖';
          const pencil = document.createElement('span');
          pencil.style.fontSize = '0.5rem';
          pencil.style.verticalAlign = 'super';
          pencil.textContent = '✏️';
          icon.appendChild(pencil);
        } else {
          icon.textContent = '💤';
        }
        treatmentTeacherGrid.appendChild(icon);
      }
    }
  }

  function renderNeymanCurves(meanC, sdC, meanT, sdT) {
    const svg = document.getElementById('neyman-curves-svg');
    svg.innerHTML = '';

    const width = 650;
    const height = 250;
    const padding = { top: 35, right: 35, bottom: 35, left: 35 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minX = Math.max(0.0, Math.min(meanC - 3.5 * sdC, meanT - 3.5 * sdT));
    const maxX = Math.min(1.2, Math.max(meanC + 3.5 * sdC, meanT + 3.5 * sdT));
    const xRange = maxX - minX;

    function getX(v) {
      return padding.left + ((v - minX) / xRange) * chartWidth;
    }

    function normalPDF(x, mean, sd) {
      return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
    }

    const steps = 80;
    let maxDensity = 0.5;
    for (let i = 0; i <= steps; i++) {
      const x = minX + (i / steps) * xRange;
      maxDensity = Math.max(maxDensity, normalPDF(x, meanC, sdC), normalPDF(x, meanT, sdT));
    }

    function getY(d) {
      return padding.top + chartHeight - (d / maxDensity) * chartHeight;
    }

    function getPaths(mean, sd) {
      let pts = [];
      for (let i = 0; i <= steps; i++) {
        const x = minX + (i / steps) * xRange;
        const d = normalPDF(x, mean, sd);
        pts.push(`${getX(x)},${getY(d)}`);
      }
      const startX = getX(minX);
      const endX = getX(maxX);
      const baseHeight = padding.top + chartHeight;
      const stroke = `M ${pts.join(' L ')}`;
      const fill = `${stroke} L ${endX},${baseHeight} L ${startX},${baseHeight} Z`;
      return { stroke, fill };
    }

    const pathC = getPaths(meanC, sdC);
    const pathT = getPaths(meanT, sdT);

    const fillC = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fillC.setAttribute('d', pathC.fill);
    fillC.setAttribute('class', 'dist-bell-curve control');
    fillC.setAttribute('stroke', 'none');
    svg.appendChild(fillC);

    const fillT = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fillT.setAttribute('d', pathT.fill);
    fillT.setAttribute('class', 'dist-bell-curve treatment');
    fillT.setAttribute('stroke', 'none');
    svg.appendChild(fillT);

    const lineC = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    lineC.setAttribute('d', pathC.stroke);
    lineC.setAttribute('class', 'dist-bell-curve control');
    svg.appendChild(lineC);

    const lineT = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    lineT.setAttribute('d', pathT.stroke);
    lineT.setAttribute('class', 'dist-bell-curve treatment');
    svg.appendChild(lineT);

    // Mean lines
    const meanC_X = getX(meanC);
    const meanT_X = getX(meanT);
    const baseHeight = padding.top + chartHeight;

    const meanLineC = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    meanLineC.setAttribute('x1', meanC_X);
    meanLineC.setAttribute('y1', getY(normalPDF(meanC, meanC, sdC)));
    meanLineC.setAttribute('x2', meanC_X);
    meanLineC.setAttribute('y2', baseHeight);
    meanLineC.setAttribute('class', 'dist-mean-line control');
    svg.appendChild(meanLineC);

    const meanLineT = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    meanLineT.setAttribute('x1', meanT_X);
    meanLineT.setAttribute('y1', getY(normalPDF(meanT, meanT, sdT)));
    meanLineT.setAttribute('x2', meanT_X);
    meanLineT.setAttribute('y2', baseHeight);
    meanLineT.setAttribute('class', 'dist-mean-line treatment');
    svg.appendChild(meanLineT);

    // Axis
    const bottomLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    bottomLine.setAttribute('x1', padding.left);
    bottomLine.setAttribute('y1', baseHeight);
    bottomLine.setAttribute('x2', width - padding.right);
    bottomLine.setAttribute('y2', baseHeight);
    bottomLine.setAttribute('class', 'chart-axis-line');
    svg.appendChild(bottomLine);

    // Labels
    const ticks = 6;
    for (let i = 0; i <= ticks; i++) {
      const val = minX + (i / ticks) * xRange;
      const x = getX(val);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', baseHeight + 15);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'chart-text');
      text.textContent = `${Math.round(val * 100)}%`;
      svg.appendChild(text);
    }
  }

  function renderNeymanCI(ate, ciLower, ciUpper) {
    const svg = document.getElementById('neyman-ci-svg');
    svg.innerHTML = '';

    const width = 650;
    const height = 120;
    const padding = { left: 45, right: 45, top: 35, bottom: 35 };

    const chartWidth = width - padding.left - padding.right;
    const midY = height / 2;

    const minX = Math.min(-0.15, ciLower - 0.05);
    const maxX = Math.max(0.45, ciUpper + 0.05);
    const xRange = maxX - minX;

    function getX(v) {
      return padding.left + ((v - minX) / xRange) * chartWidth;
    }

    // Null Line
    const zeroX = getX(0.0);
    const nullLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    nullLine.setAttribute('x1', zeroX);
    nullLine.setAttribute('y1', padding.top - 10);
    nullLine.setAttribute('x2', zeroX);
    nullLine.setAttribute('y2', height - padding.bottom + 10);
    nullLine.setAttribute('class', 'ci-null-line');
    svg.appendChild(nullLine);

    const nullText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nullText.setAttribute('x', zeroX - 5);
    nullText.setAttribute('y', padding.top - 12);
    nullText.setAttribute('text-anchor', 'end');
    nullText.setAttribute('fill', 'var(--color-error)');
    nullText.setAttribute('font-family', 'var(--font-hud)');
    nullText.setAttribute('font-size', '9px');
    nullText.textContent = 'NO EFFECT';
    svg.appendChild(nullText);

    const startX = getX(ciLower);
    const endX = getX(ciUpper);

    // CI Line
    const ciBar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ciBar.setAttribute('x1', startX);
    ciBar.setAttribute('y1', midY);
    ciBar.setAttribute('x2', endX);
    ciBar.setAttribute('y2', midY);
    ciBar.setAttribute('class', 'ci-bar');
    svg.appendChild(ciBar);

    // Dot ATE
    const ptX = getX(ate);
    const pt = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pt.setAttribute('cx', ptX);
    pt.setAttribute('cy', midY);
    pt.setAttribute('r', '5');
    pt.setAttribute('class', 'ci-point');
    svg.appendChild(pt);

    // Label
    const ptLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    ptLabel.setAttribute('x', ptX);
    ptLabel.setAttribute('y', midY - 12);
    ptLabel.setAttribute('text-anchor', 'middle');
    ptLabel.setAttribute('fill', 'var(--text-primary)');
    ptLabel.setAttribute('font-family', 'var(--font-hud)');
    ptLabel.setAttribute('font-size', '10px');
    ptLabel.textContent = `ATE = ${(ate * 100).toFixed(1)}%`;
    svg.appendChild(ptLabel);

    // Bounds Labels
    const lLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lLabel.setAttribute('x', startX);
    lLabel.setAttribute('y', midY + 16);
    lLabel.setAttribute('text-anchor', 'middle');
    lLabel.setAttribute('fill', 'var(--accent-primary)');
    lLabel.setAttribute('font-family', 'var(--font-mono)');
    lLabel.setAttribute('font-size', '9px');
    lLabel.textContent = `${(ciLower * 100).toFixed(1)}%`;
    svg.appendChild(lLabel);

    const uLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    uLabel.setAttribute('x', endX);
    uLabel.setAttribute('y', midY + 16);
    uLabel.setAttribute('text-anchor', 'middle');
    uLabel.setAttribute('fill', 'var(--accent-secondary)');
    uLabel.setAttribute('font-family', 'var(--font-mono)');
    uLabel.setAttribute('font-size', '9px');
    uLabel.textContent = `${(ciUpper * 100).toFixed(1)}%`;
    svg.appendChild(uLabel);

    // Axis
    const axis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    axis.setAttribute('x1', padding.left);
    axis.setAttribute('y1', height - padding.bottom);
    axis.setAttribute('x2', width - padding.right);
    axis.setAttribute('y2', height - padding.bottom);
    axis.setAttribute('class', 'chart-axis-line');
    svg.appendChild(axis);

    const ticks = 7;
    for (let i = 0; i <= ticks; i++) {
      const val = minX + (i / ticks) * xRange;
      const x = getX(val);
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', height - padding.bottom + 12);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'chart-text');
      label.textContent = `${Math.round(val * 100)}%`;
      svg.appendChild(label);
    }
  }


  // =================================================================
  // STEP-BY-STEP GUIDED INTERACTIVE STEPPERS
  // =================================================================

  // 1. Fisher Stepper
  let currentFisherStep = 1;
  const fisherStepMax = 5;

  const btnFisherStepPrev = document.getElementById('btn-fisher-step-prev');
  const btnFisherStepNext = document.getElementById('btn-fisher-step-next');
  const fisherStepIndicator = document.getElementById('fisher-step-indicator');
  const fisherStepTitle = document.getElementById('fisher-step-title');
  const fisherStepDesc = document.getElementById('fisher-step-desc');

  const fisherStepsData = [
    {
      title: "Step 1: State the Sharp Null Hypothesis",
      desc: "Assume the treatment (honey) has absolutely zero effect on any child: Y_i(1) = Y_i(0) for all i. Under this assumption, we can fill in all missing potential outcomes! Look at the Reference Table: the counterfactual outcomes are identical to the observed ones.",
      action: () => {
        highlightReferenceRow(null); // Reset highlights
        playCoinSound();
      }
    },
    {
      title: "Step 2: Choose a Random Treatment Assignment",
      desc: "Shuffle the group labels! In the shuffler box below, cards are randomly assigned to Treatment (T) or Control (C). Click 'Next Step' to see a single random shuffle.",
      action: () => {
        playShuffleSound();
        // Trigger one shuffle step
        const treatment = currentFisherData.map(d => d.group);
        const shuffled = [...treatment].sort(() => Math.random() - 0.5);
        renderDeck(shuffled);
        coinElement.classList.add('flipping');
        setTimeout(() => coinElement.classList.remove('flipping'), 400);
      }
    },
    {
      title: "Step 3: Calculate the Trial Statistic (ATE)",
      desc: "Calculate the difference in mean cough scores between the simulated groups: ATE* = Mean(Treated*) - Mean(Control*). We measure how far this is from our observed difference of 1.00.",
      action: () => {
        playBlip(600, 0.1);
        const treatment = currentFisherData.map(d => d.group);
        const outcomes = currentFisherData.map(d => d.outcome);
        const shuffledW = [...treatment].sort(() => Math.random() - 0.5);
        const stepATE = getATE(shuffledW, outcomes);
        document.getElementById('fisher-val-active').textContent = stepATE.toFixed(2);
        
        // Highlight active deck HUD
        const activeHUD = document.getElementById('fisher-val-active').parentElement;
        activeHUD.style.borderColor = 'var(--accent-secondary)';
        setTimeout(() => activeHUD.style.borderColor = 'var(--border-color)', 800);
      }
    },
    {
      title: "Step 4: Repeat for All Permutations",
      desc: "Repeat this shuffle for all 20 possible combinations to compile the full probability distribution. Click the 'Fast' or 'Play Sim' buttons to run this automatically.",
      action: () => {
        playCoinSound();
        // Show distribution bars flashing
        const svg = document.getElementById('fisher-svg');
        svg.style.opacity = '0.5';
        setTimeout(() => svg.style.opacity = '1', 400);
      }
    },
    {
      title: "Step 5: Calculate p-value & Reject/Accept H₀",
      desc: "Find the proportion of shuffles where the absolute difference is as large or larger than our observed difference (1.00). Here, 16 out of 20 shuffles are at least as extreme, giving a p-value of 0.8000. We fail to reject the null!",
      action: () => {
        playSuccessFanfare();
        const pvalHUD = document.getElementById('fisher-pval-hud-box');
        pvalHUD.style.transform = 'scale(1.05)';
        setTimeout(() => pvalHUD.style.transform = 'none', 600);
      }
    }
  ];

  btnFisherStepNext.addEventListener('click', () => {
    if (currentFisherStep < fisherStepMax) {
      currentFisherStep++;
      updateFisherStepUI();
    }
  });

  btnFisherStepPrev.addEventListener('click', () => {
    if (currentFisherStep > 1) {
      currentFisherStep--;
      updateFisherStepUI();
    }
  });

  function updateFisherStepUI() {
    const step = fisherStepsData[currentFisherStep - 1];
    fisherStepTitle.textContent = step.title;
    fisherStepDesc.textContent = step.desc;
    fisherStepIndicator.textContent = `Step ${currentFisherStep} of ${fisherStepMax}`;

    btnFisherStepPrev.disabled = currentFisherStep === 1;
    btnFisherStepNext.disabled = currentFisherStep === fisherStepMax;

    step.action();
  }

  function highlightReferenceRow(rowId) {
    for (let i = 1; i <= 6; i++) {
      const row = document.getElementById(`ref-row-${i}`);
      if (row) {
        if (rowId === null) {
          row.style.outline = 'none';
        } else if (i === rowId) {
          row.style.outline = '2px solid var(--accent-primary)';
        } else {
          row.style.outline = 'none';
        }
      }
    }
  }


  // 2. Neyman Stepper
  let currentNeymanStep = 1;
  const neymanStepMax = 5;

  const btnNeymanStepPrev = document.getElementById('btn-neyman-step-prev');
  const btnNeymanStepNext = document.getElementById('btn-neyman-step-next');
  const neymanStepIndicator = document.getElementById('neyman-step-indicator');
  const neymanStepTitle = document.getElementById('neyman-step-title');
  const neymanStepDesc = document.getElementById('neyman-step-desc');

  const neymanStepsData = [
    {
      title: "Step 1: Calculate Sample Means",
      desc: "First, compute the average outcomes for the control group (Ȳ_C) and the treatment group (Ȳ_T). In our active teacher presence preset, these are 58% and 80% respectively.",
      action: () => {
        playCoinSound();
        const classroomHUD = document.getElementById('classroom-grid-title');
        classroomHUD.style.color = 'var(--accent-secondary)';
        setTimeout(() => classroomHUD.style.color = 'var(--accent-primary)', 800);
      }
    },
    {
      title: "Step 2: Calculate the Point Estimate (ATE)",
      desc: "Compute the difference between the sample averages: ATE = Ȳ_T - Ȳ_C. Under the Seva Mandir preset, camera incentives increased presence by 22.0 percentage points.",
      action: () => {
        playBlip(550, 0.1);
        const ateHUD = document.getElementById('neyman-val-ate').parentElement;
        ateHUD.style.borderColor = 'var(--accent-primary)';
        setTimeout(() => ateHUD.style.borderColor = 'var(--border-color)', 800);
      }
    },
    {
      title: "Step 3: Estimate Neyman's Conservative Variance",
      desc: "Compute Neyman's standard error: SE = √[ (s_T² / N_T) + (s_C² / N_C) ]. This variance is conservative (an overestimate) because the individual treatment covariance is unobservable.",
      action: () => {
        playBlip(600, 0.1);
        const seHUD = document.getElementById('neyman-val-se').parentElement;
        seHUD.style.borderColor = 'var(--accent-secondary)';
        setTimeout(() => seHUD.style.borderColor = 'var(--border-color)', 800);
      }
    },
    {
      title: "Step 4: Compute t-statistic & p-value",
      desc: "Find the t-statistic: t = ATE / SE = 7.76. With a t-statistic of 7.76, the probability that this difference occurred by random chance (p-value) is virtually zero (< 0.0001).",
      action: () => {
        playCoinSound();
        const pvalHUD = document.getElementById('neyman-val-pval').parentElement;
        pvalHUD.style.borderColor = 'var(--color-success)';
        setTimeout(() => pvalHUD.style.borderColor = 'var(--border-color)', 800);
      }
    },
    {
      title: "Step 5: Construct Confidence Interval",
      desc: "Using critical value z = 1.96 (for 95% confidence), construct the bounds: CI = [ATE - 1.96 × SE, ATE + 1.96 × SE]. Because the interval [+16.4%, +27.6%] does not cross zero, we reject the null hypothesis!",
      action: () => {
        playSuccessFanfare();
        const ciChart = document.getElementById('neyman-ci-svg');
        ciChart.style.opacity = '0.5';
        setTimeout(() => ciChart.style.opacity = '1', 400);
      }
    }
  ];

  btnNeymanStepNext.addEventListener('click', () => {
    if (currentNeymanStep < neymanStepMax) {
      currentNeymanStep++;
      updateNeymanStepUI();
    }
  });

  btnNeymanStepPrev.addEventListener('click', () => {
    if (currentNeymanStep > 1) {
      currentNeymanStep--;
      updateNeymanStepUI();
    }
  });

  function updateNeymanStepUI() {
    const step = neymanStepsData[currentNeymanStep - 1];
    neymanStepTitle.textContent = step.title;
    neymanStepDesc.textContent = step.desc;
    neymanStepIndicator.textContent = `Step ${currentNeymanStep} of ${neymanStepMax}`;

    btnNeymanStepPrev.disabled = currentNeymanStep === 1;
    btnNeymanStepNext.disabled = currentNeymanStep === neymanStepMax;

    step.action();
  }


  // =================================================================
  // INITIALIZATION
  // =================================================================
  renderFisherTable();
  resetFisherLab();
  
  // Set default preset for Teacher Presence AATE
  applyNeymanPreset(56, 58, 16, 57, 80, 14, '0.05');

});
