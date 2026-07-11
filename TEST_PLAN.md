# Test Plan - Critical Bug Fixes

## Pre-Test Setup

### 1. Environment Check
```bash
# Verify Node.js version
node --version  # Should be >= 18

# Install dependencies (if needed)
npm install

# Check Chrome is installed
where chrome

# Verify .env configuration
cat .env
```

### 2. Required Configuration
Ensure `.env` has:
```
ROUTER_URL=http://localhost:20128
ROUTER_PASSWORD=your_password
CDP_URL=http://127.0.0.1:9222
ENCRYPTION_KEY=<64-char-hex>
```

### 3. Start Prerequisites
```bash
# Start 9Router
# (Run in separate terminal)

# Launch Chrome with debugging
npm run chrome
```

---

## Test Suite

### ✅ Test 1: Syntax Validation
**Goal:** Ensure no syntax errors in modified files

```bash
node --check src/core/engine.js
node --check src/automation/index.js
node --check src/automation/aws-automator.js
node --check src/automation/gmail-session.js
```

**Expected:** All files pass without errors

---

### ✅ Test 2: Application Startup
**Goal:** Verify app doesn't crash on startup (tests limit bug fix)

```bash
npm start -- run -e test@gmail.com -m 1 --skip-rate-limit
```

**Expected:** 
- ✅ No crash from undefined `limit` variable
- ✅ App initializes successfully
- ✅ Browser connects
- ✅ Gmail session initialization prompt appears

**Stop after:** Gmail session initialization starts (Ctrl+C)

---

### ✅ Test 3: Gmail Session Initialization
**Goal:** Verify one-time Gmail login works

```bash
npm start -- run -e youremail@gmail.com -m 1 --skip-rate-limit
```

**Manual Steps:**
1. Wait for "Gmail login required" message
2. Login to Gmail in the opened Chrome tab
3. Wait for "Gmail session initialized and ready" message

**Expected:**
- ✅ Gmail opens in separate tab
- ✅ Login prompt appears ONCE only
- ✅ After login, automation continues
- ✅ No repeated login prompts

---

### ✅ Test 4: AWS Registration Flow
**Goal:** Verify AWS pages don't navigate to Gmail (tests architecture fix)

```bash
npm start -- run -e youremail@gmail.com -m 1 --skip-rate-limit
```

**Watch for:**
- AWS registration page opens
- AWS page STAYS on aws.amazon.com
- Gmail tab refreshes separately
- Verification code is found
- AWS registration completes

**Expected:**
- ✅ AWS page never navigates to Gmail
- ✅ Gmail scanning happens in separate tab
- ✅ Verification code is extracted
- ✅ Registration completes successfully

---

### ✅ Test 5: Multiple Accounts Sequential
**Goal:** Verify no login loops in multi-account runs

```bash
npm start -- run -e youremail@gmail.com -m 3 --skip-rate-limit
```

**Expected:**
- ✅ Gmail login happens ONCE at start
- ✅ All 3 accounts process without additional logins
- ✅ No "Gmail login required" messages after initialization
- ✅ Cooldown applies between accounts
- ✅ All accounts complete successfully

**Duration:** ~10-15 minutes (with cooldowns)

---

### ✅ Test 6: Rate Limiting Works
**Goal:** Verify rate limit fix doesn't break rate limiting

```bash
# Without skip-rate-limit flag
npm start -- run -e youremail@gmail.com -m 2
```

**Expected:**
- ✅ Rate limit check runs
- ✅ No crash from undefined variable
- ✅ Shows remaining accounts allowed
- ✅ Respects daily limit

---

### ✅ Test 7: Gmail Session Recovery
**Goal:** Test resilience when Gmail tab is closed

**Steps:**
1. Start automation: `npm start -- run -e youremail@gmail.com -m 2 --skip-rate-limit`
2. After first account completes, manually close Gmail tab
3. Let second account run

**Expected:**
- ✅ Detects Gmail page closed
- ✅ Automatically reinitializes Gmail session
- ✅ May prompt for login again (acceptable)
- ✅ Second account completes successfully

---

### ✅ Test 8: Manual Code Entry Fallback
**Goal:** Verify manual entry works when auto-read fails

**Steps:**
1. Start with email that has no AWS verification in inbox
2. Wait for timeout
3. Enter code manually when prompted

**Expected:**
- ✅ Auto-read attempts for ~3 minutes
- ✅ Prompts for manual entry on failure
- ✅ Accepts manual code entry
- ✅ Continues with registration

---

### ✅ Test 9: Dot Trick Variations
**Goal:** Ensure email variations still work

