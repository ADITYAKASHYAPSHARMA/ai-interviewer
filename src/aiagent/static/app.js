/**
 * Aegis AI Interviewer — Frontend Application Controller
 * Handles UI state, Web Audio API visualizer, Web Speech API (STT/TTS), and REST API integration.
 */

// Application State
const state = {
  currentView: 'setupView', // 'setupView' | 'interviewView' | 'scorecardView'
  sessionId: null,
  candidateName: 'Aditya Sharma',
  selectedRole: 'fullstack',
  selectedPersona: 'faang',
  seniority: 'Senior',
  totalQuestions: 5,
  currentQuestion: 1,
  isRecording: false,
  isVoiceEnabled: true,
  timerInterval: null,
  timerSeconds: 0,
  rolesList: [],
  personasList: [],
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
  providerStatusChip: document.getElementById('providerStatusChip'),
  providerStatusText: document.getElementById('providerStatusText'),
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
      fetch('/api/health').then(r => r.json()).catch(() => ({ active_provider: 'Offline Engine' })),
      fetch('/api/roles').then(r => r.json()).catch(() => ({ roles: [] })),
      fetch('/api/personas').then(r => r.json()).catch(() => ({ personas: [] }))
    ]);

    if (healthRes.active_provider) {
      elements.providerStatusText.textContent = `Provider: ${healthRes.active_provider}`;
    }

    state.rolesList = rolesRes.roles || [];
    state.personasList = personasRes.personas || [];

    renderRoles();
    renderPersonas();
  } catch (err) {
    console.error('Error initializing metadata:', err);
    elements.providerStatusText.textContent = 'Agent Ready (Local)';
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
      <div class="role-icon">${role.icon || '💼'}</div>
      <div class="role-meta">
        <div class="role-meta-title">${escapeHtml(role.title)}</div>
        <div class="role-meta-desc">${escapeHtml(role.description)}</div>
      </div>
    `;
    tile.addEventListener('click', () => {
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
      <div class="persona-title-row">
        <span class="persona-name">${escapeHtml(persona.name)}</span>
      </div>
      <div class="persona-tagline">${escapeHtml(persona.tagline)}</div>
    `;
    tile.addEventListener('click', () => {
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
  // Voice Toggle
  elements.voiceToggleBtn.addEventListener('click', () => {
    state.isVoiceEnabled = !state.isVoiceEnabled;
    elements.voiceStateLabel.textContent = state.isVoiceEnabled ? 'ON' : 'OFF';
    elements.voiceIcon.textContent = state.isVoiceEnabled ? '🔊' : '🔇';
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
    switchView('setupView');
    elements.headerEndBtn.classList.add('hidden');
  });

  elements.exportReportBtn.addEventListener('click', exportReportJSON);
  elements.printReportBtn.addEventListener('click', () => window.print());
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
  const name = elements.candidateNameInput.value.trim() || 'Candidate';
  state.candidateName = name;
  state.seniority = elements.senioritySelect.value;
  state.totalQuestions = parseInt(elements.questionCountSelect.value, 10);

  const selectedRoleObj = state.rolesList.find(r => r.id === state.selectedRole) || { title: 'Full-Stack Engineer' };
  const selectedPersonaObj = state.personasList.find(p => p.id === state.selectedPersona) || { name: 'FAANG Bar Raiser' };

  // Set Stage Headers
  elements.stagePersonaName.textContent = selectedPersonaObj.name;
  elements.stageRoleLabel.textContent = `${state.seniority} ${selectedRoleObj.title} Track`;
  elements.headerEndBtn.classList.remove('hidden');

  // Switch to interview view
  switchView('interviewView');
  elements.messagesList.innerHTML = '';
  elements.interviewerTypingIndicator.classList.remove('hidden');
  setInterviewerState('Preparing question...', true);

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
      appendMessage('interviewer', data.interviewer_message, 1);
      speakText(data.interviewer_message);
      setInterviewerState('Listening to candidate', false);
    } else {
      showToast('Error initializing interview', 'error');
    }
  } catch (err) {
    elements.interviewerTypingIndicator.classList.add('hidden');
    console.error('Failed to start interview:', err);
    showToast('Failed to connect to backend', 'error');
  }
}

