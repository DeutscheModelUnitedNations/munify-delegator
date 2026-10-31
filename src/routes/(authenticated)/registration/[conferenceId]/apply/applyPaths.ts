/** The ways into a conference, each continuing the application form differently. */
const APPLY_PATHS = ['createDelegation', 'joinDelegation', 'individual', 'supervisor'] as const;
export type ApplyPath = (typeof APPLY_PATHS)[number];

/** Reads a path from the `apply` search parameter the old registration links redirect with. */
export function applyPathOf(value: string | null): ApplyPath | undefined {
	return APPLY_PATHS.find((path) => path === value);
}

/**
 * Where an old registration link leads now: the conference's dashboard, whose application form
 * opens on the link's path. Invitation links carry the entry code, a role link the role.
 */
export function applyHref({
	conferenceId,
	path,
	extra = {}
}: {
	conferenceId: string;
	path: ApplyPath;
	extra?: { code?: string | null; role?: string };
}) {
	const query = new URLSearchParams({ apply: path });
	if (extra.code) query.set('code', extra.code);
	if (extra.role) query.set('role', extra.role);
	return `/dashboard/${conferenceId}?${query}`;
}
