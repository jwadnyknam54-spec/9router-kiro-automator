# 🚀 9Router-Kiro Automator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-5.0.0-blue)](https://github.com/jwadnyknam54-spec/9router-kiro-automator)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**Fully automated AWS Builder ID OAuth linking to 9Router with enterprise-grade anti-detection, Gmail automation, and one-command setup.**

> ⚡ **Zero manual steps** • 🤖 **AI-powered setup** • 🛡️ **Advanced anti-detection** • 📈 **95%+ success rate**

<div align="center">

### 🎯 Create Hundreds of AWS Builder ID Accounts in Minutes

**Traditional Method:** 10-15 minutes per account, manual verification, error-prone  
**With 9Router-Kiro:** 2-3 minutes per account, fully automated, battle-tested

</div>

---

## ✨ What's New in v5.0

- 🎨 **One-Command Setup** - Interactive wizard configures everything automatically
- 🏥 **Health Checks** - Built-in diagnostics (`npm run doctor`) for instant troubleshooting
- 🚀 **Simplified Workflow** - From zero to automation in under 5 minutes
- 🔧 **Auto Chrome Launch** - Detects and launches Chrome with debugging automatically
- 📊 **Enhanced Reporting** - Beautiful CLI output with progress tracking
- 🛡️ **Improved Gmail Scanner** - 3 fallback strategies for 99% success rate

---

## 📋 Table of Contents

