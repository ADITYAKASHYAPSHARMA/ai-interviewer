/**
 * J.A.R.V.I.S. Autonomous Interviewer — Frontend Application Controller
 * Handles UI state, Web Audio API visualizer & SFX synthesizer, Web Speech API (STT/TTS), and calibrated REST API integration.
 */

// Application State
const state = {
  currentView: 'setupView', // 'setupView' | 'interviewView' | 'scorecardView'
  sessionId: null,
  candidateName: 'Aditya Sharma',
  selectedRole: 'backend',
  selectedPersona: 'jarvis',
  seniority: 'Senior',
  totalQuestions: 5,
  currentQuestion: 1,
  isRecording: false,
  isVoiceEnabled: true,
  isSfxEnabled: true,
  timerInterval: null,
  timerSeconds: 0,
  rolesList: [],
  personasList: [],
  transcript: [], // Local transcript resilience buffer
  speechSynthesis: window.speechSynthesis || null,
  recognition: null,
  audioContext: null,
  audioAnalyser: null,
  audioStream: null,
  visualizerAnimId: null,
  lastEvaluation: null
};

// DOM Element References
const elements = {
  // Navigation
  brandHomeBtn: document.getElementById('brandHomeBtn'),
  providerStatusChip: document.getElementById('providerStatusChip'),
  providerStatusText: document.getElementById('providerStatusText'),
  sfxToggleBtn: document.getElementById('sfxToggleBtn'),
  sfxIcon: document.getElementById('sfxIcon'),
  sfxStateLabel: document.getElementById('sfxStateLabel'),
  voiceToggleBtn: document.getElementById('voiceToggleBtn'),
  voiceIcon: document.getElementById('voiceIcon'),
  voiceStateLabel: document.getElementById('voiceStateLabel'),
  headerEndBtn: document.getElementById('headerEndBtn'),

  // Views
  setupView: document.getElementById('setupView'),
  interviewView: document.getElementById('interviewView'),
  scorecardView: document.getElementById('scorecardView'),

  // Setup Form
  candidateNameInput: document.getElementById('candidateNameInput'),
  rolesGrid: document.getElementById('rolesGrid'),
  senioritySelect: document.getElementById('senioritySelect'),
  questionCountSelect: document.getElementById('questionCountSelect'),
  personasGrid: document.getElementById('personasGrid'),
  startInterviewBtn: document.getElementById('startInterviewBtn'),

  // Interview Stage
  avatarPulse: document.getElementById('avatarPulse'),
  voiceWavePill: document.getElementById('voiceWavePill'),
  stagePersonaName: document.getElementById('stagePersonaName'),
  stageRoleLabel: document.getElementById('stageRoleLabel'),
  interviewerStateText: document.getElementById('interviewerStateText'),
  interviewTimer: document.getElementById('interviewTimer'),
  questionProgressText: document.getElementById('questionProgressText'),
  stepProgressDots: document.getElementById('stepProgressDots'),
  getHintBtn: document.getElementById('getHintBtn'),
  finishEarlyBtn: document.getElementById('finishEarlyBtn'),
  conversationContainer: document.getElementById('conversationContainer'),
  messagesList: document.getElementById('messagesList'),
  interviewerTypingIndicator: document.getElementById('interviewerTypingIndicator'),

  // Answer Dock & Audio
  audioVisualizerBar: document.getElementById('audioVisualizerBar'),
  waveformCanvas: document.getElementById('waveformCanvas'),
  stopRecordingBtn: document.getElementById('stopRecordingBtn'),
  hintAlertBox: document.getElementById('hintAlertBox'),
  hintContentText: document.getElementById('hintContentText'),
  closeHintBtn: document.getElementById('closeHintBtn'),
  candidateAnswerInput: document.getElementById('candidateAnswerInput'),
  telemetryDepthBadge: document.getElementById('telemetryDepthBadge'),
  micBtn: document.getElementById('micBtn'),
  micIcon: document.getElementById('micIcon'),
  micLabel: document.getElementById('micLabel'),
  submitAnswerBtn: document.getElementById('submitAnswerBtn'),

  // Scorecard View
  scoreCandidateHeadline: document.getElementById('scoreCandidateHeadline'),
  scoreExecutiveSummary: document.getElementById('scoreExecutiveSummary'),
  overallScoreNum: document.getElementById('overallScoreNum'),
  hiringVerdictBadge: document.getElementById('hiringVerdictBadge'),
  pillarTechnical: document.getElementById('pillarTechnical'),
  fillTechnical: document.getElementById('fillTechnical'),
  pillarProblemSolving: document.getElementById('pillarProblemSolving'),
  fillProblemSolving: document.getElementById('fillProblemSolving'),
  pillarCommunication: document.getElementById('pillarCommunication'),
  fillCommunication: document.getElementById('fillCommunication'),
  pillarSystematic: document.getElementById('pillarSystematic'),
  fillSystematic: document.getElementById('fillSystematic'),
  strengthsList: document.getElementById('strengthsList'),
  improvementsList: document.getElementById('improvementsList'),
  questionsAccordion: document.getElementById('questionsAccordion'),
  retakeInterviewBtn: document.getElementById('retakeInterviewBtn'),
  exportReportBtn: document.getElementById('exportReportBtn'),
  printReportBtn: document.getElementById('printReportBtn'),

  // Toast
  toastNotification: document.getElementById('toastNotification'),
  toastMsg: document.getElementById('toastMsg'),
  toastIcon: document.getElementById('toastIcon')
};

