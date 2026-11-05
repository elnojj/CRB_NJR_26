/** Shared browser/server rules. Values must never be included in diagnostics. */
export function ownerCodeIssue(value: string | undefined) {
  const code = value?.trim() || '';
  if (!code) return { reason: 'missing', message: 'Enter the owner access code.' } as const;
  if (code.length < 24) return { reason: 'too_short', message: 'The owner access code must contain at least 24 characters.' } as const;
  if (code.length > 256) return { reason: 'too_long', message: 'The owner access code must contain no more than 256 characters.' } as const;
  if (!/^[\x21-\x7e]+$/.test(code)) return {
    reason: 'unsupported_characters',
    message: 'Use English letters, numbers or symbols in the owner access code, without spaces or line breaks.',
  } as const;
  return null;
}
