// ============================================
// POPUP.JS - Main UI Logic
// ============================================
// This file handles all UI interactions and communicates with the background service worker
// to manage timer states that persist even when the popup closes.

// ============================================
// TAB SWITCHING LOGIC
// ============================================
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.getAttribute('data-tab');

    // Remove active class from all tabs and buttons
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to clicked button and corresponding content
    button.classList.add('active');
    document.getElementById(targetTab).classList.add('active');

    // Load current state when switching tabs
    if (targetTab === 'timer') loadTimerState();
    if (targetTab === 'stopwatch') loadStopwatchState();
    if (targetTab === 'pomodoro') loadPomodoroState();
  });
});

// ============================================
// PIN TO BROWSER FUNCTIONALITY
// ============================================
const pinBtn = document.getElementById('pin-to-browser');

pinBtn.addEventListener('click', () => {
  // Determine which timer is currently active
  const activeTab = document.querySelector('.tab-btn.active');
  const timerType = activeTab ? activeTab.getAttribute('data-tab') : 'timer';

  // Save the active timer type to storage
  chrome.storage.local.set({ pinnedTimerType: timerType });

  // Send message to background to create pinned window
  chrome.runtime.sendMessage({
    action: 'createPinnedWindow',
    timerType: timerType
  });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Format time to HH:MM:SS
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Format time with milliseconds for stopwatch
function formatTimeWithMs(totalMs) {
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${padMs(ms)}`;
}

// Pad single digits with leading zero
function pad(num) {
  return num.toString().padStart(2, '0');
}

// Pad milliseconds to 3 digits
function padMs(num) {
  return num.toString().padStart(3, '0');
}

// ============================================
// CUSTOM TIMER LOGIC
// ============================================
const timerDisplay = document.getElementById('timer-display');
const timerStartBtn = document.getElementById('timer-start');
const timerPauseBtn = document.getElementById('timer-pause');
const timerResetBtn = document.getElementById('timer-reset');
const timerHoursInput = document.getElementById('timer-hours');
const timerMinutesInput = document.getElementById('timer-minutes');
const timerSecondsInput = document.getElementById('timer-seconds');

let timerUpdateInterval = null;

// Start Timer
timerStartBtn.addEventListener('click', () => {
  const hours = parseInt(timerHoursInput.value) || 0;
  const minutes = parseInt(timerMinutesInput.value) || 0;
  const seconds = parseInt(timerSecondsInput.value) || 0;
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (totalSeconds <= 0) {
    alert('Please set a valid time!');
    return;
  }

  // Send message to background to start timer
  chrome.runtime.sendMessage({
    action: 'startTimer',
    duration: totalSeconds
  });

  updateTimerButtons('running');
  startTimerDisplay();
});

// Pause Timer
timerPauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'pauseTimer' });
  updateTimerButtons('paused');
  stopTimerDisplay();
});

// Reset Timer
timerResetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'resetTimer' });
  updateTimerButtons('idle');
  timerDisplay.textContent = '00:00:00';
  stopTimerDisplay();
});

// Update button states
function updateTimerButtons(state) {
  if (state === 'running') {
    timerStartBtn.disabled = true;
    timerPauseBtn.disabled = false;
    timerResetBtn.disabled = false;
  } else if (state === 'paused') {
    timerStartBtn.disabled = false;
    timerPauseBtn.disabled = true;
    timerResetBtn.disabled = false;
  } else {
    timerStartBtn.disabled = false;
    timerPauseBtn.disabled = true;
    timerResetBtn.disabled = false;
  }
}

// Start updating display
function startTimerDisplay() {
  stopTimerDisplay();
  timerUpdateInterval = setInterval(() => {
    chrome.storage.local.get(['timerState'], (result) => {
      if (result.timerState) {
        const { remainingSeconds, isRunning } = result.timerState;
        if (remainingSeconds > 0) {
          timerDisplay.textContent = formatTime(remainingSeconds);
        } else {
          timerDisplay.textContent = '00:00:00';
          stopTimerDisplay();
          updateTimerButtons('idle');
        }
      }
    });
  }, 100);
}

// Stop updating display
function stopTimerDisplay() {
  if (timerUpdateInterval) {
    clearInterval(timerUpdateInterval);
    timerUpdateInterval = null;
  }
}

// Load timer state from storage
function loadTimerState() {
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
      const { remainingSeconds, isRunning } = result.timerState;
      timerDisplay.textContent = formatTime(remainingSeconds);

      if (isRunning && remainingSeconds > 0) {
        updateTimerButtons('running');
        startTimerDisplay();
      } else if (remainingSeconds > 0) {
        updateTimerButtons('paused');
      } else {
        updateTimerButtons('idle');
      }
    }
  });
}

// ============================================
// STOPWATCH LOGIC
// ============================================
const stopwatchDisplay = document.getElementById('stopwatch-display');
const stopwatchStartBtn = document.getElementById('stopwatch-start');
const stopwatchPauseBtn = document.getElementById('stopwatch-pause');
const stopwatchResetBtn = document.getElementById('stopwatch-reset');

let stopwatchUpdateInterval = null;

// Start Stopwatch
stopwatchStartBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'startStopwatch' });
  updateStopwatchButtons('running');
  startStopwatchDisplay();
});

// Pause Stopwatch
stopwatchPauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'pauseStopwatch' });
  updateStopwatchButtons('paused');
  stopStopwatchDisplay();
});

// Reset Stopwatch
stopwatchResetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'resetStopwatch' });
  updateStopwatchButtons('idle');
  stopwatchDisplay.textContent = '00:00:00.000';
  stopStopwatchDisplay();
});

// Update button states
function updateStopwatchButtons(state) {
  if (state === 'running') {
    stopwatchStartBtn.disabled = true;
    stopwatchPauseBtn.disabled = false;
    stopwatchResetBtn.disabled = false;
  } else if (state === 'paused') {
    stopwatchStartBtn.disabled = false;
    stopwatchPauseBtn.disabled = true;
    stopwatchResetBtn.disabled = false;
  } else {
    stopwatchStartBtn.disabled = false;
    stopwatchPauseBtn.disabled = true;
    stopwatchResetBtn.disabled = false;
  }
}

// Start updating display
function startStopwatchDisplay() {
  stopStopwatchDisplay();
  stopwatchUpdateInterval = setInterval(() => {
    chrome.storage.local.get(['stopwatchState'], (result) => {
      if (result.stopwatchState) {
        const { elapsedMs } = result.stopwatchState;
        stopwatchDisplay.textContent = formatTimeWithMs(elapsedMs);
      }
    });
  }, 10); // Update every 10ms for smooth milliseconds display
}

// Stop updating display
function stopStopwatchDisplay() {
  if (stopwatchUpdateInterval) {
    clearInterval(stopwatchUpdateInterval);
    stopwatchUpdateInterval = null;
  }
}

// Load stopwatch state from storage
function loadStopwatchState() {
  chrome.storage.local.get(['stopwatchState'], (result) => {
    if (result.stopwatchState) {
      const { elapsedMs, isRunning } = result.stopwatchState;
      stopwatchDisplay.textContent = formatTimeWithMs(elapsedMs);

      if (isRunning) {
        updateStopwatchButtons('running');
        startStopwatchDisplay();
      } else if (elapsedMs > 0) {
        updateStopwatchButtons('paused');
      } else {
        updateStopwatchButtons('idle');
      }
    }
  });
}

// ============================================
// POMODORO LOGIC
// ============================================
const pomodoroDisplay = document.getElementById('pomodoro-display');
const pomodoroStartBtn = document.getElementById('pomodoro-start');
const pomodoroPauseBtn = document.getElementById('pomodoro-pause');
const pomodoroResetBtn = document.getElementById('pomodoro-reset');
const pomodoroSessionType = document.getElementById('pomodoro-session-type');
const pomodoroCycle = document.getElementById('pomodoro-cycle');

const pomodoroSettingsToggle = document.getElementById('pomodoro-settings-toggle');
const pomodoroSettingsPanel = document.getElementById('pomodoro-settings-panel');
const pomodoroSaveSettings = document.getElementById('pomodoro-save-settings');
const pomodoroWorkInput = document.getElementById('pomodoro-work');
const pomodoroShortInput = document.getElementById('pomodoro-short');
const pomodoroLongInput = document.getElementById('pomodoro-long');

let pomodoroUpdateInterval = null;

// Toggle settings panel
pomodoroSettingsToggle.addEventListener('click', () => {
  pomodoroSettingsPanel.classList.toggle('open');
});

// Save settings
pomodoroSaveSettings.addEventListener('click', () => {
  const workDuration = parseInt(pomodoroWorkInput.value) || 25;
  const shortBreakDuration = parseInt(pomodoroShortInput.value) || 5;
  const longBreakDuration = parseInt(pomodoroLongInput.value) || 15;

  chrome.runtime.sendMessage({
    action: 'updatePomodoroSettings',
    settings: {
      workDuration,
      shortBreakDuration,
      longBreakDuration
    }
  });

  pomodoroSettingsPanel.classList.remove('open');
  loadPomodoroState();
});

// Start Pomodoro
pomodoroStartBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'startPomodoro' });
  updatePomodoroButtons('running');
  startPomodoroDisplay();
});

// Pause Pomodoro
pomodoroPauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'pausePomodoro' });
  updatePomodoroButtons('paused');
  stopPomodoroDisplay();
});

// Reset Pomodoro
pomodoroResetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'resetPomodoro' });
  updatePomodoroButtons('idle');
  stopPomodoroDisplay();
  loadPomodoroState();
});

// Update button states
function updatePomodoroButtons(state) {
  if (state === 'running') {
    pomodoroStartBtn.disabled = true;
    pomodoroPauseBtn.disabled = false;
    pomodoroResetBtn.disabled = false;
  } else if (state === 'paused') {
    pomodoroStartBtn.disabled = false;
    pomodoroPauseBtn.disabled = true;
    pomodoroResetBtn.disabled = false;
  } else {
    pomodoroStartBtn.disabled = false;
    pomodoroPauseBtn.disabled = true;
    pomodoroResetBtn.disabled = false;
  }
}

// Start updating display
function startPomodoroDisplay() {
  stopPomodoroDisplay();
  pomodoroUpdateInterval = setInterval(() => {
    chrome.storage.local.get(['pomodoroState'], (result) => {
      if (result.pomodoroState) {
        const { remainingSeconds, sessionType, cycle } = result.pomodoroState;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        pomodoroDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`;
        pomodoroSessionType.textContent = sessionType;
        pomodoroCycle.textContent = cycle;

        if (remainingSeconds <= 0) {
          stopPomodoroDisplay();
        }
      }
    });
  }, 100);
}

