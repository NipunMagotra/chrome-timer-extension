// ============================================
// BACKGROUND.JS - Service Worker
// ============================================
// This service worker runs in the background and manages all timer logic.
// It ensures timers continue running even when the popup is closed.
// Uses chrome.storage.local for state persistence across browser sessions.
// Uses chrome.alarms API for accurate, battery-efficient timing.

// ============================================
// STATE INITIALIZATION
// ============================================

// Initialize default states on installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');

    // Set default timer state
    chrome.storage.local.set({
        timerState: {
            remainingSeconds: 0,
            isRunning: false,
            endTime: null
        },
        stopwatchState: {
            elapsedMs: 0,
            isRunning: false,
            startTime: null,
            pausedElapsed: 0
        },
        pomodoroState: {
            remainingSeconds: 25 * 60, // 25 minutes default
            sessionType: 'Work Session',
            cycle: 1,
            isRunning: false,
            endTime: null
        },
        pomodoroSettings: {
            workDuration: 25, // minutes
            shortBreakDuration: 5,
            longBreakDuration: 15
        }
    });
});

// ============================================
// MESSAGE LISTENER - Handles commands from popup
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);

    // Pinned window creation
    if (message.action === 'createPinnedWindow') {
        // Get screen dimensions to position in top right
        chrome.system.display.getInfo((displays) => {
            const primaryDisplay = displays[0];
            const screenWidth = primaryDisplay.bounds.width;

            // Create small window in top right corner
            chrome.windows.create({
                url: 'pinned.html',
                type: 'popup',
                width: 280,
                height: 200,
                left: screenWidth - 300, // 20px from right edge
                top: 20, // 20px from top
                focused: false // Don't steal focus
            }, (window) => {
                console.log('Pinned window created:', window.id);
                // Store window ID for future reference
                chrome.storage.local.set({ pinnedWindowId: window.id });
            });
        });
    }

    // Timer actions
    if (message.action === 'startTimer') {
        startTimer(message.duration);
    }
    if (message.action === 'pauseTimer') {
        pauseTimer();
    }
    if (message.action === 'resetTimer') {
        resetTimer();
    }

    // Stopwatch actions
    if (message.action === 'startStopwatch') {
        startStopwatch();
    }
    if (message.action === 'pauseStopwatch') {
        pauseStopwatch();
    }
    if (message.action === 'resetStopwatch') {
        resetStopwatch();
    }

    // Pomodoro actions
    if (message.action === 'startPomodoro') {
        startPomodoro();
    }
    if (message.action === 'pausePomodoro') {
        pausePomodoro();
    }
    if (message.action === 'resetPomodoro') {
        resetPomodoro();
    }
    if (message.action === 'updatePomodoroSettings') {
        updatePomodoroSettings(message.settings);
    }
});

// ============================================
// CUSTOM TIMER FUNCTIONS
// ============================================

function startTimer(duration) {
    const endTime = Date.now() + (duration * 1000);

    chrome.storage.local.set({
        timerState: {
            remainingSeconds: duration,
            isRunning: true,
            endTime: endTime
        }
    });

    // Create alarm for timer completion
    chrome.alarms.create('timer', { when: endTime });

    // Start update interval
    startTimerUpdates();
}

function pauseTimer() {
    chrome.storage.local.get(['timerState'], (result) => {
        if (result.timerState) {
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.ceil((result.timerState.endTime - now) / 1000));

            chrome.storage.local.set({
                timerState: {
                    ...result.timerState,
                    remainingSeconds: remainingSeconds,
                    isRunning: false,
                    endTime: null
                }
            });

            // Clear alarm
            chrome.alarms.clear('timer');
            stopTimerUpdates();
        }
    });
}

function resetTimer() {
    chrome.storage.local.set({
        timerState: {
            remainingSeconds: 0,
            isRunning: false,
            endTime: null
        }
    });

    chrome.alarms.clear('timer');
    stopTimerUpdates();
}

// Timer update interval
let timerInterval = null;

