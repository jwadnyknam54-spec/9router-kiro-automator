import logger from './logger.js';

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const Validator = {
  email(value, fieldName = 'email') {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
    }

    if (value.length > 254) {
      throw new ValidationError(`${fieldName} is too long (max 254 characters)`, fieldName);
    }

    return value.trim().toLowerCase();
  },

  url(value, fieldName = 'url') {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new ValidationError(`${fieldName} must use http or https protocol`, fieldName);
      }
      return value.trim();
    } catch (err) {
      throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
    }
  },

  port(value, fieldName = 'port') {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 65535) {
      throw new ValidationError(`${fieldName} must be between 1 and 65535`, fieldName);
    }
    return num;
  },

  integer(value, fieldName = 'value', min = null, max = null) {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new ValidationError(`${fieldName} must be a valid integer`, fieldName);
    }

    if (min !== null && num < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName);
    }

    if (max !== null && num > max) {
      throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName);
    }

    return num;
  },

  string(value, fieldName = 'value', minLength = null, maxLength = null) {
    if (value === null || value === undefined) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    if (minLength !== null && value.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
    }

    if (maxLength !== null && value.length > maxLength) {
      throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`, fieldName);
    }

    return value;
  },

  boolean(value, fieldName = 'value') {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }

    throw new ValidationError(`${fieldName} must be a boolean`, fieldName);
  },

  enum(value, allowedValues, fieldName = 'value') {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
        fieldName
      );
    }
    return value;
  },

  path(value, fieldName = 'path') {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    const dangerousPatterns = [
      /\.\./,
      /[<>:"|?*]/,
      /^\/etc/i,
      /^\/sys/i,
      /^\/proc/i,
      /^c:\\windows\\/i,
      /^c:\\program files/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        throw new ValidationError(`${fieldName} contains invalid or dangerous patterns`, fieldName);
      }
    }

    return value.trim();
  },

  proxy(value, fieldName = 'proxy') {
    if (!value) return null;

    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }

    const proxyRegex = /^(http|https|socks4|socks5):\/\/.+/i;
    if (!proxyRegex.test(value)) {
      throw new ValidationError(
        `${fieldName} must start with http://, https://, socks4://, or socks5://`,
        fieldName
      );
    }

    return value.trim();
  },

  sanitizeInput(value) {
    if (typeof value !== 'string') return value;

    return value
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  },

  gmailAddress(value, fieldName = 'email') {
    const email = this.email(value, fieldName);

    if (!email.endsWith('@gmail.com')) {
      throw new ValidationError(`${fieldName} must be a Gmail address`, fieldName);
    }

    const [username] = email.split('@');
    const cleanUsername = username.replace(/\./g, '').split('+')[0];

    if (cleanUsername.length < 6) {
      throw new ValidationError(`Gmail username must be at least 6 characters`, fieldName);
    }

    if (!/^[a-z0-9]+$/.test(cleanUsername)) {
      throw new ValidationError(`Gmail username contains invalid characters`, fieldName);
    }

    return email;
  },

  passwordStrength(value, fieldName = 'password') {
    if (!value || typeof value !== 'string') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (value.length < 8) {
      throw new ValidationError(`${fieldName} must be at least 8 characters`, fieldName);
    }

    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    if (!hasLower || !hasUpper || !hasNumber) {
      throw new ValidationError(
        `${fieldName} must contain lowercase, uppercase, and numbers`,
        fieldName
      );
    }

    return value;
  },

  cooldownDuration(value, fieldName = 'cooldown') {
    const ms = this.integer(value, fieldName, 0);

    if (ms < 60000) {
      logger.warn('Cooldown less than 1 minute may trigger rate limits', { value: ms });
    }

    if (ms > 3600000) {
      logger.warn('Cooldown greater than 1 hour may be inefficient', { value: ms });
    }

    return ms;
  },

  multiplier(value, fieldName = 'multiplier') {
    const num = this.integer(value, fieldName, 1, 50);

    if (num > 10) {
      logger.warn('High multiplier may trigger anti-abuse detection', { value: num });
    }

    return num;
  }
};

export function validateOptions(options, schema) {
  const validated = {};
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    try {
      const value = options[key];

      if (rules.required && (value === undefined || value === null)) {
        throw new ValidationError(`${key} is required`, key);
      }

      if (value === undefined || value === null) {
        validated[key] = rules.default !== undefined ? rules.default : null;
        continue;
      }

      if (rules.type === 'email') {
        validated[key] = Validator.email(value, key);
      } else if (rules.type === 'url') {
        validated[key] = Validator.url(value, key);
      } else if (rules.type === 'integer') {
        validated[key] = Validator.integer(value, key, rules.min, rules.max);
      } else if (rules.type === 'string') {
        validated[key] = Validator.string(value, key, rules.minLength, rules.maxLength);
      } else if (rules.type === 'boolean') {
        validated[key] = Validator.boolean(value, key);
      } else if (rules.type === 'enum') {
        validated[key] = Validator.enum(value, rules.values, key);
      } else if (rules.type === 'proxy') {
        validated[key] = Validator.proxy(value, key);
      } else if (rules.type === 'path') {
        validated[key] = Validator.path(value, key);
      } else if (rules.custom) {
        validated[key] = rules.custom(value, key);
      } else {
        validated[key] = value;
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.push(err.message);
      } else {
        throw err;
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Validation failed:\n' + errors.join('\n'));
  }

  return validated;
}
