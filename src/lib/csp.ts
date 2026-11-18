/**
 * Content-Security-Policy van de app. Het dashboard laadt niets van buiten:
 * geen externe scripts, lettertypen of afbeeldingen, en de browser praat alleen
 * met het dashboard zelf. Dit bestand wordt ook door next.config.ts geladen:
 * geen `@/`-imports.
 */
export function buildContentSecurityPolicy(options: { dev?: boolean } = {}): string {
  return [
    "default-src 'self'",
    // Next.js zet inline scripts voor hydratatie; eval alleen bij `next dev`.
    `script-src 'self' 'unsafe-inline'${options.dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src 'self'${options.dev ? " ws:" : ""}`,
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
