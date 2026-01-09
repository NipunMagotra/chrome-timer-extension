# Troubleshooting Guide

## Installation Issues

### Error: "Failed to load extension"

**Symptoms:** Extension doesn't appear in chrome://extensions/

**Possible Causes:**
1. Missing or invalid manifest.json
2. Wrong folder selected
3. File permissions issue

**Solutions:**
```
1. Verify manifest.json exists and is valid JSON
   - Use JSONLint.com to validate
   - Check for trailing commas
   
2. Select the ROOT folder (contains manifest.json)
   - NOT the parent folder
   - NOT a subfolder
   
3. Check file permissions
   - Right-click folder → Properties → Security
   - Ensure you have read access
```

### Error: "Manifest version 2 is deprecated"

**Symptoms:** Warning message about manifest version

**Solution:**
- Ignore if using this extension (we use Manifest V3)
- If seeing this error, check manifest.json line 2: must say "manifest_version": 3

### Icons don't show

**Symptoms:** Extension loaded but shows default icon

**Solutions:**
```
1. Verify icons folder exists with all 3 files:
   - icon16.png
   - icon48.png
   - icon128.png
   
2. Check icon paths in manifest.json
   - Must be relative paths: "icons/icon16.png"
   
3. Reload extension
   - Click reload icon in chrome://extensions/
```

---

## Runtime Issues

### Timer doesn't start

**Symptoms:** Click Start, nothing happens

**Debugging Steps:**
```
1. Open popup console
   - Right-click extension popup
   - Click "Inspect"
   - Check Console tab for errors
   
2. Check service worker
   - Go to chrome://extensions/
   - Find extension
   - Click "Service Worker" link
   - Check for errors
   
3. Verify storage permissions
   - manifest.json should have "storage" in permissions
```

**Common Causes:**
- Input validation failed (value is 0)
- Service worker crashed
- Storage permission missing

### Timer doesn't persist

**Symptoms:** Timer resets when popup closes

**Debugging Steps:**
```
1. Check service worker is running
   - chrome://extensions/
   - Click "Service Worker" link
   - Should see console output
   
2. Verify storage is being written
   - In service worker console:
     chrome.storage.local.get(console.log)
   - Should show timerState object
   
3. Check for interval running
   - Add console.log in startTimerUpdates()
   - Should see updates every 100ms
```

**Solutions:**
```javascript
// In background.js, verify this code runs:
chrome.storage.local.set({
  timerState: {
    remainingSeconds: duration,
    isRunning: true,
    endTime: endTime
  }
});
```

### Display doesn't update

**Symptoms:** Timer running but display frozen

**Debugging Steps:**
```
1. Check popup console
   - Look for interval running
   - Should see storage reads every 100ms
   
2. Verify storage has data
   - In popup console:
     chrome.storage.local.get(console.log)
   
3. Check interval is starting
   - In popup.js, add console.log in startTimerDisplay()
```

**Common Causes:**
- Interval not started (check loadTimerState() is called)
- Storage read permission denied
- JavaScript error preventing interval creation

**Quick Fix:**
```
Close and reopen popup
- This reinitializes intervals
```

### Notifications don't appear

**Symptoms:** Timer completes but no notification

**Debugging Steps:**
```
1. Check Chrome notification settings
   - Windows: Settings → System → Notifications
   - Mac: System Preferences → Notifications
   - Enable Chrome notifications
   
2. Check site notification permission
   - Click lock icon in Chrome address bar
   - Ensure notifications are allowed
   
3. Check alarm fired
   - Service worker console:
     chrome.alarms.getAll(console.log)
   - Should see timer/pomodoro alarms
```

**Solutions:**
```
1. Manually test notification
   - In service worker console:
     chrome.notifications.create({
       type: 'basic',
       iconUrl: 'icons/icon48.png',
       title: 'Test',
       message: 'Testing notifications'
     })
   
2. Check notification permission in manifest
   - Should include "notifications" in permissions array
```

---

## Stopwatch Issues

### Milliseconds not updating smoothly

**Symptoms:** Milliseconds jump or freeze

