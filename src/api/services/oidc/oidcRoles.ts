/**
 * The system roles the identity provider grants, independent of any conference. `chase` is the
 * linked MUNify CHASE instance's (`#api/handlers/chaseLink/linkAuth`): only its link token grants
 * it, never a person's session.
 */
export const oidcRoles = ['admin', 'member', 'service_user', 'chase'] as const;

/** The role the linked CHASE calls with. */
export const LINK_ROLE: OidcRole = 'chase';

/** The role this instance asks for at the linked CHASE: what CHASE grants a DELEGATOR. */
export const REMOTE_LINK_ROLE = 'delegator';

export type OidcRole = (typeof oidcRoles)[number];
