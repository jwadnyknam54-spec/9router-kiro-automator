# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 5.0.x   | :white_check_mark: |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@example.com**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Security Best Practices

### Credential Storage

1. **Never commit `.env` files** to version control
   ```bash
   # Always in .gitignore
   .env
   .env.local
   ```

2. **Generate strong encryption keys**
   ```bash
   npm run generate-key
   # Use the generated 64-character hex key in .env
   ```

3. **Secure your database**
   ```bash
   # Set restrictive permissions on database file
   chmod 600 ~/.9router/data.db
   
   # Encrypt backups if storing remotely
   ```

4. **Protect Chrome debug port**
   - Only bind to localhost (127.0.0.1)
   - Don't expose port 9222 to network
   - Use firewall rules if needed

### Rate Limiting

1. **Respect AWS limits**
   - Default: 10 accounts/day
   - Increase cautiously (may trigger detection)
   
2. **Use adaptive cooldown**
   - Minimum 5 minutes between accounts
   - 10-15 minutes recommended for stealth

3. **Monitor for abuse detection**
   - Check logs for "suspicious activity" errors
   - Pause automation if detected
   - Wait 24 hours before retrying

### Proxy Usage

1. **Use residential proxies** (not datacenter IPs)
2. **Rotate proxies per account**
3. **Verify proxy security**
   - HTTPS/SOCKS5 with authentication
   - Trusted proxy providers only

### Anti-Detection

1. **Keep anti-detection enabled**
   ```bash
   # In .env
   ANTI_DETECTION_ENABLED=true
   CANVAS_NOISE=true
   WEBGL_NOISE=true
   AUDIO_NOISE=true
   ```

2. **Use realistic patterns**
   - Random delays
   - Natural cooldowns
   - Varied timing

3. **Limit daily creation**
   - Max 2-3 accounts/day for stealth
   - Higher rates increase detection risk

## Known Security Considerations

### Chrome DevTools Protocol (CDP)

- **Risk**: CDP exposes browser control
- **Mitigation**: Only bind to localhost
- **Alternative**: Use headless mode (reduces anti-detection effectiveness)

### Gmail Access

- **Risk**: Requires Gmail login in Chrome
- **Mitigation**: 
  - Use dedicated Gmail account
  - Enable 2FA
  - Review connected devices regularly

### Database Encryption

- **Current**: Credentials encrypted with AES-256-GCM
- **Future**: Full database encryption planned

### Proxy Credentials

- **Risk**: Proxy credentials in .env (plaintext)
- **Mitigation**: 
  - Restrict .env file permissions
  - Use environment-specific credentials
  - Rotate credentials regularly

## Vulnerability Disclosure Timeline

1. **Day 0**: Security issue reported
2. **Day 1-2**: Acknowledgment sent
3. **Day 3-7**: Issue validated and severity assessed
4. **Day 7-30**: Patch developed and tested
5. **Day 30**: Patch released (coordinated disclosure)
6. **Day 30+**: Public disclosure (if applicable)

## Security Updates

We will notify users of security updates through:

1. **GitHub Security Advisories**
2. **CHANGELOG.md** entries
3. **Release notes**
4. **Email notifications** (for critical vulnerabilities)

## Contact

- **Security issues**: security@example.com
- **General questions**: security@example.com
- **PGP Key**: Available upon request

## Bug Bounty

We currently do not have a bug bounty program, but we greatly appreciate responsible disclosure and will acknowledge contributors in our CHANGELOG.

---

**Last updated**: 2026-07-10
