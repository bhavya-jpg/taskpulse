/**
 * TRANSCRIPT PARSERS
 * ──────────────────
 * Functions to normalize different transcript formats (VTT, DOCX, TXT)
 * into a clean plain-text dialogue format.
 */

export function parseVTT(vttContent: string): string {
  const lines = vttContent.split('\n');
  const dialogues: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header, empty lines, and timestamp lines (e.g., 00:00:01.000 --> 00:00:04.000)
    if (
      line.startsWith('WEBVTT') || 
      line.includes('-->') || 
      line === '' || 
      /^\d+$/.test(line) // Skip sequence numbers if present
    ) {
      continue;
    }

    // Zoom/Teams often put the speaker name on the same line or the line before
    // If the next line is also text, it might be a continuation.
    // For now, we just collect all non-header/non-timestamp lines.
    dialogues.push(line);
  }

  return dialogues.join('\n');
}

export function normalizeTranscript(rawContent: string, source: 'zoom' | 'google_meet' | 'teams' | 'manual'): string {
  switch (source) {
    case 'zoom':
    case 'teams':
      return parseVTT(rawContent);
    case 'google_meet':
    case 'manual':
    default:
      return rawContent.trim();
  }
}
