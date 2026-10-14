/**
 * Utilities for sanitizing and formatting Unipile API requests
 */

export function sanitizeBaseUrl(rawUrl: string): string {
  if (!rawUrl) return 'https://api70.unipile.com:20009/api/v1';
  let cleaned = rawUrl.trim();

  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // Ensure https protocol if missing
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  } else if (/^http:\/\//i.test(cleaned)) {
    // Unipile typically requires https
    cleaned = cleaned.replace(/^http:\/\//i, 'https://');
  }

  // Ensure /api/v1 path is present
  if (!cleaned.includes('/api/v1')) {
    // If it has /api without /v1
    if (cleaned.endsWith('/api')) {
      cleaned = `${cleaned}/v1`;
    } else {
      cleaned = `${cleaned}/api/v1`;
    }
  }

  return cleaned.replace(/\/+$/, '');
}

export function extractLinkedInSlug(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();

  // Remove query parameters and hash fragments
  cleaned = cleaned.split('?')[0].split('#')[0];

  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // If full LinkedIn URL provided, extract slug
  // Match https://www.linkedin.com/in/{slug} or linkedin.com/in/{slug} or in/{slug}
  const match = cleaned.match(/(?:linkedin\.com\/in\/|in\/)([^/]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim());
  }

  // If user pasted slug directly or other pattern, strip leading /in/ or /
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/^\/+/, '');

  return cleaned;
}

