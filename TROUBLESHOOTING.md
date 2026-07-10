# Troubleshooting Guide

## Common Issues and Solutions

### 1. Gmail Auto-Read Failed

**Error:** `⚠️ Gmail auto-read failed. Please enter code manually.`

**Causes:**
- Gmail not logged in
- Gmail selectors changed (Gmail UI updates)
- Email delivery delay
- Email in spam/promotions folder

**Solutions:**
1. **Ensure Gmail Login:**
   - Open Chrome with debugging enabled: `npm run chrome`
   - Navigate to https://mail.google.com
   - Login to your Gmail account
   - Keep the browser open

2. **Check Email Manually:**
   - Look for AWS verification email in inbox
   - Check Spam and Promotions folders
   - Wait 2-3 minutes for email delivery

3. **Manual Code Entry:**
   - When prompted, enter the 6-8 digit code manually
   - The automation will continue after you enter the code

4. **Debug Mode:**
   - Set `LOG_LEVEL=debug` in .env file
   - Re-run to see detailed Gmail scanning logs

### 2. Chrome Connection Failed

**Error:** `Chrome CDP connection failed`

**Solutions:**
1. **Launch Chrome Properly:**
   ```bash
   npm run chrome
   ```

2. **Manual Chrome Launch:**
   ```bash
   # Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-debug"

   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="~/chrome-debug"

   # Linux
   google-chrome --remote-debugging-port=9222 --user-data-dir="~/chrome-debug"
   ```

3. **Verify CDP is Running:**
   - Open: http://localhost:9222/json/version
   - Should show Chrome version info

4. **Kill Existing Chrome Processes:**
   - Close all Chrome windows
   - Check Task Manager/Activity Monitor for chrome.exe processes
   - Kill them and restart with debugging flag

### 3. Generate Encryption Key Not Working

**Error:** `Cannot find package 'commander'`

**Solutions:**
1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Generate Key:**
   ```bash
   npm run generate-key
   ```

3. **Copy Key to .env:**
   - Copy the generated 64-character hex key
   - Paste into .env file: `ENCRYPTION_KEY=<your_key_here>`

### 4. Rate Limit Exceeded

**Error:** `Rate limit exceeded. Reset in XX hours`

**Solutions:**
1. **Wait for Reset:**
   - Default limit: 10 accounts per 24 hours
   - This prevents AWS abuse detection

2. **Adjust Limit (Risky):**
   - Edit `.env`: `MAX_ACCOUNTS_PER_DAY=20`
   - Warning: Higher values may trigger AWS anti-abuse

3. **Skip Rate Limit (Very Risky):**
   ```bash
   npm start -- run -e your@gmail.com -m 3 --skip-rate-limit
   ```
   - Not recommended - AWS may flag your account

### 5. AWS Account Registration Failed

**Possible Causes:**
- AWS detected automation
- IP address flagged
- Too many accounts created too quickly
- Form selectors changed

**Solutions:**
1. **Increase Cooldown:**
   ```bash
   npm start -- run -e your@gmail.com -m 3 -c 600000
   ```
   - Use 10-15 minute cooldowns

2. **Use Proxy:**
   ```bash
   npm start -- run -e your@gmail.com -m 3 -p "socks5://proxy:1080"
   ```

3. **Reduce Daily Count:**
   - Create only 2-3 accounts per day
   - Wait 24 hours between batches

4. **Check AWS Status:**
   - Visit https://status.aws.amazon.com
   - AWS Builder ID service may be down

### 6. OAuth Handshake Timeout

**Error:** `OAuth flow timed out`

**Causes:**
- 9Router not running
- 9Router password incorrect
- Network issues
- Authorization not clicked in time

**Solutions:**
1. **Verify 9Router is Running:**
   ```bash
   # Check if 9Router is accessible
   curl http://localhost:20128
   ```

2. **Check 9Router Password:**
   - Update `.env`: `ROUTER_PASSWORD=your_actual_password`

3. **Manual Authorization:**
   - If auto-authorization fails, click "Confirm and continue" manually
   - The system polls 9Router for completion

4. **Increase Timeout:**
   - Edit `config/default.json`:
   ```json
   "maxAuthAttempts": 120
   ```

### 7. Database Locked

**Error:** `Database is locked`

**Solutions:**
1. **Close Other Instances:**
   - Only run one instance of the automation
   - Check for zombie processes:
   ```bash
   # Windows
   tasklist | findstr node

   # macOS/Linux
   ps aux | grep node
   ```

2. **Delete Lock File (if exists):**
   ```bash
   rm ~/.9router/data.db-wal
   rm ~/.9router/data.db-shm
   ```

### 8. Missing Configuration

**Error:** `Configuration validation failed`

**Solutions:**
1. **Create .env File:**
   ```bash
   cp .env.example .env
   ```

2. **Fill Required Values:**
   ```bash
   ROUTER_PASSWORD=your_password
   ENCRYPTION_KEY=<run: npm run generate-key>
   ```

3. **Verify Configuration:**
   ```bash
   npm start -- status
   ```

## Debug Mode

Enable detailed logging:

```bash
# In .env file
LOG_LEVEL=debug
```

Run with debug output:
```bash
npm start -- run -e your@gmail.com -m 1 2>&1 | tee debug.log
```

## Getting Help

If issues persist:

1. **Check Logs:**
   - Location: `./logs/app.log`
   - Review for specific error messages

2. **Database Status:**
   ```bash
   npm start -- status
   ```

3. **View Recent Logs:**
   ```bash
   npm start -- logs -l 50
   ```

4. **Create GitHub Issue:**
   - Include: error message, logs, steps to reproduce
   - https://github.com/your-username/9router-kiro-automator/issues

## Prevention Tips

1. **Start Small:**
   - Test with 1 account first
   - Verify entire flow works before scaling

2. **Monitor Rate Limits:**
   - Stay within daily limits
   - Use longer cooldowns for safety

3. **Keep Browser Open:**
   - Don't close Chrome while automation runs
   - Keep Gmail logged in

4. **Backup Database:**
   ```bash
   npm start -- backup
   ```

5. **Update Regularly:**
   - Gmail UI changes require selector updates
   - Keep the tool updated

## Performance Tips

1. **Optimal Cooldown:**
   - 5-10 minutes is ideal balance
   - Longer = safer but slower

2. **Best Time to Run:**
   - Off-peak hours (night/early morning)
   - Less AWS traffic = better success rate

3. **Network Quality:**
   - Stable internet connection required
   - VPN/proxy may slow down process