**Causes:**
- Browser tab throttling (inactive tabs)
- Low system resources
- Interval frequency too low

**Solutions:**
```
1. Keep popup visible
   - Browser throttles background tabs
   
2. Check interval frequency
   - background.js line ~220
   - Should be 10ms: setInterval(..., 10)
   
3. Pin popup (workaround)
   - Use separate window: right-click popup → "Open in new window"
```

### Stopwatch resets unexpectedly

**Symptoms:** Time jumps back to 0

**Debugging:**
```
1. Check storage state
   - In popup console:
     chrome.storage.local.get(['stopwatchState'], console.log)
   
2. Verify resetStopwatch not being called
   - Add console.log in resetStopwatch()
   - Should only log when you click Reset
```

**Common Causes:**
- Service worker restarted (should resume from pausedElapsed)
- Storage write failed
- Reset button clicked accidentally

---

## Pomodoro Issues

### Session doesn't auto-advance

**Symptoms:** Timer reaches 0:00 but doesn't switch to break

**Debugging:**
```
1. Check alarm is set
   - Service worker console:
     chrome.alarms.getAll(console.log)
   - Should see 'pomodoro' alarm
   
2. Verify alarm listener
   - Check chrome.alarms.onAlarm in background.js
   - Add console.log to confirm it fires
   
3. Check advancePomodoroSession
   - Add console.log at start of function
   - Should execute when session ends
```

**Solutions:**
```javascript
// In background.js, verify:
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoro') {
    stopPomodoroUpdates();
    advancePomodoroSession();
    startPomodoroUpdates();
  }
});
```

### Settings don't save

**Symptoms:** Custom durations reset to default

**Debugging:**
```
1. Click Save Settings
2. Check storage immediately:
   chrome.storage.local.get(['pomodoroSettings'], console.log)
3. Should show your custom values
```

**Solutions:**
- Ensure you click "Save" button
- Check popup console for errors
- Verify chrome.runtime.sendMessage is working

### Cycle counter stuck

**Symptoms:** Shows "Cycle 1 / 4" forever

**Cause:** Cycle not incrementing in advancePomodoroSession

**Fix:**
```javascript
// In background.js, check this logic:
if (state.sessionType === 'Short Break') {
  newCycle = state.cycle + 1;  // This should increment
}
```

---

## Performance Issues

### Extension slow or laggy

**Symptoms:** Popup takes long to open, UI freezes

**Debugging:**
```
1. Check interval frequencies
   - Timer: 100ms ✅
   - Stopwatch: 10ms ✅
   - Too frequent? May cause lag on slow devices
   
2. Check for memory leaks
   - Service worker console:
     performance.memory
   - Should not continuously increase
   
3. Verify intervals are cleared
   - When timer stops, interval should stop
```

**Solutions:**
```
1. Ensure intervals cleared on stop:
   if (timerInterval) {
     clearInterval(timerInterval);
     timerInterval = null;
   }
   
2. Reduce stopwatch frequency if needed
   - Change from 10ms to 50ms for slower devices
   - In background.js line ~220
```

### High CPU usage

**Symptoms:** Browser uses lots of CPU

**Likely Causes:**
- Multiple intervals running simultaneously
- Interval not stopped after timer completes
- Infinite loop in update logic

**Debugging:**
```
Chrome Task Manager (Shift+Esc)
- Find "Extension: Timer & Pomodoro"
- Check CPU %
- Should be <1% for timer, <2% for stopwatch
```

**Solutions:**
```
1. Stop all timers
2. Reload extension
3. Check service worker console for errors
4. Verify clearInterval is called
```

---

## State Persistence Issues

### Timer resets after browser restart

**Symptoms:** Close browser, reopen, timer is at 0

**Expected Behavior:** 
- Timer SHOULD reset after browser close
- chrome.alarms don't persist across browser restarts by design

**Workaround (Advanced):**
```javascript
// In background.js onStartup:
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState && result.timerState.endTime) {
      const now = Date.now();
      if (result.timerState.endTime > now) {
        // Resume timer
        const remaining = Math.ceil((result.timerState.endTime - now) / 1000);
        chrome.alarms.create('timer', { when: result.timerState.endTime });
        startTimerUpdates();
      }
    }
  });
});
```

