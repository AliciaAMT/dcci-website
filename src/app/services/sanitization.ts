import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SanitizationService {

  constructor() { }

  /**
   * Sanitizes input to prevent XSS and injection attacks
   * @param input - The input string to sanitize
   * @returns Sanitized string
   */
  sanitizeInput(input: string): string {
    if (!input) return '';

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes to prevent SQL injection
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/[--]/g, '') // Remove SQL comment indicators
      .replace(/[/*]/g, '') // Remove SQL comment indicators
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/[=]/g, '') // Remove equals signs
      .replace(/script/gi, '') // Remove script tags (case insensitive)
      .replace(/javascript/gi, '') // Remove javascript (case insensitive)
      .replace(/vbscript/gi, '') // Remove vbscript (case insensitive)
      .replace(/onload/gi, '') // Remove onload events (case insensitive)
      .replace(/onerror/gi, '') // Remove onerror events (case insensitive)
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Sanitizes email input
   * @param email - Email string to sanitize
   * @returns Sanitized email
   */
  sanitizeEmail(email: string): string {
    if (!email) return '';

    // Basic email validation and sanitization
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = this.sanitizeInput(email);

    return emailRegex.test(sanitized) ? sanitized : '';
  }

  /**
   * Sanitizes password input
   * @param password - Password string to sanitize
   * @returns Sanitized password
   */
  sanitizePassword(password: string): string {
    if (!password) return '';

    // Allow most characters but remove potential injection patterns
    return password
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/script/gi, '') // Remove script tags
      .replace(/javascript/gi, '') // Remove javascript
      .trim();
  }

  /**
   * Validates if input is safe (not empty after sanitization)
   * @param input - Input to validate
   * @returns boolean indicating if input is safe
   */
  isValidInput(input: string): boolean {
    const sanitized = this.sanitizeInput(input);
    return sanitized.length > 0 && sanitized.length <= 255; // Reasonable length limit
  }

  /**
   * Validates email format
   * @param email - Email to validate
   * @returns boolean indicating if email is valid
   */
  isValidEmail(email: string): boolean {
    const sanitized = this.sanitizeEmail(email);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(sanitized) && sanitized.length > 0 && sanitized.length <= 254;
  }

  /**
   * Validates password strength
   * @param password - Password to validate
   * @returns boolean indicating if password meets requirements
   */
  isValidPassword(password: string): boolean {
    if (!password) return false;

    // Password requirements: at least 8 characters, contains letters and numbers
    const hasMinLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    return hasMinLength && hasLetter && hasNumber;
  }
}
