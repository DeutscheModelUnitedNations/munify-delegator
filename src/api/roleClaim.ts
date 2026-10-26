/** A claim of a decoded token, which arrives as `unknown` from the session. */
function claimOf(token: unknown, claim: string): unknown {
	return typeof token === 'object' && token !== null && claim in token
		? Object.getOwnPropertyDescriptor(token, claim)?.value
		: undefined;
}

/** A role named by itself or by an object carrying its `name`. */
function roleName(role: unknown): string | undefined {
	if (typeof role === 'string') return role;
	return typeof role === 'object' &&
		role !== null &&
		'name' in role &&
		typeof role.name === 'string'
		? role.name
		: undefined;
}

/**
 * The role names the `claim` lists, read from the first token holding it (as `??` would pick it):
 * providers send a list of names, a list of `{ name }` objects, or an object keyed by role name.
 */
export function roleNamesInClaim(tokens: readonly unknown[], claim: string): string[] {
	const raw = tokens
		.map((token) => claimOf(token, claim))
		.find((value) => value !== undefined && value !== null);
	if (Array.isArray(raw)) return raw.flatMap((role) => roleName(role) || []);
	return typeof raw === 'object' && raw !== null ? Object.keys(raw) : [];
}