// ==========================================================================
// HIGH-TECH AUDIO SFX SYNTHESIZER (WEB AUDIO API)
// ==========================================================================
function playJarvisSound(type) {
  if (!state.isSfxEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'init') {
      // High-tech power-up sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'send') {
      // Crisp digital blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'receive') {
      // Two-tone cyber chime
      [0, 0.09].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 523.25 : 783.99, now + delay);
        gain.gain.setValueAtTime(0.06, now + delay);
        gain.gain.linearRampToValueAtTime(0.001, now + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } else if (type === 'click') {
      // Micro click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    }
  } catch (e) {
    // Audio context may be restricted by autoplay policy
  }
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupSpeechRecognition();
  bindEvents();
  await loadMetadataAndHealth();
});

// Load backend info, roles, and personas
async function loadMetadataAndHealth() {
  try {
    const [healthRes, rolesRes, personasRes] = await Promise.all([
      fetch('/api/health').then(r => r.json()).catch(() => ({ active_provider: 'J.A.R.V.I.S. Calibrated Engine' })),
      fetch('/api/roles').then(r => r.json()).catch(() => ({ roles: [] })),
      fetch('/api/personas').then(r => r.json()).catch(() => ({ personas: [] }))
    ]);

    if (healthRes.active_provider) {
      elements.providerStatusText.textContent = `SYSTEM ONLINE // ${healthRes.active_provider.toUpperCase()}`;
    }

    state.rolesList = rolesRes.roles || [];
    state.personasList = personasRes.personas || [];

    renderRoles();
    renderPersonas();
  } catch (err) {
    console.error('Error initializing telemetry:', err);
    elements.providerStatusText.textContent = 'J.A.R.V.I.S. CALIBRATED ENGINE ONLINE';
  }
}