function startTimerUpdates() {
    stopTimerUpdates();
    timerInterval = setInterval(() => {
        chrome.storage.local.get(['timerState'], (result) => {
            if (result.timerState && result.timerState.isRunning) {
                const now = Date.now();
                const remainingSeconds = Math.max(0, Math.ceil((result.timerState.endTime - now) / 1000));

                chrome.storage.local.set({
                    timerState: {
                        ...result.timerState,
                        remainingSeconds: remainingSeconds
                    }
                });

                if (remainingSeconds <= 0) {
                    stopTimerUpdates();
                }
            }
        });
    }, 100);
}

function stopTimerUpdates() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// STOPWATCH FUNCTIONS
// ============================================

function startStopwatch() {
    chrome.storage.local.get(['stopwatchState'], (result) => {
        const currentState = result.stopwatchState || { elapsedMs: 0, pausedElapsed: 0 };
        const startTime = Date.now() - currentState.pausedElapsed;

        chrome.storage.local.set({
            stopwatchState: {
                elapsedMs: currentState.pausedElapsed,
                isRunning: true,
                startTime: startTime,
                pausedElapsed: currentState.pausedElapsed
            }
        });

        startStopwatchUpdates();
    });
}

function pauseStopwatch() {
    chrome.storage.local.get(['stopwatchState'], (result) => {
        if (result.stopwatchState && result.stopwatchState.isRunning) {
            const now = Date.now();
            const elapsed = now - result.stopwatchState.startTime;

            chrome.storage.local.set({
                stopwatchState: {
                    elapsedMs: elapsed,
                    isRunning: false,
                    startTime: null,
                    pausedElapsed: elapsed
                }
            });

            stopStopwatchUpdates();
        }
    });
}

function resetStopwatch() {
    chrome.storage.local.set({
        stopwatchState: {
            elapsedMs: 0,
            isRunning: false,
            startTime: null,
            pausedElapsed: 0
        }
    });

    stopStopwatchUpdates();
}

// Stopwatch update interval
let stopwatchInterval = null;

function startStopwatchUpdates() {
    stopStopwatchUpdates();
    stopwatchInterval = setInterval(() => {
        chrome.storage.local.get(['stopwatchState'], (result) => {
            if (result.stopwatchState && result.stopwatchState.isRunning) {
                const now = Date.now();
                const elapsed = now - result.stopwatchState.startTime;

                chrome.storage.local.set({
                    stopwatchState: {
                        ...result.stopwatchState,
                        elapsedMs: elapsed
                    }
                });
            }
        });
    }, 10); // Update every 10ms for accuracy
}

function stopStopwatchUpdates() {
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
}

// ============================================
// POMODORO FUNCTIONS
// ============================================

function startPomodoro() {
    chrome.storage.local.get(['pomodoroState', 'pomodoroSettings'], (result) => {
        const state = result.pomodoroState;
        const settings = result.pomodoroSettings;

        // If starting fresh, use the full duration
        let duration = state.remainingSeconds;

        const endTime = Date.now() + (duration * 1000);

        chrome.storage.local.set({
            pomodoroState: {
                ...state,
                isRunning: true,
                endTime: endTime
            }
        });

        // Create alarm for session completion
        chrome.alarms.create('pomodoro', { when: endTime });

        startPomodoroUpdates();
    });
}

function pausePomodoro() {
    chrome.storage.local.get(['pomodoroState'], (result) => {
        if (result.pomodoroState) {
            const now = Date.now();
            const remainingSeconds = Math.max(0, Math.ceil((result.pomodoroState.endTime - now) / 1000));

            chrome.storage.local.set({
                pomodoroState: {
                    ...result.pomodoroState,
                    remainingSeconds: remainingSeconds,
                    isRunning: false,
                    endTime: null
                }
            });

            chrome.alarms.clear('pomodoro');
            stopPomodoroUpdates();
        }
    });
}

function resetPomodoro() {
    chrome.storage.local.get(['pomodoroSettings'], (result) => {
        const settings = result.pomodoroSettings || {
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15
        };

        chrome.storage.local.set({
            pomodoroState: {
                remainingSeconds: settings.workDuration * 60,
                sessionType: 'Work Session',
                cycle: 1,
                isRunning: false,
                endTime: null
            }
        });

        chrome.alarms.clear('pomodoro');
        stopPomodoroUpdates();
    });
}