```bash
npm start -- run -e youremail@gmail.com -m 3 --use-dots --skip-rate-limit
```

**Expected:**
- ✅ Generates dot variations correctly
- ✅ Each variation creates separate AWS account
- ✅ All variations process successfully

---

### ✅ Test 10: Plus Alias Variations
**Goal:** Ensure plus aliases still work

```bash
npm start -- run -e youremail@gmail.com -m 3 --skip-rate-limit
```

**Expected:**
- ✅ Generates +kiro1, +kiro2, +kiro3 variations
- ✅ Each variation creates separate AWS account
- ✅ All variations process successfully

---

### ✅ Test 11: Interrupted Run Resume
**Goal:** Test resuming from specific index

**Steps:**
1. Start: `npm start -- run -e youremail@gmail.com -m 5 --use-dots --skip-rate-limit`
2. Interrupt (Ctrl+C) after 2 accounts complete
3. Resume: `npm start -- run -e youremail@gmail.com -m 3 --use-dots -i 3 --skip-rate-limit`

**Expected:**
- ✅ Resumes from index 3
- ✅ Doesn't recreate accounts 0-2
- ✅ Creates accounts 3, 4, 5
- ✅ Gmail session reinitializes successfully

---

### ✅ Test 12: Error Handling
**Goal:** Test graceful failure scenarios

**Test 12a: Wrong Router Password**
```bash
# Temporarily change ROUTER_PASSWORD in .env to wrong value
npm start -- run -e youremail@gmail.com -m 1 --skip-rate-limit
```
**Expected:** Clear error message, no crash

**Test 12b: Gmail Not Logged In + Timeout**
```bash
# Don't login to Gmail during 3-minute wait
npm start -- run -e youremail@gmail.com -m 1 --skip-rate-limit
```
**Expected:** Times out gracefully, offers manual entry

**Test 12c: Chrome Not Running**
```bash
# Close all Chrome instances
npm start -- run -e youremail@gmail.com -m 1 --skip-rate-limit
```
**Expected:** Auto-launches Chrome or shows clear error

---

## Performance Benchmarks

### Before Fixes
- Per-account time: 15-20 minutes (with login waits)
- Gmail login prompts: Every 2-3 minutes
- Success rate: ~30% (due to context loss)

### After Fixes (Expected)
- Per-account time: 2-3 minutes
- Gmail login prompts: Once per session
- Success rate: ~95%

---

## Regression Tests

### Database Operations
```bash
# After successful run, check database
npm start -- status
npm start -- logs -l 20
```

**Expected:**
- ✅ Providers saved correctly
- ✅ Logs recorded accurately
- ✅ Timestamps correct

### Anti-Detection Features
**Verify in browser:**
- Canvas fingerprinting active
- WebGL noise injection working
- User agent rotation happening

### Proxy Support
```bash
npm start -- run -e youremail@gmail.com -m 1 -p "socks5://proxy:1080" --skip-rate-limit
```

**Expected:**
- ✅ Proxy applied to pages
- ✅ Gmail and AWS work through proxy

---

## Success Criteria

### Must Pass (Blockers)
- [ ] ✅ No crashes from undefined variables
- [ ] ✅ Gmail login happens ONCE per session
- [ ] ✅ AWS pages don't navigate to Gmail
- [ ] ✅ Verification codes extracted successfully
- [ ] ✅ Multiple accounts complete without login loops

### Should Pass (Important)
- [ ] ✅ Rate limiting works without crashes
- [ ] ✅ Session recovery works after Gmail tab closes
- [ ] ✅ Manual code entry fallback works
- [ ] ✅ Dot trick and plus aliases work
- [ ] ✅ Resume from index works

### Nice to Have
- [ ] ✅ Performance meets benchmarks
- [ ] ✅ Proxy support still works
- [ ] ✅ Database operations work
- [ ] ✅ Error messages are clear

---

## Rollback Plan

If critical issues found:
```bash
# Revert changes
git reset --hard a733baf

# Or revert specific commits
git revert <commit-hash>
```

**Rollback triggers:**
- Application crashes consistently
- Data loss or corruption
- Security vulnerabilities introduced
- Success rate < 50%

---

## Sign-Off

### Tested By: _______________
### Date: _______________
### Environment: _______________

### Results Summary:
- Tests Passed: ___ / 12
- Critical Issues: ___ 
- Blocking Issues: ___
- Nice-to-Have Issues: ___

### Recommendation:
- [ ] ✅ Approve for production
- [ ] ⚠️ Approve with noted issues
- [ ] ❌ Requires additional fixes

### Notes:
```
<space for notes>
```