// ==========================================================================
// SETUP VIEW RENDERING
// ==========================================================================
function renderRoles() {
  elements.rolesGrid.innerHTML = '';
  state.rolesList.forEach(role => {
    const tile = document.createElement('div');
    tile.className = `role-tile ${role.id === state.selectedRole ? 'selected' : ''}`;
    tile.dataset.roleId = role.id;
    tile.innerHTML = `
      <div class="role-icon">${role.icon || '⚡'}</div>
      <div class="role-meta">
        <div class="role-meta-title">${escapeHtml(role.title)}</div>
        <div class="role-meta-desc">${escapeHtml(role.description)}</div>
      </div>
    `;
    tile.addEventListener('click', () => {
      playJarvisSound('click');
      document.querySelectorAll('.role-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      state.selectedRole = role.id;
    });
    elements.rolesGrid.appendChild(tile);
  });
}

function renderPersonas() {
  elements.personasGrid.innerHTML = '';
  state.personasList.forEach(persona => {
    const tile = document.createElement('div');
    tile.className = `persona-tile ${persona.id === state.selectedPersona ? 'selected' : ''}`;
    tile.dataset.personaId = persona.id;
    tile.innerHTML = `
      <div class="persona-name">${escapeHtml(persona.name)}</div>
      <div class="persona-tagline">${escapeHtml(persona.tagline)}</div>
    `;
    tile.addEventListener('click', () => {
      playJarvisSound('click');
      document.querySelectorAll('.persona-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      state.selectedPersona = persona.id;
    });
    elements.personasGrid.appendChild(tile);
  });
}

// ==========================================================================
// EVENT HANDLERS
// ==========================================================================
function bindEvents() {
  // Brand Logo home click
  elements.brandHomeBtn.addEventListener('click', () => {
    playJarvisSound('click');
    if (state.currentView !== 'setupView') {
      switchView('setupView');
      elements.headerEndBtn.classList.add('hidden');
    }
  });

  // SFX Toggle
  elements.sfxToggleBtn.addEventListener('click', () => {
    state.isSfxEnabled = !state.isSfxEnabled;
    elements.sfxStateLabel.textContent = state.isSfxEnabled ? 'ON' : 'OFF';
    elements.sfxIcon.textContent = state.isSfxEnabled ? '🔊' : '🔇';
    playJarvisSound('click');
    showToast(`High-tech audio SFX ${state.isSfxEnabled ? 'enabled' : 'disabled'}`);
  });

  // Voice Toggle
  elements.voiceToggleBtn.addEventListener('click', () => {
    state.isVoiceEnabled = !state.isVoiceEnabled;
    elements.voiceStateLabel.textContent = state.isVoiceEnabled ? 'ON' : 'OFF';
    elements.voiceIcon.textContent = state.isVoiceEnabled ? '🎙️' : '🔇';
    playJarvisSound('click');
    if (!state.isVoiceEnabled && state.speechSynthesis) {
      state.speechSynthesis.cancel();
      stopAvatarSpeakingAnimation();
    }
    showToast(`Voice synthesis ${state.isVoiceEnabled ? 'enabled' : 'disabled'}`);
  });

  // Start Interview
  elements.startInterviewBtn.addEventListener('click', startInterview);

  // Submit Answer (Button & Cmd+Enter)
  elements.submitAnswerBtn.addEventListener('click', submitCandidateAnswer);
  elements.candidateAnswerInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitCandidateAnswer();
    }
  });

  // Live depth meter updater
  elements.candidateAnswerInput.addEventListener('input', updateInputDepthTelemetry);

  // Microphone toggle
  elements.micBtn.addEventListener('click', toggleMicrophone);
  elements.stopRecordingBtn.addEventListener('click', () => {
    if (state.isRecording) {
      toggleMicrophone();
    }
  });

  // Hint button
  elements.getHintBtn.addEventListener('click', requestHint);
  elements.closeHintBtn.addEventListener('click', () => {
    elements.hintAlertBox.classList.add('hidden');
  });

  // Finish Early
  elements.finishEarlyBtn.addEventListener('click', finishInterviewAndEvaluate);
  elements.headerEndBtn.addEventListener('click', finishInterviewAndEvaluate);

  // Scorecard Actions
  elements.retakeInterviewBtn.addEventListener('click', () => {
    playJarvisSound('click');
    switchView('setupView');
    elements.headerEndBtn.classList.add('hidden');
  });

  elements.exportReportBtn.addEventListener('click', exportReportJSON);
  elements.printReportBtn.addEventListener('click', () => window.print());
}

function updateInputDepthTelemetry() {
  const text = elements.candidateAnswerInput.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const badge = elements.telemetryDepthBadge;

  badge.className = 'telemetry-depth-badge';
  if (words === 0) {
    badge.textContent = 'DEPTH: 0 WORDS';
  } else if (words < 15) {
    badge.classList.add('warning');
    badge.textContent = `DEPTH: ${words} WORDS // INSUFFICIENT ARCHITECTURE (PENALTY RISK)`;
  } else if (words < 45) {
    badge.textContent = `DEPTH: ${words} WORDS // MODERATE DEPTH`;
  } else {
    badge.classList.add('good');
    badge.textContent = `DEPTH: ${words} WORDS // COMPREHENSIVE ARCHITECTURAL SUBSTANCE`;
  }
}

