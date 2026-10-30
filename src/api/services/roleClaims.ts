import { z } from 'zod';
import { oidcRoles, type OidcRole } from './oidcRoles';

/**
 * Which provider role or group names grant an app role (`OIDC_ROLE_MAP`). A role the map leaves
 * out is granted by a name equal to its own.
 */
export type RoleMap = Partial<Record<OidcRole, readonly string[]>>;

const claimObject = z.record(z.string(), z.unknown());

function propertyOf(value: unknown, key: string): unknown {
	const parsed = claimObject.safeParse(value);
	return parsed.success ? parsed.data[key] : undefined;
}

/**
 * The value `path` names in a set of claims: the claim of exactly that name if there is one
 * (Zitadel's `urn:zitadel:iam:org:project:roles`, Auth0's `https://example.com/roles`), else the
 * path's dot-separated steps into nested objects (Keycloak's `realm_access.roles`).
 */
export function claimAt(claims: unknown, path: string): unknown {
	const literal = propertyOf(claims, path);
	if (literal !== undefined) return literal;
	return path.split('.').reduce<unknown>((value, key) => propertyOf(value, key), claims);
}

/** A role named by itself (Logto, Authentik, Keycloak, …) or by an object carrying its `name`. */
const roleEntry = z.union([
	z.string().min(1),
	z.object({ name: z.string().min(1) }).transform(({ name }) => name)
]);

/**
 * The role names in a claim's value, whichever shape the provider sends: a single name, a list of
 * names or `{ name }` objects (entries of any other shape are skipped), or an object keyed by role
 * name (Zitadel).
 */
const roleNames = z.union([
	z
		.string()
		.min(1)
		.transform((name) => [name]),
	z.array(z.unknown()).transform((entries) =>
		entries.flatMap((entry) => {
			const parsed = roleEntry.safeParse(entry);
			return parsed.success ? [parsed.data] : [];
		})
	),
	claimObject.transform((roles) => Object.keys(roles))
]);

/**
 * The role names the claim at `path` lists, read from the first set of claims holding it: the
 * access token, the ID token, then what the userinfo endpoint answered. A value of no known shape
 * grants nothing.
 */
export function roleNamesInClaims(sources: readonly unknown[], path: string): string[] {
	const value = sources
		.map((claims) => claimAt(claims, path))
		.find((value) => value !== undefined && value !== null);
	const parsed = roleNames.safeParse(value);
	return parsed.success ? parsed.data : [];
}

/** The app roles a provider's role names grant, through `roleMap`. */
export function appRolesOf(names: readonly string[], roleMap: RoleMap = {}): OidcRole[] {
	return oidcRoles.filter((role) => (roleMap[role] ?? [role]).some((name) => names.includes(name)));
}