async function submitCandidateAnswer() {
  const answer = elements.candidateAnswerInput.value.trim();
  if (!answer) {
    showToast('Please enter or speak your answer first', 'warning');
    return;
  }

  // Stop recording if active
  if (state.isRecording) {
    toggleMicrophone();
  }

  // Append user message
  appendMessage('candidate', answer, state.currentQuestion);
  elements.candidateAnswerInput.value = '';
  elements.hintAlertBox.classList.add('hidden');

  // Show typing indicator
  elements.interviewerTypingIndicator.classList.remove('hidden');
  setInterviewerState('Analyzing response...', true);
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
      speakText(data.interviewer_message);

      if (data.is_completed) {
        setInterviewerState('Interview Concluded', false);
        setTimeout(() => finishInterviewAndEvaluate(), 3500);
      } else {
        setInterviewerState('Listening to candidate', false);
      }
    } else {
      showToast('Error submitting response', 'error');
    }
  } catch (err) {
    elements.interviewerTypingIndicator.classList.add('hidden');
    console.error('Error in respond:', err);
    showToast('Failed to submit response', 'error');
  }
}

async function requestHint() {
  if (!state.sessionId) return;
  elements.getHintBtn.disabled = true;
  elements.getHintBtn.textContent = 'Fetching Hint...';

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
      showToast('Hint generated', 'info');
    }
  } catch (err) {
    console.error('Error getting hint:', err);
  } finally {
    elements.getHintBtn.disabled = false;
    elements.getHintBtn.textContent = '💡 Request Hint';
  }
}

async function finishInterviewAndEvaluate() {
  if (!state.sessionId) return;
  stopTimer();
  if (state.speechSynthesis) state.speechSynthesis.cancel();
  stopAvatarSpeakingAnimation();

  showToast('Generating official evaluation scorecard...', 'info');

  try {
    const res = await fetch('/api/interview/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: state.sessionId })
    });

    const data = await res.json();
    if (data.success && data.evaluation) {
      state.lastEvaluation = data.evaluation;
      renderScorecard(data);
      switchView('scorecardView');
    } else {
      showToast('Failed to generate scorecard', 'error');
    }
  } catch (err) {
    console.error('Error finishing interview:', err);
    showToast('Evaluation error', 'error');
  }
}