// ==========================================================================
// VIEW SWITCHING
// ==========================================================================
function switchView(viewId) {
  state.currentView = viewId;
  [elements.setupView, elements.interviewView, elements.scorecardView].forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });

  const activeView = elements[viewId];
  if (activeView) {
    activeView.classList.remove('hidden');
    activeView.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// INTERVIEW FLOW LOGIC
// ==========================================================================
async function startInterview() {
  playJarvisSound('init');
  const name = elements.candidateNameInput.value.trim() || 'Candidate';
  state.candidateName = name;
  state.seniority = elements.senioritySelect.value;
  state.totalQuestions = parseInt(elements.questionCountSelect.value, 10);

  const selectedRoleObj = state.rolesList.find(r => r.id === state.selectedRole) || { title: 'Full-Stack Engineer' };
  const selectedPersonaObj = state.personasList.find(p => p.id === state.selectedPersona) || { name: 'J.A.R.V.I.S. Protocol' };

  // Set Stage Headers
  elements.stagePersonaName.textContent = selectedPersonaObj.name;
  elements.stageRoleLabel.textContent = `${state.seniority} ${selectedRoleObj.title} Track`;
  elements.headerEndBtn.classList.remove('hidden');

  // Clear buffers
  state.transcript = [];

  // Switch to interview view
  switchView('interviewView');
  elements.messagesList.innerHTML = '';
  elements.interviewerTypingIndicator.classList.remove('hidden');
  setInterviewerState('CALIBRATING DIAGNOSTICS...', true);

  // Initialize Progress Dots
  renderProgressDots(1, state.totalQuestions);
  startTimer();

  try {
    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_name: name,
        role: selectedRoleObj.title,
        level: state.seniority,
        persona: selectedPersonaObj.name,
        total_questions: state.totalQuestions
      })
    });

    const data = await res.json();
    elements.interviewerTypingIndicator.classList.add('hidden');

    if (data.success) {
      state.sessionId = data.session.id;
      state.currentQuestion = 1;
      updateProgressText(1, state.totalQuestions);

      // Append to UI and local transcript
      appendMessage('interviewer', data.interviewer_message, 1);
      state.transcript.push({
        role: 'interviewer',
        content: data.interviewer_message,
        question_index: 1
      });

      playJarvisSound('receive');
      speakText(data.interviewer_message);
      setInterviewerState('SYSTEM LISTENING', false);
    } else {
      showToast('Error initializing assessment protocol', 'error');
    }
  } catch (err) {
    elements.interviewerTypingIndicator.classList.add('hidden');
    console.error('Failed to start interview:', err);
    showToast('Failed to establish backend neural link', 'error');
  }
}

async function submitCandidateAnswer() {
  const answer = elements.candidateAnswerInput.value.trim();
  if (!answer) {
    playJarvisSound('click');
    showToast('Formulate your technical answer or transmit audio first', 'warning');
    return;
  }

  playJarvisSound('send');

  // Stop recording if active
  if (state.isRecording) {
    toggleMicrophone();
  }

  // Append user message & log to transcript
  appendMessage('candidate', answer, state.currentQuestion);
  state.transcript.push({
    role: 'candidate',
    content: answer,
    question_index: state.currentQuestion
  });

  elements.candidateAnswerInput.value = '';
  updateInputDepthTelemetry();
  elements.hintAlertBox.classList.add('hidden');

  // Show typing indicator
  elements.interviewerTypingIndicator.classList.remove('hidden');
  setInterviewerState('CALIBRATING ACCURACY & DEPTH...', true);
  scrollConversationToBottom();

  try {
    const res = await fetch('/api/interview/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: state.sessionId,
        answer: answer
      })
    });

    const data = await res.json();
    elements.interviewerTypingIndicator.classList.add('hidden');

    if (data.success) {
      state.currentQuestion = data.current_question;
      updateProgressText(data.current_question, data.total_questions);
      renderProgressDots(data.current_question, data.total_questions);
      
      appendMessage('interviewer', data.interviewer_message, data.current_question);
      state.transcript.push({
        role: 'interviewer',
        content: data.interviewer_message,
        question_index: data.current_question
      });

      playJarvisSound('receive');
      speakText(data.interviewer_message);

      if (data.is_completed) {
        setInterviewerState('ASSESSMENT CONCLUDED', false);
        setTimeout(() => finishInterviewAndEvaluate(), 3500);
      } else {
        setInterviewerState('SYSTEM LISTENING', false);
      }
    } else {
      showToast('Error transmitting response', 'error');
    }
  } catch (err) {
    elements.interviewerTypingIndicator.classList.add('hidden');
    console.error('Error in respond:', err);
    showToast('Failed to transmit response', 'error');
  }
}