### Service worker crashes

**Symptoms:** Extension stops working randomly

**Debugging:**
```
1. Check service worker errors
   - chrome://extensions/
   - Click "Service Worker" link
   - Look for crash reports
   
2. Check Chrome logs
   - chrome://crashes/
   - Look for extension crashes
```

**Common Causes:**
- Memory leak (intervals not cleared)
- Unhandled promise rejection
- Infinite loop

**Solutions:**
```
1. Add error handling:
   chrome.storage.local.get(['state'], (result) => {
     if (chrome.runtime.lastError) {
       console.error(chrome.runtime.lastError);
       return;
     }
     // ... rest of code
   });
   
2. Wrap in try-catch:
   try {
     // timer logic
   } catch (error) {
     console.error('Timer error:', error);
   }
```

---

## Common Error Messages

### "Cannot read property of undefined"

**Likely Cause:** Storage state not initialized

**Solution:**
```javascript
// Always check result exists
chrome.storage.local.get(['timerState'], (result) => {
  if (result.timerState) {  // Add this check
    // Safe to use result.timerState
  }
});
```

### "Extension context invalidated"

**Cause:** Extension reloaded while popup was open

**Solution:**
- Close popup
- Reopen extension

### "Alarm already exists"

**Cause:** Trying to create alarm with duplicate name

**Solution:**
```javascript
// Clear before creating
chrome.alarms.clear('timer', () => {
  chrome.alarms.create('timer', { when: endTime });
});
```

---

## Testing Commands

### Useful Console Commands

**Check storage state:**
```javascript
chrome.storage.local.get(console.log)
```

**Clear all storage:**
```javascript
chrome.storage.local.clear()
```

**List all alarms:**
```javascript
chrome.alarms.getAll(console.log)
```

**Clear all alarms:**
```javascript
chrome.alarms.clearAll()
```

**Test notification:**
```javascript
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icons/icon48.png',
  title: 'Test',
  message: 'Testing'
})
```

**Force service worker restart:**
```
1. Go to chrome://extensions/
2. Find extension
3. Click "Service Worker" link
4. Close the console
5. Service worker will terminate
6. Click extension icon to wake it up
```

---

## Debug Mode Setup

Add this to popup.js for detailed logging:

```javascript
// At top of popup.js
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[POPUP]', ...args);
}

// Use throughout code:
log('Timer started with duration:', duration);
log('Storage state:', result.timerState);
```

Add this to background.js:

```javascript
// At top of background.js
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[BACKGROUND]', ...args);
}

// Use throughout code:
log('Timer interval update:', remainingSeconds);
log('Alarm fired:', alarm.name);
```

---

## When All Else Fails

### Nuclear Option: Complete Reset

```
1. Remove extension
   - chrome://extensions/
   - Click "Remove"
   
2. Close Chrome completely
   
3. Delete extension folder
   
4. Re-download/extract fresh copy
   
5. Reload extension
```

### Report Issue

If you find a bug not covered here:

1. Note the exact steps to reproduce
2. Check console for error messages
3. Note Chrome version (chrome://version/)
4. Check service worker logs
5. Test in incognito mode (isolates extension conflicts)

---

## Prevention Tips

✅ **Always reload after code changes**
- Click reload icon in chrome://extensions/

✅ **Check both consoles**
- Popup console (right-click popup → Inspect)
- Service worker console (Service Worker link)

✅ **Test edge cases**
- Very short timers (1 second)
- Very long timers (1 hour)
- Rapid start/pause/reset
- Multiple tabs with popup open

✅ **Clear storage between tests**
- Prevents state contamination
- `chrome.storage.local.clear()`

---

## Getting Help

If stuck, check in this order:

1. This troubleshooting guide
2. README.md (explanation of how things work)
3. ARCHITECTURE.md (design decisions)
4. Chrome Extension docs
5. Service worker console errors

Most issues are:
- Storage not persisting (check permissions)
- Intervals not running (check console)
- Alarms not firing (check chrome.alarms.getAll)

Happy debugging! 🐛
