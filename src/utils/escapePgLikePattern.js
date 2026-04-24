/**
 * Escape user input for PostgreSQL LIKE / ILIKE when the pattern uses ESCAPE '\'.
 * Order: backslashes first, then % and _, so inserted backslashes are not double-counted.
 *
 * Use with a bound parameter only, e.g.:
 *   .whereRaw(`scripts.name ILIKE ? ESCAPE '\\'`, [`%${escapePgLikePattern(q)}%`])
 * The value is never concatenated into SQL as raw text, so injection via the pattern is avoided.
 */
export function escapePgLikePattern(str) {
	return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
