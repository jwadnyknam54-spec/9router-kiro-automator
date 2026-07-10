import { Validator } from './validation.js';
import logger from './logger.js';

export function getDotVariation(username, index) {
  const clean = username.replace(/\./g, '');
  let result = '';
  const len = clean.length;
  const mask = index;

  for (let i = 0; i < len; i++) {
    result += clean[i];
    if (i < len - 1 && (mask & (1 << i))) {
      result += '.';
    }
  }

  return result;
}

export function generateDotVariations(baseEmail, count = 10, startIndex = 0) {
  const email = Validator.gmailAddress(baseEmail);
  const [username, domain] = email.split('@');
  const cleanUsername = username.replace(/\./g, '');

  const maxVariations = Math.pow(2, cleanUsername.length - 1);

  if (startIndex >= maxVariations) {
    logger.warn('Start index exceeds maximum variations', {
      startIndex,
      maxVariations
    });
    return [];
  }

  const actualCount = Math.min(count, maxVariations - startIndex);
  const variations = [];

  for (let i = startIndex; i < startIndex + actualCount; i++) {
    const dotPrefix = getDotVariation(cleanUsername, i);
    variations.push(`${dotPrefix}@${domain}`);
  }

  return variations;
}

export function generatePlusVariations(baseEmail, count = 10, startIndex = 1) {
  const email = Validator.email(baseEmail);
  const [username, domain] = email.split('@');

  const variations = [];

  for (let i = startIndex; i < startIndex + count; i++) {
    variations.push(`${username}+kiro${i}@${domain}`);
  }

  return variations;
}

export function normalizeGmailAddress(email) {
  const validated = Validator.gmailAddress(email);
  const [username, domain] = validated.split('@');

  const cleanUsername = username.replace(/\./g, '').split('+')[0];

  return `${cleanUsername}@${domain}`;
}

export function areGmailAddressesSame(email1, email2) {
  try {
    return normalizeGmailAddress(email1) === normalizeGmailAddress(email2);
  } catch (err) {
    return false;
  }
}

export function getMaxDotVariations(baseEmail) {
  const email = Validator.gmailAddress(baseEmail);
  const [username] = email.split('@');
  const cleanUsername = username.replace(/\./g, '');

  return Math.pow(2, cleanUsername.length - 1);
}
