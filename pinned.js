// ============================================
// PINNED.JS - Pinned Window Logic
// ============================================
// This handles the small pinned timer window

// Utility functions
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatTimeWithMs(totalMs) {
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// Elements
const pinnedTime = document.getElementById('pinned-time');
const pinnedLabel = document.getElementById('pinned-label');
const closeBtn = document.getElementById('close-pinned');
const startBtn = document.getElementById('pinned-start');
const pauseBtn = document.getElementById('pinned-pause');
const resetBtn = document.getElementById('pinned-reset');

// Current active timer type
let activeTimerType = 'timer'; // 'timer', 'stopwatch', or 'pomodoro'
let updateInterval = null;

// Close window
closeBtn.addEventListener('click', () => {
    window.close();
});

// Start button
startBtn.addEventListener('click', () => {
    if (activeTimerType === 'timer') {
        chrome.runtime.sendMessage({ action: 'startTimer', duration: 300 }); // 5 min default
    } else if (activeTimerType === 'stopwatch') {
        chrome.runtime.sendMessage({ action: 'startStopwatch' });
    } else if (activeTimerType === 'pomodoro') {
        chrome.runtime.sendMessage({ action: 'startPomodoro' });
    }
});

// Pause button
pauseBtn.addEventListener('click', () => {
    if (activeTimerType === 'timer') {
        chrome.runtime.sendMessage({ action: 'pauseTimer' });
    } else if (activeTimerType === 'stopwatch') {
        chrome.runtime.sendMessage({ action: 'pauseStopwatch' });
    } else if (activeTimerType === 'pomodoro') {
        chrome.runtime.sendMessage({ action: 'pausePomodoro' });
    }
});

// Reset button
resetBtn.addEventListener('click', () => {
    if (activeTimerType === 'timer') {
        chrome.runtime.sendMessage({ action: 'resetTimer' });
    } else if (activeTimerType === 'stopwatch') {
        chrome.runtime.sendMessage({ action: 'resetStopwatch' });
    } else if (activeTimerType === 'pomodoro') {
        chrome.runtime.sendMessage({ action: 'resetPomodoro' });
    }
});

// Update display based on storage
function updateDisplay() {
    chrome.storage.local.get(['timerState', 'stopwatchState', 'pomodoroState', 'pinnedTimerType'], (result) => {
        // Determine which timer to show
        if (result.pinnedTimerType) {
            activeTimerType = result.pinnedTimerType;
        }

        if (activeTimerType === 'timer' && result.timerState) {
            const { remainingSeconds } = result.timerState;
            pinnedTime.textContent = formatTime(remainingSeconds);
            pinnedLabel.textContent = 'Timer';
        } else if (activeTimerType === 'stopwatch' && result.stopwatchState) {
            const { elapsedMs } = result.stopwatchState;
            pinnedTime.textContent = formatTimeWithMs(elapsedMs);
            pinnedLabel.textContent = 'Stopwatch';
        } else if (activeTimerType === 'pomodoro' && result.pomodoroState) {
            const { remainingSeconds, sessionType } = result.pomodoroState;
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            pinnedTime.textContent = `${pad(minutes)}:${pad(seconds)}`;
            pinnedLabel.textContent = sessionType;
        }
    });
}

// Start update loop
function startUpdateLoop() {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateDisplay, 100);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();
    startUpdateLoop();
});

// Listen for messages from main popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updatePinnedTimer') {
        activeTimerType = message.timerType || 'timer';
        updateDisplay();
    }
});
