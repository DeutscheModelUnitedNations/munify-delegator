/**
 * Where `now` stands relative to a maintenance window: `none` without a window or once it has
 * ended, `upcoming` before it starts and `active` while it runs.
 */
export function maintenanceStatus(
	start: Date | undefined,
	end: Date | undefined,
	now: Date
): 'none' | 'upcoming' | 'active' {
	if (!start || !end || end <= now) return 'none';
	return start > now ? 'upcoming' : 'active';
}
