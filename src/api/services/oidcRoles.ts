/** The system roles the identity provider grants, independent of any conference. */
export const oidcRoles = ['admin', 'member', 'service_user'] as const;

export type OidcRole = (typeof oidcRoles)[number];
