/**
 * Escapes HTML special characters to prevent XSS attacks
 * Safe for use in HTML context
 */
export function escapeHtml(text: string): string {
  if (!text) return text;

  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Escapes text for safe use in HTML attributes
 */
export function escapeAttribute(text: string): string {
  if (!text) return text;
  return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Validates and sanitizes text input
 * Removes leading/trailing whitespace and escapes HTML
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return escapeHtml(text.trim());
}