async function requestHint() {
  if (!state.sessionId) return;
  playJarvisSound('click');
  elements.getHintBtn.disabled = true;
  elements.getHintBtn.textContent = 'Analyzing Context...';

  try {
    const res = await fetch('/api/interview/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: state.sessionId })
    });
    const data = await res.json();
    if (data.success && data.hint) {
      elements.hintContentText.textContent = data.hint;
      elements.hintAlertBox.classList.remove('hidden');
      playJarvisSound('receive');
      showToast('Tactical hint generated', 'info');
    }
  } catch (err) {
    console.error('Error getting hint:', err);
  } finally {
    elements.getHintBtn.disabled = false;
    elements.getHintBtn.textContent = '💡 Request Tactical Hint';
  }
}

async function finishInterviewAndEvaluate() {
  if (!state.sessionId) return;
  playJarvisSound('click');
  stopTimer();
  if (state.speechSynthesis) state.speechSynthesis.cancel();
  stopAvatarSpeakingAnimation();

  showToast('Synthesizing Calibrated Evaluation Dossier...', 'info');

  const selectedRoleObj = state.rolesList.find(r => r.id === state.selectedRole) || { title: 'Engineer' };
  const selectedPersonaObj = state.personasList.find(p => p.id === state.selectedPersona) || { name: 'J.A.R.V.I.S. Protocol' };

  try {
    const res = await fetch('/api/interview/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: state.sessionId,
        candidate_name: state.candidateName,
        role: selectedRoleObj.title,
        level: state.seniority,
        persona: selectedPersonaObj.name,
        history: state.transcript
      })
    });

    const data = await res.json();
    if (data.success && data.evaluation) {
      state.lastEvaluation = data.evaluation;
      renderScorecard(data);
      switchView('scorecardView');
      playJarvisSound('init');
    } else {
      showToast('Failed to finalize evaluation dossier', 'error');
    }
  } catch (err) {
    console.error('Error finishing interview:', err);
    showToast('Evaluation calculation error', 'error');
  }
}

