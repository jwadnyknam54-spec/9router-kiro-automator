# 🚀 Quick Start Guide

Get up and running with 9Router-Kiro Automator in under 5 minutes!

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **Google Chrome** installed
- [ ] **Gmail account** (single account = 100+ AWS accounts)
- [ ] **9Router instance** running at `http://localhost:20128`

## Installation (2 minutes)

### Option 1: NPM (Recommended)

```bash
npm install -g 9router-kiro-automator
```

### Option 2: From Source

```bash
git clone https://github.com/your-username/9router-kiro-automator.git
cd 9router-kiro-automator
npm install
```

## Setup (2 minutes)

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Edit `.env` File

Open `.env` and set your 9Router password:

```bash
ROUTER_PASSWORD=your_9router_password_here
```

### 3. Generate Encryption Key

```bash
npm run generate-key
```

Copy the generated key and add it to `.env`:

```bash
ENCRYPTION_KEY=your_generated_key_here
```

## First Run (1 minute)

### 1. Start Chrome with Debugging

```bash
npm run chrome
```

This opens Chrome with debugging enabled.

### 2. Login to Gmail

In the Chrome window that just opened:
1. Go to [gmail.com](https://gmail.com)
2. Login with your Gmail account
3. Leave Chrome running

### 3. Run Your First Automation

```bash
npm start -- run -e your.email@gmail.com -m 3
```

Replace `your.email@gmail.com` with your actual Gmail address.

## What Happens Next?

The automation will:

1. ✅ **Create 3 AWS Builder ID accounts** (automatic)
2. ✅ **Read verification codes from Gmail** (automatic)
3. ✅ **Link accounts to 9Router** (automatic)
4. ✅ **Save credentials securely** (encrypted)

**Time:** ~6-9 minutes total (2-3 minutes per account)

## Verify Success

```bash
# Check database status
npm start -- status

# View automation logs
npm start -- logs
```

You should see 3 active providers!

## Common Issues

### "Chrome CDP connection failed"

**Solution:** Make sure Chrome is running with debugging:
```bash
npm run chrome
```

### "Verification code not found"

**Solution:** 
1. Make sure you're logged into Gmail in Chrome
2. Check Gmail inbox manually for AWS email
3. Wait 2-3 minutes for email delivery

### "Rate limit exceeded"

**Solution:** Wait for the reset time (24-hour window), or adjust in `.env`:
```bash
MAX_ACCOUNTS_PER_DAY=10  # Increase cautiously
```

## Next Steps

### Create More Accounts

```bash
# Create 10 more accounts
npm start -- run -e your.email@gmail.com -m 10

# Use Gmail dot trick for more variations
npm start -- run -e your.email@gmail.com -m 10 --use-dots
```

### Advanced Options

```bash
# Stealth mode (longer cooldown)
npm start -- run -e your.email@gmail.com -m 5 -c 600000

# With proxy
npm start -- run -e your.email@gmail.com -m 5 -p "socks5://proxy:1080"

# Resume from specific index
npm start -- run -e your.email@gmail.com -m 5 -i 10
```

### Monitor & Manage

```bash
# View last 50 logs
npm start -- logs -l 50

# View only failures
npm start -- logs --failed-only

# Create manual backup
npm start -- backup
```

## Tips for Success

### 🎯 Best Practices

1. **Start Small** - Test with 1-3 accounts first
2. **Use Cooldown** - Minimum 5 minutes between accounts
3. **Check Logs** - Monitor for "suspicious activity" errors
4. **Backup Regularly** - Database backups are automatic, but manual is good

### ⚡ Performance Tips

1. **Gmail Dot Trick** - More variations available:
   ```bash
   npm start -- run -e your.email@gmail.com -m 20 --use-dots
   ```

2. **Multiple Gmail Accounts** - Use different base emails:
   ```bash
   npm start -- run -e first@gmail.com -m 10
   npm start -- run -e second@gmail.com -m 10
   ```

3. **Rate Limiting** - Max 10/day by default (adjustable):
   ```bash
   # In .env
   MAX_ACCOUNTS_PER_DAY=10
   ```

### 🛡️ Security Tips

1. **Protect `.env`** - Never commit to git
2. **Secure Database** - Stored at `~/.9router/data.db`
3. **Review Logs** - Check for unusual patterns
4. **Use Proxies** - For bulk creation

## Troubleshooting

### Full Debug Mode

```bash
# In .env
DEBUG_MODE=true
```

This enables:
- Verbose logging
- Screenshot capture on errors
- Full request/response logs

### Reset Everything

```bash
# Backup first!
npm start -- backup

# Remove database (start fresh)
rm ~/.9router/data.db

# Regenerate encryption key
npm run generate-key
```

## Need Help?

- **Documentation:** [README.md](README.md)
- **Issues:** [GitHub Issues](https://github.com/your-username/9router-kiro-automator/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-username/9router-kiro-automator/discussions)

## What's Next?

Check out:
- [Advanced Usage](README.md#-advanced-usage)
- [API Documentation](README.md#-api-documentation)
- [Contributing Guide](CONTRIBUTING.md)

---

**Happy Automating!** 🎉

Built with ❤️ for developers who code 24/7
