import * as validator from 'validator';

/**
 * Sanitization utilities for contact form input
 */

// Spam trigger words that will cause form submission to be rejected
const spamTriggers = [
  'seo',
  'wikipedia',
  'promotion',
  'marketing',
  'branding',
  'web design',
  'guest post',
  'backlink',
  'crypto',
  'opt-out',
  'bitcoin',
  'forex',
  'investment',
  'loan',
  'credit',
  'debt',
  'casino',
  'gambling',
  'viagra',
  'pharmacy',
  'weight loss',
  'diet pill',
  'supplement',
  'insurance',
  'mortgage',
  'refinance',
  'trading',
  'stocks',
  'profit',
  'earn money',
  'work from home',
  'make money',
  'get rich',
  'click here',
  'buy now',
  'limited time',
  'act now',
  'free trial',
  'no obligation',
  'risk free'
];

export interface SanitizedContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
  newsletter: boolean;
  formLoadTime: number;
  submissionTime: number;
}

export interface SanitizedNewsletterData {
  name: string;
  email: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: SanitizedContactData;
}

export interface NewsletterValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: SanitizedNewsletterData;
}

/**
 * Sanitize and validate contact form data
 */
export function sanitizeContactForm(data: any): ValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string');
  }
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required and must be a string');
  }
  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('Subject is required and must be a string');
  }
  if (!data.message || typeof data.message !== 'string') {
    errors.push('Message is required and must be a string');
  }

  // Validate timestamp fields for bot detection
  const minFormTime = 10000; // Minimum 10 seconds to fill form
  const maxFormTime = 3600000; // Maximum 1 hour (prevent very old submissions)

  if (!data.formLoadTime || !data.submissionTime) {
    errors.push('Form timing information is missing');
  } else {
    const formLoadTime = parseInt(data.formLoadTime);
    const submissionTime = parseInt(data.submissionTime);
    const timeToFill = submissionTime - formLoadTime;

    if (isNaN(formLoadTime) || isNaN(submissionTime)) {
      errors.push('Invalid form timing data');
    } else if (timeToFill < minFormTime) {
      errors.push('Form submitted too quickly. Please take your time to fill out the form.');
    } else if (timeToFill > maxFormTime) {
      errors.push('Form submission timed out. Please try again.');
    } else if (submissionTime < formLoadTime) {
      errors.push('Invalid form timing sequence');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  try {
    // Sanitize and validate each field
    const sanitizedData: SanitizedContactData = {
      name: sanitizeText(data.name, 100),
      email: sanitizeEmail(data.email),
      subject: sanitizeText(data.subject, 200),
      message: sanitizeText(data.message, 5000),
      newsletter: Boolean(data.newsletter),
      formLoadTime: parseInt(data.formLoadTime),
      submissionTime: parseInt(data.submissionTime)
    };

    // Additional validation after sanitization
    if (sanitizedData.name.length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    if (sanitizedData.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }
    if (!validator.isEmail(sanitizedData.email)) {
      errors.push('Email must be a valid email address');
    }
    if (sanitizedData.subject.length < 5) {
      errors.push('Subject must be at least 5 characters long');
    }
    if (sanitizedData.subject.length > 200) {
      errors.push('Subject must be less than 200 characters');
    }
    if (sanitizedData.message.length < 10) {
      errors.push('Message must be at least 10 characters long');
    }
    if (sanitizedData.message.length > 5000) {
      errors.push('Message must be less than 5000 characters');
    }

    // Check for suspicious content
    if (containsSuspiciousContent(sanitizedData.name) ||
        containsSuspiciousContent(sanitizedData.subject) ||
        containsSuspiciousContent(sanitizedData.message)) {
      errors.push('Content contains suspicious elements and cannot be processed');
    }

    // Check for spam trigger words
    if (containsSpamTriggers(sanitizedData.name) ||
        containsSpamTriggers(sanitizedData.subject) ||
        containsSpamTriggers(sanitizedData.message)) {
      errors.push('Message appears to be promotional or spam content');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [], sanitizedData };

  } catch (error) {
    return {
      isValid: false,
      errors: ['An error occurred while processing your input. Please try again.']
    };
  }
}

/**
 * Sanitize text input by removing HTML tags and limiting length
 */
function sanitizeText(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and decode HTML entities
  let sanitized = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')   // Decode HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .trim();

  // Remove potential script injection patterns
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onclick=/gi, '')
    .replace(/onmouseover=/gi, '');

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email input
 */
function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove any HTML and trim
  const sanitized = input
    .replace(/<[^>]*>/g, '')
    .trim()
    .toLowerCase();

  // Basic email validation and sanitization
  return validator.escape(sanitized);
}

/**
 * Check for spam trigger words
 */
function containsSpamTriggers(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const lowerInput = input.toLowerCase();

  return spamTriggers.some(trigger => {
    // Check for exact word matches (case insensitive)
    const regex = new RegExp(`\\b${trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lowerInput);
  });
}

/**
 * Check for suspicious content patterns
 */
function containsSuspiciousContent(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /<link[^>]*>/i,
    /<meta[^>]*>/i,
    /<style[^>]*>/i,
    /on\w+\s*=/i, // onclick, onload, etc.
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /alert\s*\(/i,
    /prompt\s*\(/i,
    /confirm\s*\(/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize and validate newsletter subscription data
 */
export function sanitizeNewsletterForm(data: any): NewsletterValidationResult {
  const errors: string[] = [];

  // Validate required fields
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string');
  }
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required and must be a string');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  try {
    // Sanitize and validate each field
    const sanitizedData: SanitizedNewsletterData = {
      name: sanitizeText(data.name, 100),
      email: sanitizeEmail(data.email)
    };

    // Additional validation after sanitization
    if (sanitizedData.name.length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    if (sanitizedData.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }
    if (!validator.isEmail(sanitizedData.email)) {
      errors.push('Email must be a valid email address');
    }

    // Check for suspicious content
    if (containsSuspiciousContent(sanitizedData.name)) {
      errors.push('Name contains suspicious elements and cannot be processed');
    }

    // Check for spam trigger words in name
    if (containsSpamTriggers(sanitizedData.name)) {
      errors.push('Name appears to be promotional or spam content');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [], sanitizedData };

  } catch (error) {
    return {
      isValid: false,
      errors: ['An error occurred while processing your input. Please try again.']
    };
  }
}

/**
 * Escape HTML for safe display in emails
 */
export function escapeHtmlForEmail(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\n/g, '<br>');
}
