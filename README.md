# Chrome Extension: Timer, Stopwatch & Pomodoro

A complete Chrome Extension (Manifest V3) that provides three essential productivity tools:
- **Custom Timer** - Countdown timer with custom duration
- **Stopwatch** - Track elapsed time with millisecond precision
- **Pomodoro Timer** - Work/break cycles with customizable durations

## 📁 Project Structure

```
/chrome ext
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html             # UI structure
├── popup.css              # Styling with modern gradients
├── popup.js               # UI logic and state management
├── background.js          # Service worker for persistent timers
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

---

## 🚀 Installation Instructions

### Step 1: Download/Clone the Files
Ensure all files are in the `chrome ext` folder as shown above.

### Step 2: Open Chrome Extensions Page
1. Open Google Chrome
2. Navigate to: `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)

### Step 3: Load Unpacked Extension
1. Click **"Load unpacked"** button
2. Navigate to your `chrome ext` folder
3. Select the folder and click **"Select Folder"**

### Step 4: Pin the Extension (Optional)
1. Click the puzzle icon in Chrome toolbar
2. Find "Timer & Pomodoro Extension"
3. Click the pin icon to keep it visible

### Step 5: Use the Extension
Click the extension icon to open the popup and start using your timers!

---

## 📖 File Explanations

### 1. **manifest.json**

**Purpose:** Configuration file for Chrome Extension (Manifest V3 compliant)

**Key Sections:**
- `manifest_version: 3` - Uses the latest Chrome extension format
- `permissions` - Requests access to:
  - `storage` - Persist timer states across sessions
  - `alarms` - Create accurate, battery-efficient timers
  - `notifications` - Alert users when timers complete
- `action.default_popup` - Sets `popup.html` as the extension popup
- `background.service_worker` - Registers `background.js` to run in background

**Why these permissions?**
- **storage**: Essential for saving timer states so they persist even after browser restart
- **alarms**: More efficient than `setInterval` for long-running timers, battery-friendly
- **notifications**: Provides visual alerts when timers complete (even if popup is closed)

---

### 2. **popup.html**

**Purpose:** The user interface structure displayed when clicking the extension icon

**Key Features:**
- **Tab Navigation** - Switch between Timer, Stopwatch, and Pomodoro
- **Input Fields** - For custom timer durations and Pomodoro settings
- **Display Areas** - Large, readable time displays
- **Control Buttons** - Start, Pause, Reset for each mode

**Design Decisions:**
- Minimal, clean structure (no frameworks needed)
- Semantic HTML with proper IDs for JavaScript interaction
- Collapsible settings panel for Pomodoro customization
- Responsive within the 320px popup width constraint

---

### 3. **popup.css**

**Purpose:** Modern, visually appealing styling

