/**
 * Canonical timezone for a user session. Defaults to the browser's local timezone.
 * Pass this through to all helpers when you need consistent timezone-aware behaviour.
 */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Parses an ISO string or Unix ms value into a Unix timestamp (ms).
 * - Numbers are returned as-is.
 * - ISO strings with a Z or explicit UTC offset are parsed as absolute UTC.
 * - Naive ISO strings (no Z / no offset) are treated as local time in `tz`
 *   (defaults to the browser's timezone).
 */
export function toUnix(
  value: string | number | null | undefined,
  tz: string = browserTimezone(),
): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return value

  // If the string already carries timezone info, parse it directly.
  const hasOffset = /Z|[+-]\d{2}:\d{2}$/.test(value)
  if (hasOffset) {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d.getTime()
  }

  // Naive ISO — treat as local time in the given timezone.
  const normalised = value.length === 10 ? `${value}T00:00:00` : value
  const parts = normalised.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!parts) return null

  const [, Y, M, D, h, m, s = '0'] = parts
  return localToUnix(
    `${Y}-${M}-${D}`,
    `${h}:${m}`,
    tz,
  )
}

/**
 * Returns a YYYY-MM-DD string in the given timezone (defaults to browser timezone).
 */
export function unixToLocalDate(
  unix: number | null | undefined,
  tz: string = browserTimezone(),
): string {
  if (unix == null) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(unix))
}

/**
 * Returns an HH:MM string in the given timezone (defaults to browser timezone).
 */
export function unixToLocalTime(
  unix: number | null | undefined,
  tz: string = browserTimezone(),
): string {
  if (unix == null) return ''
  const raw = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(unix))
  // en-GB midnight can render as "24:00" on some runtimes — normalise it.
  return raw === '24:00' ? '00:00' : raw
}

/**
 * Converts a local date (YYYY-MM-DD) and time (HH:MM) in the given timezone
 * to a Unix timestamp (ms). DST-safe via a two-pass offset correction.
 */
export function localToUnix(
  date: string,
  time: string,
  tz: string = browserTimezone(),
): number | null {
  if (!date) return null

  const [year, month, day] = date.split('-').map(Number)
  const [hours = 0, minutes = 0] = (time || '00:00').split(':').map(Number)
  if (!year || !month || !day) return null

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })

  // Returns the UTC offset (ms) of a given UTC timestamp in the target timezone.
  function tzOffset(utcMs: number): number {
    const parts = fmt.formatToParts(utcMs)
    const get = (type: string) =>
      Number(parts.find(p => p.type === type)?.value ?? '0')
    // hour12:false can produce 24 for midnight — clamp it.
    const tzMs = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second'),
    )
    return tzMs - utcMs
  }

  // First pass: approximate using wall-clock time treated as UTC.
  const approxUtc = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const offset1 = tzOffset(approxUtc)
  const approxResult = approxUtc - offset1

  // Second pass: correct for DST boundaries.
  const offset2 = tzOffset(approxResult)
  return approxUtc - offset2
}

/**
 * Converts a Unix timestamp (ms) to a UTC ISO 8601 string.
 * Use this when sending times to external APIs (e.g. Google Calendar).
 */
export function unixToIso(unix: number | null | undefined): string | undefined {
  if (unix == null) return undefined
  return new Date(unix).toISOString()
}