// ==========================================================================
// SCORECARD RENDERING (STRICT CALIBRATION — ZERO FALSY DEFAULT BUGS)
// ==========================================================================
function renderScorecard(data) {
  const evalData = data.evaluation;
  elements.scoreCandidateHeadline.textContent = `${data.candidate_name || state.candidateName} — ${data.role}`;
  elements.scoreExecutiveSummary.textContent = evalData.summary || 'Assessment evaluation compiled.';

  // Overall Score — STRICT: Never default 0 to 80!
  const score = evalData.overall_score !== undefined ? evalData.overall_score : 0;
  elements.overallScoreNum.textContent = score;

  // Verdict — Calibrated strictly
  const rawVerdict = evalData.verdict || (score >= 80 ? 'Hire' : (score >= 65 ? 'Leaning Hire' : 'No Hire'));
  elements.hiringVerdictBadge.textContent = rawVerdict.toUpperCase();
  elements.hiringVerdictBadge.className = 'verdict-badge';

  const vLower = rawVerdict.toLowerCase();
  if (vLower.includes('strong hire')) {
    elements.hiringVerdictBadge.classList.add('verdict-strong-hire');
  } else if (vLower.includes('hire') && !vLower.includes('no hire') && !vLower.includes('leaning no')) {
    elements.hiringVerdictBadge.classList.add('verdict-hire');
  } else if (vLower.includes('leaning hire')) {
    elements.hiringVerdictBadge.classList.add('verdict-leaning');
  } else {
    elements.hiringVerdictBadge.classList.add('verdict-nohire');
  }

  // 4 Pillar Skills — STRICT: Never default 0 to 80!
  const metrics = evalData.metrics || {};
  setMetricBar(elements.pillarTechnical, elements.fillTechnical, metrics.technical_competence !== undefined ? metrics.technical_competence : 0);
  setMetricBar(elements.pillarProblemSolving, elements.fillProblemSolving, metrics.problem_solving !== undefined ? metrics.problem_solving : 0);
  setMetricBar(elements.pillarCommunication, elements.fillCommunication, metrics.communication_clarity !== undefined ? metrics.communication_clarity : 0);
  setMetricBar(elements.pillarSystematic, elements.fillSystematic, metrics.systematic_thinking !== undefined ? metrics.systematic_thinking : 0);

  // Strengths
  elements.strengthsList.innerHTML = '';
  const strengths = evalData.strengths && evalData.strengths.length > 0 ? evalData.strengths : ['No notable strengths demonstrated.'];
  strengths.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    elements.strengthsList.appendChild(li);
  });

  // Areas for Improvement
  elements.improvementsList.innerHTML = '';
  const improvements = evalData.areas_for_improvement && evalData.areas_for_improvement.length > 0 ? evalData.areas_for_improvement : ['Formulate concrete architectures with scalable trade-offs.'];
  improvements.forEach(imp => {
    const li = document.createElement('li');
    li.textContent = imp;
    elements.improvementsList.appendChild(li);
  });

  // Question Breakdown Accordion
  elements.questionsAccordion.innerHTML = '';
  (evalData.question_breakdown || []).forEach((q, idx) => {
    const qScore = q.score !== undefined ? q.score : 0;
    const isFail = qScore < 45;

    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <div class="accordion-summary">
        <div class="accordion-title-wrap">
          <span class="q-badge">ROUND ${q.question_number || (idx + 1)}</span>
          <span class="q-topic">${escapeHtml(q.question_topic || `Assessment Part ${idx + 1}`)}</span>
        </div>
        <span class="accordion-score ${isFail ? 'fail' : ''}">${qScore}/100</span>
      </div>
      <div class="accordion-body">
        <div class="qa-box">
          <div class="qa-label candidate">Submitted Candidate Response</div>
          <div class="qa-text">${escapeHtml(q.candidate_answer_summary || 'No answer recorded.')}</div>
        </div>
        <div class="qa-box">
          <div class="qa-label feedback">J.A.R.V.I.S. Critique & Scoring Rationale</div>
          <div class="qa-text">${escapeHtml(q.feedback || 'Zero technical substance demonstrated.')}</div>
        </div>
        <div class="qa-box">
          <div class="qa-label ideal">Architectural Benchmark Outline</div>
          <div class="qa-text">${escapeHtml(q.ideal_answer_outline || 'Define requirements -> Propose architecture -> Address bottlenecks -> Observability & failure modes.')}</div>
        </div>
      </div>
    `;

    item.querySelector('.accordion-summary').addEventListener('click', () => {
      playJarvisSound('click');
      const body = item.querySelector('.accordion-body');
      body.classList.toggle('hidden');
    });

    elements.questionsAccordion.appendChild(item);
  });
}

function setMetricBar(labelEl, fillEl, val) {
  const clamped = Math.max(0, Math.min(100, Math.round(val)));
  labelEl.textContent = `${clamped}%`;
  fillEl.style.width = `${clamped}%`;
}

function exportReportJSON() {
  if (!state.lastEvaluation) {
    showToast('No dossier data to export', 'warning');
    return;
  }
  const blob = new Blob([JSON.stringify(state.lastEvaluation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jarvis-assessment-dossier-${state.sessionId || 'report'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Evaluation dossier downloaded', 'info');
}

// ==========================================================================
// AUDIO & SPEECH UTILITIES (STT & TTS)
// ==========================================================================
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.micBtn.title = 'Speech Recognition not supported in this browser';
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = true;
  state.recognition.interimResults = true;
  state.recognition.lang = 'en-US';

  state.recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    elements.candidateAnswerInput.value = transcript;
    updateInputDepthTelemetry();
  };

  state.recognition.onerror = (event) => {
    console.warn('Speech recognition warning:', event.error);
    if (state.isRecording) toggleMicrophone();
  };

  state.recognition.onend = () => {
    if (state.isRecording) {
      try {
        state.recognition.start();
      } catch (e) {}
    }
  };
}

async function toggleMicrophone() {
  state.isRecording = !state.isRecording;
  playJarvisSound('click');

  if (state.isRecording) {
    elements.micBtn.classList.add('recording');
    elements.micLabel.textContent = 'Listening...';
    elements.audioVisualizerBar.classList.remove('hidden');

    try {
      if (state.recognition) {
        state.recognition.start();
      }
      await startAudioVisualizer();
    } catch (err) {
      console.warn('Audio start error:', err);
    }
  } else {
    elements.micBtn.classList.remove('recording');
    elements.micLabel.textContent = 'Speak';
    elements.audioVisualizerBar.classList.add('hidden');

    if (state.recognition) {
      state.recognition.stop();
    }
    stopAudioVisualizer();
  }
}

async function startAudioVisualizer() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioStream = stream;
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.audioContext.createMediaStreamSource(stream);
    state.audioAnalyser = state.audioContext.createAnalyser();
    state.audioAnalyser.fftSize = 64;
    source.connect(state.audioAnalyser);

    drawWaveform();
  } catch (err) {
    drawMockWaveform();
  }
}

function drawWaveform() {
  if (!state.isRecording) return;
  const canvas = elements.waveformCanvas;
  const ctx = canvas.getContext('2d');
  const bufferLength = state.audioAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    if (!state.isRecording) return;
    state.visualizerAnimId = requestAnimationFrame(draw);
    state.audioAnalyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 2;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
      x += barWidth;
    }
  };
  draw();
}

function drawMockWaveform() {
  const canvas = elements.waveformCanvas;
  const ctx = canvas.getContext('2d');
  let step = 0;

  const draw = () => {
    if (!state.isRecording) return;
    state.visualizerAnimId = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00f5ff';

    for (let i = 0; i < 20; i++) {
      const h = Math.abs(Math.sin(step + i * 0.4)) * 26 + 4;
      ctx.fillRect(i * 20, (canvas.height - h) / 2, 12, h);
    }
    step += 0.15;
  };
  draw();
}

function stopAudioVisualizer() {
  if (state.visualizerAnimId) cancelAnimationFrame(state.visualizerAnimId);
  if (state.audioStream) {
    state.audioStream.getTracks().forEach(track => track.stop());
    state.audioStream = null;
  }
  if (state.audioContext && state.audioContext.state !== 'closed') {
    state.audioContext.close();
  }
}

function speakText(text) {
  if (!state.isVoiceEnabled || !state.speechSynthesis) return;

  state.speechSynthesis.cancel();
  const cleanText = text.replace(/[*#`_\[\]]/g, '').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.02;
  utterance.pitch = 0.98;

  utterance.onstart = () => startAvatarSpeakingAnimation();
  utterance.onend = () => stopAvatarSpeakingAnimation();
  utterance.onerror = () => stopAvatarSpeakingAnimation();

  state.speechSynthesis.speak(utterance);
}