// Stop updating display
function stopPomodoroDisplay() {
  if (pomodoroUpdateInterval) {
    clearInterval(pomodoroUpdateInterval);
    pomodoroUpdateInterval = null;
  }
}

// Load pomodoro state from storage
function loadPomodoroState() {
  chrome.storage.local.get(['pomodoroState', 'pomodoroSettings'], (result) => {
    if (result.pomodoroState) {
      const { remainingSeconds, sessionType, cycle, isRunning } = result.pomodoroState;
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      pomodoroDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`;
      pomodoroSessionType.textContent = sessionType;
      pomodoroCycle.textContent = cycle;

      if (isRunning && remainingSeconds > 0) {
        updatePomodoroButtons('running');
        startPomodoroDisplay();
      } else if (remainingSeconds > 0) {
        updatePomodoroButtons('paused');
      } else {
        updatePomodoroButtons('idle');
      }
    }

    // Load settings
    if (result.pomodoroSettings) {
      pomodoroWorkInput.value = result.pomodoroSettings.workDuration;
      pomodoroShortInput.value = result.pomodoroSettings.shortBreakDuration;
      pomodoroLongInput.value = result.pomodoroSettings.longBreakDuration;
    }
  });
}

// ============================================
// LISTEN FOR MESSAGES FROM BACKGROUND
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'timerComplete') {
    timerDisplay.textContent = '00:00:00';
    updateTimerButtons('idle');
    stopTimerDisplay();
  }

  if (message.action === 'pomodoroSessionChange') {
    loadPomodoroState();
  }
});

// ============================================
// INITIALIZATION
// ============================================
// Load initial state when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadTimerState();
  loadStopwatchState();
  loadPomodoroState();
});