// ==========================================================================
// SCORECARD RENDERING
// ==========================================================================
function renderScorecard(data) {
  const evalData = data.evaluation;
  elements.scoreCandidateHeadline.textContent = `${data.candidate_name || state.candidateName} — ${data.role}`;
  elements.scoreExecutiveSummary.textContent = evalData.summary || 'Demonstrated technical competence and communication.';

  // Overall Score & Verdict
  const score = evalData.overall_score || 80;
  elements.overallScoreNum.textContent = score;

  const verdict = evalData.verdict || 'Hire';
  elements.hiringVerdictBadge.textContent = verdict;
  elements.hiringVerdictBadge.className = 'verdict-badge';
  if (verdict.toLowerCase().includes('strong hire') || verdict.toLowerCase() === 'hire') {
    elements.hiringVerdictBadge.classList.add('verdict-hire');
  } else if (verdict.toLowerCase().includes('leaning')) {
    elements.hiringVerdictBadge.classList.add('verdict-leaning');
  } else {
    elements.hiringVerdictBadge.classList.add('verdict-nohire');
  }

  // 4 Pillar Skills
  const metrics = evalData.metrics || {};
  setMetricBar(elements.pillarTechnical, elements.fillTechnical, metrics.technical_competence || 80);
  setMetricBar(elements.pillarProblemSolving, elements.fillProblemSolving, metrics.problem_solving || 80);
  setMetricBar(elements.pillarCommunication, elements.fillCommunication, metrics.communication_clarity || 85);
  setMetricBar(elements.pillarSystematic, elements.fillSystematic, metrics.systematic_thinking || 80);

  // Strengths
  elements.strengthsList.innerHTML = '';
  (evalData.strengths || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    elements.strengthsList.appendChild(li);
  });

  // Areas for Improvement
  elements.improvementsList.innerHTML = '';
  (evalData.areas_for_improvement || []).forEach(imp => {
    const li = document.createElement('li');
    li.textContent = imp;
    elements.improvementsList.appendChild(li);
  });

  // Question Breakdown Accordion
  elements.questionsAccordion.innerHTML = '';
  (evalData.question_breakdown || []).forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <div class="accordion-summary">
        <div class="accordion-title-wrap">
          <span class="q-badge">Q${q.question_number || (idx + 1)}</span>
          <span class="q-topic">${escapeHtml(q.question_topic || `Assessment Round ${idx + 1}`)}</span>
        </div>
        <span class="accordion-score">${q.score || 85}/100</span>
      </div>
      <div class="accordion-body">
        <div class="qa-box">
          <div class="qa-label candidate">Candidate Answer Summary</div>
          <div class="qa-text">${escapeHtml(q.candidate_answer_summary || 'Answer provided.')}</div>
        </div>
        <div class="qa-box">
          <div class="qa-label feedback">Interviewer Feedback</div>
          <div class="qa-text">${escapeHtml(q.feedback || 'Good depth and clarity.')}</div>
        </div>
        <div class="qa-box">
          <div class="qa-label ideal">Ideal Model Outline</div>
          <div class="qa-text">${escapeHtml(q.ideal_answer_outline || 'Structured approach covering requirements, trade-offs, and edge cases.')}</div>
        </div>
      </div>
    `;

    item.querySelector('.accordion-summary').addEventListener('click', () => {
      const body = item.querySelector('.accordion-body');
      body.classList.toggle('hidden');
    });

    elements.questionsAccordion.appendChild(item);
  });
}

function setMetricBar(labelEl, fillEl, val) {
  const clamped = Math.max(0, Math.min(100, val));
  labelEl.textContent = `${clamped}%`;
  fillEl.style.width = `${clamped}%`;
}

function exportReportJSON() {
  if (!state.lastEvaluation) {
    showToast('No evaluation data to export', 'warning');
    return;
  }
  const blob = new Blob([JSON.stringify(state.lastEvaluation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-scorecard-${state.sessionId || 'report'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Evaluation report downloaded', 'info');
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
  };

  state.recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (state.isRecording) toggleMicrophone();
  };

  state.recognition.onend = () => {
    if (state.isRecording) {
      state.recognition.start();
    }
  };
}

async function toggleMicrophone() {
  state.isRecording = !state.isRecording;

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
    // Canvas fallback wave if mic hardware permission is blocked
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
      ctx.fillStyle = '#f43f5e';
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
    ctx.fillStyle = '#f43f5e';

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
  // Strip markdown formatting for cleaner speech
  const cleanText = text.replace(/[*#`_\[\]]/g, '').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

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
  const senderLabel = role === 'interviewer' ? `AI Interviewer — Q${qIndex}` : `${state.candidateName}`;

  bubble.innerHTML = `
    <div class="bubble-sender">
      <span>${senderLabel}</span>
      <span style="opacity: 0.6; font-size: 0.7rem;">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
    <div class="bubble-content">${formatMarkdown(content)}</div>
  `;

  elements.messagesList.appendChild(bubble);
  scrollConversationToBottom();
}

function formatMarkdown(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);
  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Inline Code
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
  // Newlines to paragraphs
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
    dot.className = 'step-dot';
    if (i === current) dot.classList.add('active');
    else if (i < current) dot.classList.add('done');
    dot.textContent = `Q${i}`;
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
  const icons = { info: 'ℹ️', warning: '⚠️', error: '❌', success: '✅' };
  elements.toastIcon.textContent = icons[type] || 'ℹ️';
  elements.toastMsg.textContent = message;
  elements.toastNotification.classList.remove('hidden');

  setTimeout(() => {
    elements.toastNotification.classList.add('hidden');
  }, 3500);
}
