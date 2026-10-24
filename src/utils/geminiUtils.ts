/**
 * Sanitizes and parses JSON response from Gemini API, removing potential markdown markers.
 */
export const safeJsonParse = (raw: any) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  
  try {
    const sanitized = String(raw).replace(/```json|```/g, '').trim();
    return JSON.parse(sanitized);
  } catch (e) {
    console.error('Failed to parse Gemini JSON:', e);
    return null;
  }
};