function startAvatarSpeakingAnimation() {
  elements.avatarPulse.classList.add('speaking');
  elements.voiceWavePill.classList.add('speaking');
}

function stopAvatarSpeakingAnimation() {
  elements.avatarPulse.classList.remove('speaking');
  elements.voiceWavePill.classList.remove('speaking');
}

// ==========================================================================
// CONVERSATION & UI HELPERS
// ==========================================================================
function appendMessage(role, content, qIndex) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  const senderLabel = role === 'interviewer' ? `J.A.R.V.I.S. // ROUND ${qIndex}` : `${state.candidateName}`;

  bubble.innerHTML = `
    <div class="bubble-sender">
      <span>${senderLabel}</span>
      <span style="opacity: 0.65; font-size: 0.72rem; font-family: var(--font-mono);">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
    <div class="bubble-content">${formatMarkdown(content)}</div>
  `;

  elements.messagesList.appendChild(bubble);
  scrollConversationToBottom();
}

function formatMarkdown(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
  formatted = formatted.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  return formatted;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function scrollConversationToBottom() {
  setTimeout(() => {
    elements.conversationContainer.scrollTop = elements.conversationContainer.scrollHeight;
  }, 50);
}

function setInterviewerState(text, isBusy) {
  elements.interviewerStateText.textContent = text;
  elements.interviewerStateText.style.color = isBusy ? 'var(--accent-cyan)' : 'var(--text-secondary)';
}

function updateProgressText(current, total) {
  elements.questionProgressText.textContent = `${current} of ${total}`;
}

function renderProgressDots(current, total) {
  elements.stepProgressDots.innerHTML = '';
  for (let i = 1; i <= total; i++) {
    const dot = document.createElement('div');
    dot.className = 'step-dot font-mono';
    if (i === current) dot.classList.add('active');
    else if (i < current) dot.classList.add('done');
    dot.textContent = `R${i}`;
    elements.stepProgressDots.appendChild(dot);
  }
}

function startTimer() {
  state.timerSeconds = 0;
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    const mins = String(Math.floor(state.timerSeconds / 60)).padStart(2, '0');
    const secs = String(state.timerSeconds % 60).padStart(2, '0');
    elements.interviewTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

function showToast(message, type = 'info') {
  const icons = { info: '⚡', warning: '⚠️', error: '❌', success: '✅' };
  elements.toastIcon.textContent = icons[type] || '⚡';
  elements.toastMsg.textContent = message;
  elements.toastNotification.classList.remove('hidden');

  setTimeout(() => {
    elements.toastNotification.classList.add('hidden');
  }, 3500);
}