**Design Highlights:**
- **Gradient Background** - Purple gradient (#667eea to #764ba2) for premium feel
- **Glassmorphism** - Translucent panels with backdrop-filter for depth
- **Smooth Animations** - Fade-in transitions when switching tabs
- **Color-Coded Buttons** - Green (start), Pink (pause), White (reset)
- **Monospace Display** - Courier New for clear, aligned time digits

**Why this approach?**
- Vanilla CSS only (no dependencies)
- Modern design patterns (gradients, blur effects)
- Optimized for small popup size (320x400px)
- High contrast for readability

---

### 4. **popup.js**

**Purpose:** Handles all UI interactions and communicates with background service worker

**Key Logic:**

#### **Tab Switching**
- Listens for tab button clicks
- Shows/hides corresponding content sections
- Loads current state when switching tabs

#### **Communication Pattern**
```javascript
// Popup sends messages to background
chrome.runtime.sendMessage({ action: 'startTimer', duration: 300 });

// Background updates storage
chrome.storage.local.set({ timerState: {...} });

// Popup reads from storage
chrome.storage.local.get(['timerState'], (result) => {...});
```

#### **Display Updates**
- Uses `setInterval` to poll storage every 100ms (timer/pomodoro) or 10ms (stopwatch)
- Updates display without blocking the UI
- Automatically stops interval when timer completes

#### **Button State Management**
- Enables/disables buttons based on timer state (running, paused, idle)
- Prevents invalid actions (e.g., starting an already running timer)

**Why intervals instead of direct computation?**
- Storage is the single source of truth (background controls timing)
- Popup can close/reopen anytime - needs to sync with background state
- Polling is simple, reliable, and doesn't cause performance issues at these frequencies

---

### 5. **background.js** (Service Worker)

**Purpose:** The "brain" of the extension - manages timer logic even when popup is closed

**Critical Concepts:**

#### **Service Worker Lifecycle**
- Service workers can be terminated by Chrome to save resources
- They restart automatically when needed
- **State MUST be persisted in `chrome.storage.local`** to survive termination

#### **Timer Accuracy Strategy**

**For Countdown Timers (Timer & Pomodoro):**
```javascript
const endTime = Date.now() + (duration * 1000);
chrome.alarms.create('timer', { when: endTime });

// Update display every 100ms
setInterval(() => {
  const remainingSeconds = Math.ceil((endTime - Date.now()) / 1000);
  chrome.storage.local.set({ timerState: { remainingSeconds } });
}, 100);
```

**Why this approach?**
- Uses absolute timestamp (`endTime`) instead of decrementing counters
- Avoids drift from JavaScript timing inaccuracies
- `chrome.alarms` ensures accurate completion notification
- Display updates are cosmetic only, don't affect timer accuracy

**For Stopwatch:**
```javascript
const startTime = Date.now() - pausedElapsed;

setInterval(() => {
  const elapsedMs = Date.now() - startTime;
  chrome.storage.local.set({ stopwatchState: { elapsedMs } });
}, 10);
```

**Why 10ms interval?**
- Provides smooth millisecond display updates
- Still performant (100 updates/second)
- More frequent than needed but ensures no visible lag

#### **State Persistence**
All timer states are stored in `chrome.storage.local`:
```javascript
{
  timerState: { remainingSeconds, isRunning, endTime },
  stopwatchState: { elapsedMs, isRunning, startTime, pausedElapsed },
  pomodoroState: { remainingSeconds, sessionType, cycle, isRunning, endTime },
  pomodoroSettings: { workDuration, shortBreakDuration, longBreakDuration }
}
```

#### **Alarm Handling**
```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timer') {
    // Show notification
    chrome.notifications.create({...});
    // Update state
    chrome.storage.local.set({...});
  }
});
```

**Why alarms over setTimeout?**
- `setTimeout` gets cleared if service worker terminates
- Alarms persist even if extension is disabled temporarily
- More battery-efficient for long durations

#### **Pomodoro Auto-Advance**
- When a pomodoro session completes, `advancePomodoroSession()` is called
- Automatically transitions: Work → Short Break → Work → ... → Long Break
- Resets cycle counter after long break
- Shows notification for session changes

---

## ⚙️ How State Persistence Works

### The Problem
- Chrome can terminate service workers at any time
- Popup closes when user clicks away
- Timers must continue running regardless

### The Solution
1. **Background.js** is the single source of truth for time calculations
2. All state is **immediately written to chrome.storage.local**
3. Display updates by **reading from storage**, not from memory
4. On service worker restart, intervals are re-initialized from stored state

### Example Flow: User starts timer and closes popup

1. User clicks "Start" → `popup.js` sends message to `background.js`
2. `background.js` calculates `endTime`, stores it in `chrome.storage.local`
3. `background.js` starts interval to update `remainingSeconds` every 100ms
4. User closes popup → intervals in `popup.js` stop, but background continues
5. User reopens popup → `loadTimerState()` reads from storage and restarts display interval
6. Timer completes → alarm fires, notification shows, state updated to `isRunning: false`

---

## 🐛 Common Issues & Fixes

### Issue 1: Timer doesn't persist after closing popup
**Cause:** Background service worker not running or state not saved to storage  
**Fix:** 
- Check console for errors: `chrome://extensions/` → Inspect Service Worker
- Ensure `chrome.storage.local.set()` calls are executing
- Verify alarms are being created: `chrome://extensions/` → Service Worker console → `chrome.alarms.getAll(console.log)`

### Issue 2: Timer display doesn't update
**Cause:** Interval not started or storage permission missing  
**Fix:**
- Open popup console (right-click popup → Inspect)
- Check for permission errors
- Verify intervals are running (add `console.log` in interval functions)

### Issue 3: Notifications don't show
**Cause:** Notification permission not granted or browser notifications disabled  
**Fix:**
- Check Chrome settings: Settings → Privacy & Security → Site Settings → Notifications
- Ensure extension has notification permission in `manifest.json`

### Issue 4: Stopwatch milliseconds not smooth
**Cause:** Interval too slow or browser throttling  
**Fix:**
- Ensure update interval is 10ms in `background.js`
- Check if browser is in low-power mode (throttles timers)

### Issue 5: Pomodoro doesn't auto-advance
**Cause:** Alarm not triggering or `advancePomodoroSession` not called  
**Fix:**
- Check alarms in service worker console
- Verify `chrome.alarms.onAlarm` listener is registered
- Check storage state shows correct `sessionType`

### Issue 6: Extension doesn't load
**Cause:** Manifest errors or file paths incorrect  
**Fix:**
- Check `chrome://extensions/` for specific error messages
- Verify all file paths in manifest match actual file locations
- Ensure manifest JSON is valid (use JSONLint.com)

---

## 🎯 Features Summary

### Custom Timer
✅ Input hours, minutes, seconds  
✅ Countdown display (HH:MM:SS)  
✅ Start, Pause, Reset controls  
✅ Notification when complete  
✅ Persists across popup close/open  
✅ Accurate timing (no drift)

### Stopwatch
✅ Elapsed time display (HH:MM:SS.ms)  
✅ Millisecond precision  
✅ Start, Pause, Reset controls  
✅ Persists across popup close/open  
✅ No timing drift

### Pomodoro
✅ Customizable work/break durations  
✅ 4 work cycles before long break  
✅ Auto-advance between sessions  
✅ Session type indicator  
✅ Cycle counter  
✅ Notifications on session change  
✅ Persists across popup close/open

---

## 🧪 Testing Your Extension

1. **Timer Test:**
   - Set timer for 10 seconds
   - Start timer
   - Close popup
   - Wait 10 seconds
   - Should receive notification

2. **Stopwatch Test:**
   - Start stopwatch
   - Close popup for 5 seconds
   - Reopen popup
   - Time should have continued counting

3. **Pomodoro Test:**
   - Set work to 1 minute, break to 30 seconds
   - Start session
   - Wait for auto-transition to break
   - Should show notification

4. **Persistence Test:**
   - Start any timer
   - Close browser completely
   - Reopen browser
   - Open extension popup
   - Timer should show correct remaining time

---

## 🔧 Advanced Customization

### Changing Default Times
Edit `background.js` line ~30:
```javascript
pomodoroSettings: {
  workDuration: 25,        // Change to your preferred work time
  shortBreakDuration: 5,   // Change short break
  longBreakDuration: 15    // Change long break
}
```

### Changing Colors
Edit `popup.css`:
- Background gradient: Line 10 (`background: linear-gradient(...)`)
- Button colors: Lines 145-157 (`.btn-primary`, `.btn-secondary`, etc.)

### Adding Sound
Add to `background.js` in alarm listener:
```javascript
// Play sound (requires audio file)
const audio = new Audio('path/to/sound.mp3');
audio.play();
```

Note: You'll need to add the audio file to your extension and update manifest permissions.

---

## 📝 Code Quality Notes

### Why No External Libraries?
- **Lightweight** - Extension loads instantly
- **No dependencies** - No version conflicts or security vulnerabilities
- **Learning** - Shows vanilla JavaScript best practices
- **Future-proof** - No breaking changes from library updates

### Code Organization
- Clear separation: UI (`popup.js`) vs Logic (`background.js`)
- Single responsibility: Each function does one thing
- Comments explain "why", not just "what"
- Consistent naming conventions

### Performance Considerations
- Minimal DOM manipulation
- Efficient interval frequencies (100ms timer, 10ms stopwatch)
- Storage writes only when values change
- No memory leaks (intervals cleared properly)

---

## 📚 Learning Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)
- [Service Workers](https://developer.chrome.com/docs/extensions/mv3/service_workers/)

---

## 🎓 Key Takeaways

1. **Service workers are different from web workers** - They can be terminated at any time
2. **Always persist state** - Use `chrome.storage.local` as single source of truth
3. **Absolute timestamps prevent drift** - Store `endTime`, not decremental counters
4. **Alarms are better than setTimeout** - For accuracy and battery life
5. **Poll storage for display updates** - Don't rely on message passing for real-time updates
6. **Manifest V3 is the future** - Background pages are deprecated

---

## 🚨 Important Notes

- This extension demonstrates **best practices for Chrome Extension development**
- Timer accuracy is within ±100ms due to JavaScript timing limitations
- Notifications require user permission (Chrome prompts automatically)
- Service worker stays alive as long as intervals are running
- Extension works offline (no external API calls)

---

## 🎉 You're Ready!

Your extension is now fully functional and production-ready. Feel free to:
- Customize the design
- Add more features (e.g., custom sounds, themes)
- Publish to Chrome Web Store
- Use as a portfolio project

Enjoy your new productivity tool! ⏱️
