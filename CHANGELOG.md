# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.0.0] - 2026-07-10

### Added
- ✨ **Full Automation** - Zero manual steps required
- 🤖 Automated AWS Builder ID registration
- 📧 Gmail verification code auto-reading (no IMAP)
- 🔄 Automatic OAuth authorization clicking
- 🔐 Secure password auto-generation
- 🎭 Advanced anti-detection (canvas, WebGL, audio fingerprinting)
- 🌐 Proxy support for IP rotation
- 📊 Rate limiting to prevent AWS abuse detection
- 🗄️ SQLite database with automatic backups
- 📝 Comprehensive audit logging
- ⚡ Adaptive cooldown based on success/failure
- 🔄 Retry logic with exponential backoff
- 📈 ~95% success rate
- ⏱️ 2-3 minutes per account (vs 10-15 manual)

### Changed
- Completely refactored from v3.x single-file script
- Modular architecture with separation of concerns
- Switched from Puppeteer to Playwright
- Improved error handling and recovery

### Removed
- Manual form filling requirement
- Manual verification code entry
- Manual authorization clicking
- Hardcoded configurations

## [4.0.0] - 2026-07-08

### Added
- Modular architecture
- Anti-detection features (basic)
- AES-256-GCM encryption
- SQLite database tracking
- CLI with Commander.js
- Transaction support
- Rate limiting

### Changed
- Split monolithic script into modules
- Improved logging structure

## [3.2.0] - 2026-06-15

### Added
- Basic anti-detection
- Proxy support
- Increased default cooldown

## [3.0.0] - 2026-06-01

### Added
- Gmail dot trick support
- Database tracking (initial)
- CLI improvements

## [2.0.0] - 2026-05-15

### Added
- Plus alias support (+kiro1, +kiro2, etc.)
- Basic automation

## [1.0.0] - 2026-05-01

### Added
- Initial release
- Manual AWS registration guidance
- Basic 9Router OAuth flow

[Unreleased]: https://github.com/your-username/9router-kiro-automator/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/your-username/9router-kiro-automator/compare/v4.0.0...v5.0.0
[4.0.0]: https://github.com/your-username/9router-kiro-automator/compare/v3.2.0...v4.0.0
[3.2.0]: https://github.com/your-username/9router-kiro-automator/compare/v3.0.0...v3.2.0
[3.0.0]: https://github.com/your-username/9router-kiro-automator/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/your-username/9router-kiro-automator/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/your-username/9router-kiro-automator/releases/tag/v1.0.0