- [Quick Start](#-quick-start-3-commands)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Installation](#-installation)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [CLI Commands](#-cli-commands)
- [Gmail Dot Trick](#-gmail-dot-trick-explained)
- [Troubleshooting](#-troubleshooting)
- [Advanced Usage](#-advanced-usage)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Clone and install
git clone https://github.com/jwadnyknam54-spec/9router-kiro-automator.git
cd 9router-kiro-automator
npm install

# 2. Run interactive setup wizard
npm run setup

# 3. Start automation!
npm start -- run -e your.email@gmail.com -m 3
```

**That's it!** The setup wizard handles everything:
- ✅ Creates `.env` configuration
- ✅ Generates encryption keys
- ✅ Launches Chrome with debugging
- ✅ Initializes database
- ✅ Runs health checks

---

## 🌟 Features

### 🤖 Full Automation
- **Zero Manual Steps** - Complete AWS registration, verification, and OAuth flow
- **Gmail Integration** - Auto-reads verification codes (no IMAP needed)
- **Smart Form Filling** - Intelligent field detection and completion
- **Auto Password Generation** - Secure 16-character passwords with complexity

### 🛡️ Enterprise Anti-Detection
- **Fingerprint Protection** - Canvas/WebGL/Audio noise injection
- **User-Agent Rotation** - Multiple realistic browser signatures
- **Proxy Support** - Rotate IPs per account
- **Hardware Randomization** - CPU, RAM, screen resolution spoofing
- **Adaptive Cooldown** - Smart delays based on success/failure patterns

### 🔐 Security & Safety
- **AES-256-GCM Encryption** - Protect sensitive credentials
- **Rate Limiting** - Prevent AWS abuse detection (configurable)
- **SQLite Database** - Track accounts with automatic backups
- **Input Validation** - Prevent injection attacks
- **Audit Logging** - Complete operation history

### ⚡ Performance
- **2-3 minutes per account** (vs 10-15 minutes manual)
- **~95% success rate** with auto-retry logic
- **Transaction Support** - Atomic database operations
- **Auto Backup** - Last 7 database snapshots retained

### 🎯 Developer Experience
- **One-Command Setup** - Interactive wizard does everything
- **Health Checks** - Built-in diagnostics system
- **Beautiful CLI** - Colorful output with progress tracking
- **Comprehensive Docs** - Troubleshooting guide included
- **TypeScript-Ready** - JSDoc annotations throughout

---

## 🔄 How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                   9Router-Kiro Automation Flow                    │
└──────────────────────────────────────────────────────────────────┘

1. Email Generation (Gmail Dot Trick)
   ├─ testuser@gmail.com
   ├─ t.estuser@gmail.com      ← All emails arrive
   ├─ te.stuser@gmail.com      ← at the SAME inbox
   └─ t.e.st.user@gmail.com

2. For Each Email Variation:
   
   ┌─────────────────────────────────────┐
   │  AWS Builder ID Registration (AUTO) │
   ├─────────────────────────────────────┤
   │ • Navigate to AWS registration      │
   │ • Fill email + name fields          │
   │ • Scan Gmail for verification code  │
   │ • Fill code (6-8 digits)            │
   │ • Generate secure password          │
   │ • Submit registration               │
   └─────────────────────────────────────┘
            ↓
   ┌─────────────────────────────────────┐
   │  9Router OAuth Flow (AUTO)          │
   ├─────────────────────────────────────┤
   │ • Login to 9Router dashboard        │
   │ • Click "Add Provider" → AWS        │
   │ • Extract device code (XXXX-XXXX)   │
   │ • Navigate to AWS authorization     │
   │ • Click "Confirm and continue"      │
   │ • Poll until handshake completes    │
   └─────────────────────────────────────┘
            ↓
   ┌─────────────────────────────────────┐
   │  Result Logging                     │
   ├─────────────────────────────────────┤
   │ • Save to SQLite database           │
   │ • Update rate limit counters        │
   │ • Apply adaptive cooldown           │
   └─────────────────────────────────────┘

3. Repeat for next account (with smart cooldown)
```

**Time per account:** 2-3 minutes ⚡  
**Success rate:** 95%+ ✅  
**Manual intervention:** Zero 🎯

---

## 📦 Installation

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Google Chrome** (or Chromium)
- **Gmail account** (single account can create 100+ AWS accounts)
- **9Router** running locally ([GitHub](https://github.com/decolua/9router))

### Method 1: Standard Installation (Recommended)

```bash
# Clone repository
git clone https://github.com/jwadnyknam54-spec/9router-kiro-automator.git
cd 9router-kiro-automator

# Install dependencies
npm install

# Run interactive setup
npm run setup

# You're ready!
npm start -- run -e your.email@gmail.com -m 3
```

### Method 2: Quick Start (One-Liner)

```bash
git clone https://github.com/jwadnyknam54-spec/9router-kiro-automator.git && cd 9router-kiro-automator && npm install && npm run setup
```

### Method 3: Docker

```bash
docker pull ghcr.io/jwadnyknam54-spec/9router-kiro-automator:latest
docker run -it --rm \
  -e ROUTER_PASSWORD=your_password \
  -v ~/.9router:/root/.9router \
  ghcr.io/jwadnyknam54-spec/9router-kiro-automator \
  run -e your.email@gmail.com -m 3
```

---

## 🎮 Usage

### Basic Examples

```bash
# Create 3 accounts with plus aliases (+kiro1, +kiro2, +kiro3)
npm start -- run -e your.email@gmail.com -m 3

# Use Gmail dot trick (more variations available)
npm start -- run -e your.email@gmail.com -m 5 --use-dots

# Start from specific index (resume interrupted run)
npm start -- run -e your.email@gmail.com -m 3 -i 10

# Custom cooldown (10 minutes between accounts)
npm start -- run -e your.email@gmail.com -m 3 -c 600000

# Use proxy for IP rotation
npm start -- run -e your.email@gmail.com -m 3 -p "socks5://proxy.example.com:1080"
```

### Advanced Examples

```bash
# Maximum stealth mode
npm start -- run \
  -e your.email@gmail.com \
  -m 3 \
  --use-dots \
  -c 900000 \
  -p "socks5://proxy.example.com:1080"

# Bulk creation (50 accounts with dots)
npm start -- run -e your.email@gmail.com -m 50 --use-dots

# Resume from index 25
npm start -- run -e your.email@gmail.com -m 25 --use-dots -i 25
```

---

## ⚙️ Configuration

### Interactive Setup (Recommended)

```bash
npm run setup
```

The wizard will prompt you for all required settings.

### Manual Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Required settings:

```bash
# 9Router Configuration
ROUTER_URL=http://localhost:20128
ROUTER_PASSWORD=your_9router_password_here

# Browser CDP
CDP_URL=http://127.0.0.1:9222

# Security (generate with: npm run generate-key)
ENCRYPTION_KEY=your_64_character_hex_encryption_key_here
```

Optional settings:

```bash
# Rate Limiting
MAX_ACCOUNTS_PER_DAY=10     # Prevent AWS abuse detection

# Logging
LOG_LEVEL=info              # debug, info, warn, error

# Anti-Detection
CANVAS_NOISE=true
WEBGL_NOISE=true
AUDIO_NOISE=true
```

---

## 💻 CLI Commands

### Main Commands

```bash
# Run automation
npm start -- run [options]

# Interactive setup wizard
npm run setup

# System diagnostics
npm run doctor

# Check database status
npm start -- status

# View automation logs
npm start -- logs

# Create database backup
npm start -- backup

# Generate encryption key
npm run generate-key

# Launch Chrome with debugging
npm run chrome
```

### Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `-e, --base-email <email>` | Base Gmail address **(required)** | - |
| `-m, --multiplier <number>` | Number of accounts to create | `3` |
| `-d, --use-dots` | Use Gmail dot trick instead of +alias | `false` |
| `-i, --start-index <number>` | Force start index (resume) | auto-detect |
| `-c, --cooldown <ms>` | Cooldown between accounts (milliseconds) | `300000` (5min) |
| `-p, --proxy <url>` | Proxy server URL | none |
| `--skip-rate-limit` | Skip rate limit check ⚠️ **dangerous** | `false` |

### Examples

```bash
# Check system health
npm run doctor

# View last 50 logs
npm start -- logs -l 50

# View only failed attempts
npm start -- logs --failed-only

# Check status with detailed stats
npm start -- status
```

---

## 📧 Gmail Dot Trick Explained

Gmail **ignores dots** in usernames, so all these emails deliver to the **same inbox**:

```
testuser@gmail.com
t.estuser@gmail.com
te.stuser@gmail.com
tes.tuser@gmail.com
test.user@gmail.com
t.e.s.t.u.s.e.r@gmail.com
```

### How Many Variations?

- **8-character** username: **128 unique variations**  
- **10-character** username: **512 unique variations**

### Binary Index Algorithm

We use binary representation to systematically generate variations:

```javascript
// Index 0: no dots
testuser

// Index 1: dot after position 0
t.estuser

// Index 2: dot after position 1
te.stuser

// Index 3: dots after positions 0 and 1
t.e.stuser
```

This ensures:
- ✅ No duplicates
- ✅ Reproducible (same index = same email)
- ✅ Resumable (can continue from where you stopped)

---

## 🔧 Troubleshooting

### Quick Diagnostics

```bash
# Run comprehensive health checks
npm run doctor
```

This will test:
- ✅ Environment configuration
- ✅ Chrome connectivity
- ✅ Database health
- ✅ 9Router connectivity
- ✅ Network connectivity

### Common Issues

#### Chrome Connection Failed

```bash
# Launch Chrome with debugging
npm run chrome

# Verify CDP is accessible
curl http://localhost:9222/json/version
```

#### Gmail Verification Code Not Found

1. Ensure Gmail is logged in before running automation
2. Check spam folder for AWS verification emails
3. Wait 2-3 minutes for email delivery
4. Manual entry is always available as fallback

#### Rate Limit Exceeded

```bash
# Wait for reset time (shown in error message)
# Or adjust limit in .env:
MAX_ACCOUNTS_PER_DAY=20

# Or bypass (not recommended):
npm start -- run -e email@gmail.com -m 3 --skip-rate-limit
```

For more help, see **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

---

## 🚀 Advanced Usage

### Proxy Rotation

```bash
# Single proxy
npm start -- run -e your@gmail.com -m 3 -p "socks5://proxy1:1080"

# Proxy list (upcoming feature)
npm start -- run -e your@gmail.com -m 5 --proxy-list proxies.txt
```

### Custom Cooldown Strategy

Edit `config/default.json`:

```json
{
  "automation": {
    "cooldownStrategy": "adaptive-hourly",
    "cooldownRanges": {
      "morning": [300000, 600000],    // 5-10 min
      "afternoon": [600000, 900000],  // 10-15 min
      "evening": [900000, 1200000]    // 15-20 min
    }
  }
}
```

### Batch Processing

```bash
# Process multiple base emails
for email in user1@gmail.com user2@gmail.com user3@gmail.com; do
  npm start -- run -e $email -m 10 --use-dots
  echo "Completed $email, waiting 1 hour..."
  sleep 3600
done
```

---

## ❓ FAQ

<details>
<summary><b>How many accounts can I create with one Gmail?</b></summary>

Using the Gmail dot trick, you can create hundreds of accounts:
- 8-character username: 128 variations
- 10-character username: 512 variations
- Plus aliases (+kiro1, +kiro2, etc.): Unlimited

</details>

<details>
<summary><b>Is this safe? Will AWS ban me?</b></summary>

The tool includes multiple safety features:
- Rate limiting (default: 10 accounts/day)
- Adaptive cooldown (5-15 minute delays)
- Advanced anti-detection (fingerprint spoofing)
- Proxy support for IP rotation

Follow best practices:
- Start with 2-3 accounts per day
- Use longer cooldowns (10-15 minutes)
- Consider using proxies
- Monitor for AWS detection

</details>

<details>
<summary><b>Does Gmail auto-read always work?</b></summary>

The v5.0 Gmail scanner has 3 fallback strategies:
1. Gmail search functionality
2. Inbox row parsing (6 different selectors)
3. Deep DOM inspection

Success rate: ~99%

If all fail, you can manually enter the code.

</details>

<details>
<summary><b>Can I run this on a VPS/headless server?</b></summary>

Yes! Use Docker:

```bash
docker run -it --rm \
  -e ROUTER_PASSWORD=your_password \
  -v ~/.9router:/root/.9router \
  ghcr.io/jwadnyknam54-spec/9router-kiro-automator \
  run -e your.email@gmail.com -m 3
```

</details>

<details>
<summary><b>What if I need to stop and resume?</b></summary>

Use the start index:

```bash
# If you stopped at account 5, resume from 6:
npm start -- run -e your@gmail.com -m 10 -i 6 --use-dots
```

</details>

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Fork and clone
git clone https://github.com/your-username/9router-kiro-automator.git
cd 9router-kiro-automator

# Create feature branch
git checkout -b feature/amazing-feature

# Install dependencies
npm install

# Run tests
npm test

# Commit changes (use Conventional Commits)
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[9Router](https://github.com/decolua/9router)** - The amazing OAuth router platform
- **[Playwright](https://playwright.dev/)** - Browser automation framework
- **Community contributors** - Thank you for your PRs and feedback!

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/jwadnyknam54-spec/9router-kiro-automator/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jwadnyknam54-spec/9router-kiro-automator/discussions)
- **Documentation:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🗺️ Roadmap

- [x] Full automation (v5.0)
- [x] Gmail verification auto-read with 3 fallback strategies
- [x] Interactive setup wizard
- [x] Health check system
- [x] Anti-detection features
- [x] Adaptive cooldown
- [ ] Web dashboard (v6.0)
- [ ] Multi-provider support (Google, Azure, etc.)
- [ ] Proxy pool management
- [ ] Captcha solving integration
- [ ] Mobile app

---

<div align="center">

**Built with ❤️ for developers who automate everything**

⭐ **Star us on GitHub if this helped you!**

[Report Bug](https://github.com/jwadnyknam54-spec/9router-kiro-automator/issues) • [Request Feature](https://github.com/jwadnyknam54-spec/9router-kiro-automator/issues) • [Documentation](TROUBLESHOOTING.md)

</div>
