# Contributing to 9Router-Kiro Automator

First off, thank you for considering contributing to 9Router-Kiro Automator! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing](#testing)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** and **description**
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Node.js version, Chrome version)
- **Screenshots** or **logs** if applicable

**Template:**

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Run command '...'
2. See error

**Expected behavior**
What you expected to happen.

**Environment:**
 - OS: [e.g., Windows 11, macOS 13, Ubuntu 22.04]
 - Node.js: [e.g., v18.17.0]
 - Chrome: [e.g., 120.0.6099.109]
 - Version: [e.g., 5.0.0]

**Logs**
```
Paste relevant logs here
```
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear title** describing the enhancement
- **Provide detailed description** of the proposed functionality
- **Explain why** this enhancement would be useful
- **List alternatives** you've considered

### Your First Code Contribution

Unsure where to start? Look for issues tagged:

- `good first issue` - Simple issues for beginners
- `help wanted` - Issues that need attention
- `documentation` - Documentation improvements

## Development Setup

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- Google Chrome

### Setup Steps

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/9router-kiro-automator.git
cd 9router-kiro-automator

# 3. Add upstream remote
git remote add upstream https://github.com/original-owner/9router-kiro-automator.git

# 4. Install dependencies
npm install

# 5. Create .env file
cp .env.example .env
# Edit .env with your configuration

# 6. Generate encryption key
npm run generate-key
# Copy the key to .env

# 7. Run tests
npm test

# 8. Start Chrome for testing
npm run chrome

# 9. Test the CLI
npm start -- status
```

### Project Structure

```
9router-kiro-automator/
├── src/
│   ├── automation/         # OAuth automation logic
│   ├── browser/            # Browser management & anti-detection
│   ├── cli/                # CLI interface
│   ├── config/             # Configuration management
│   ├── core/               # Core orchestration engine
│   ├── database/           # Database operations
│   └── utils/              # Utilities
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── scripts/                # Helper scripts
├── config/                 # Configuration files
└── docs/                   # Documentation
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-amazing-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm test              # Run all tests
   npm run lint          # Check code style
   npm run format:check  # Check formatting
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Keep your branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/my-amazing-feature
   ```

### Submitting the PR

1. Go to the [original repository](https://github.com/original-owner/9router-kiro-automator)
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill in the PR template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
```

### Review Process

- Maintainers will review your PR within 1-2 weeks
- Address any requested changes
- Once approved, a maintainer will merge your PR

## Coding Standards

### JavaScript Style

We follow [JavaScript Standard Style](https://standardjs.com/) with some modifications:

```javascript
// ✅ Good
export class BrowserManager {
  constructor() {
    this.browser = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;
    
    try {
      this.browser = await chromium.connectOverCDP(this.cdpUrl);
      this.isConnected = true;
      logger.success('Connected to Chrome');
    } catch (err) {
      logger.error('Connection failed', { error: err.message });
      throw err;
    }
  }
}

// ❌ Bad
export class BrowserManager{
  constructor(){
    this.browser=null
    this.isConnected=false
  }
  
  async connect(){
    if(this.isConnected) return
    try{
      this.browser=await chromium.connectOverCDP(this.cdpUrl)
      this.isConnected=true
      logger.success('Connected to Chrome')
    }catch(err){
      logger.error('Connection failed',{error:err.message})
      throw err
    }
  }
}
```

### Key Rules

- **Indentation:** 2 spaces (no tabs)
- **Quotes:** Single quotes for strings
- **Semicolons:** Not required (ASI)
- **Naming:**
  - `camelCase` for variables and functions
  - `PascalCase` for classes
  - `UPPER_CASE` for constants
- **Comments:** JSDoc for public APIs

```javascript
/**
 * Create a new account with automated OAuth flow
 * @param {string} email - Email address for the account
 * @param {Object} options - Configuration options
 * @param {number} [options.accountIndex=0] - Account index
 * @param {string} [options.proxy] - Proxy server URL
 * @returns {Promise<Object>} Result object with success status
 */
async createAccount(email, options = {}) {
  // Implementation
}
```

### Error Handling

```javascript
// ✅ Always use try-catch for async operations
try {
  const result = await riskyOperation();
  return result;
} catch (err) {
  logger.error('Operation failed', { error: err.message });
  throw new Error(`Failed to complete operation: ${err.message}`);
}

// ✅ Validate inputs
if (!email || typeof email !== 'string') {
  throw new Error('Invalid email parameter');
}
```

### Logging

```javascript
// ✅ Use structured logging
logger.info('Starting process', { email, index });
logger.success('Process completed', { duration: '2.5s' });
logger.warn('Rate limit approaching', { remaining: 3 });
logger.error('Process failed', { error: err.message, stack: err.stack });

// ❌ Don't use console.log directly
console.log('Starting...'); // Bad
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)

### Examples

```
feat(automation): add proxy rotation support

Implement round-robin proxy rotation for accounts.
Helps avoid IP-based rate limiting.

Closes #123
```

```
fix(database): prevent race condition in transaction

Add mutex lock to prevent concurrent database writes.

Fixes #456
```

```
docs(readme): update installation instructions

Add Docker installation method and troubleshooting section.
```

## Testing

### Writing Tests

```javascript
// tests/unit/utils/gmail.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateDotVariations } from '../../../src/utils/gmail.js';

describe('generateDotVariations', () => {
  it('should generate correct dot variations', () => {
    const variations = generateDotVariations('testuser@gmail.com', 3, 0);
    
    assert.strictEqual(variations.length, 3);
    assert.strictEqual(variations[0], 'testuser@gmail.com');
    assert.strictEqual(variations[1], 't.estuser@gmail.com');
    assert.strictEqual(variations[2], 'te.stuser@gmail.com');
  });

  it('should handle edge cases', () => {
    const variations = generateDotVariations('ab@gmail.com', 2, 0);
    assert.strictEqual(variations.length, 2);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/utils/gmail.test.js
```

### Test Coverage

- Aim for **80%+ code coverage**
- All new features must include tests
- Bug fixes should include regression tests

## Questions?

- **General questions:** [GitHub Discussions](https://github.com/original-owner/9router-kiro-automator/discussions)
- **Bug reports:** [GitHub Issues](https://github.com/original-owner/9router-kiro-automator/issues)
- **Security concerns:** security@example.com

---

**Thank you for contributing!** 🎉
