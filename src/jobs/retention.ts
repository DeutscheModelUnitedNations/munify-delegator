/** How long an invitation stays after it expired, so the team UI can still show it as expired. */
export const DEFAULT_RETENTION_DAYS = 30;

/** Invitations that expired before this moment are past their retention. */
export function retentionCutoff({
	now,
	retentionDays
}: {
	now: Date;
	retentionDays: number;
}): Date {
	const cutoff = new Date(now);
	cutoff.setDate(cutoff.getDate() - retentionDays);
	return cutoff;
}