function updatePomodoroSettings(settings) {
    chrome.storage.local.set({
        pomodoroSettings: settings
    });

    // Only reset if not currently running
    chrome.storage.local.get(['pomodoroState'], (result) => {
        if (result.pomodoroState && !result.pomodoroState.isRunning) {
            resetPomodoro();
        }
    });
}

function advancePomodoroSession() {
    chrome.storage.local.get(['pomodoroState', 'pomodoroSettings'], (result) => {
        const state = result.pomodoroState;
        const settings = result.pomodoroSettings;

        let newSessionType;
        let newDuration;
        let newCycle = state.cycle;

        if (state.sessionType === 'Work Session') {
            // After work, determine which break
            if (state.cycle >= 4) {
                newSessionType = 'Long Break';
                newDuration = settings.longBreakDuration * 60;
                newCycle = 1; // Reset cycle after long break
            } else {
                newSessionType = 'Short Break';
                newDuration = settings.shortBreakDuration * 60;
            }
        } else {
            // After any break, go to work
            newSessionType = 'Work Session';
            newDuration = settings.workDuration * 60;
            if (state.sessionType === 'Short Break') {
                newCycle = state.cycle + 1;
            }
        }

        const endTime = Date.now() + (newDuration * 1000);

        chrome.storage.local.set({
            pomodoroState: {
                remainingSeconds: newDuration,
                sessionType: newSessionType,
                cycle: newCycle,
                isRunning: true,
                endTime: endTime
            }
        });

        // Notify user of session change
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Pomodoro Session',
            message: `Starting ${newSessionType}`,
            priority: 2
        });

        // Send message to popup if it's open
        chrome.runtime.sendMessage({ action: 'pomodoroSessionChange' });

        // Set alarm for next session
        chrome.alarms.create('pomodoro', { when: endTime });
    });
}

// Pomodoro update interval
let pomodoroInterval = null;

function startPomodoroUpdates() {
    stopPomodoroUpdates();
    pomodoroInterval = setInterval(() => {
        chrome.storage.local.get(['pomodoroState'], (result) => {
            if (result.pomodoroState && result.pomodoroState.isRunning) {
                const now = Date.now();
                const remainingSeconds = Math.max(0, Math.ceil((result.pomodoroState.endTime - now) / 1000));

                chrome.storage.local.set({
                    pomodoroState: {
                        ...result.pomodoroState,
                        remainingSeconds: remainingSeconds
                    }
                });

                if (remainingSeconds <= 0) {
                    stopPomodoroUpdates();
                }
            }
        });
    }, 100);
}

function stopPomodoroUpdates() {
    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }
}

// ============================================
// ALARM LISTENER - Handles timer completions
// ============================================
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);

    if (alarm.name === 'timer') {
        // Timer completed
        chrome.storage.local.set({
            timerState: {
                remainingSeconds: 0,
                isRunning: false,
                endTime: null
            }
        });

        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Timer Complete',
            message: 'Your timer has finished!',
            priority: 2
        });

        // Notify popup
        chrome.runtime.sendMessage({ action: 'timerComplete' });
        stopTimerUpdates();
    }

    if (alarm.name === 'pomodoro') {
        // Pomodoro session completed - auto advance
        stopPomodoroUpdates();
        advancePomodoroSession();
        startPomodoroUpdates();
    }
});

// ============================================
// PERSIST STATE ON BROWSER CLOSE
// ============================================
// Service workers can be terminated, so we rely on chrome.storage.local
// for state persistence. The intervals update storage frequently,
// ensuring state is always current even if the service worker restarts.

// Restart timers if service worker was restarted
chrome.storage.local.get(['timerState', 'stopwatchState', 'pomodoroState'], (result) => {
    if (result.timerState && result.timerState.isRunning) {
        startTimerUpdates();
    }

    if (result.stopwatchState && result.stopwatchState.isRunning) {
        startStopwatchUpdates();
    }

    if (result.pomodoroState && result.pomodoroState.isRunning) {
        startPomodoroUpdates();
    }
});
