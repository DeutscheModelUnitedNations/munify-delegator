// Global Window interface extensions for onclick handlers in rendered HTML

declare global {
	interface Window {
		handleTeamMemberDelete?: (id: string) => void;
		handleTeamMemberImpersonate?: (userId: string) => void;
		handleTeamMemberOpenUserCard?: (userId: string) => void;
	}

	namespace App {
		interface Locals {
			/**
			 * Who the impersonated user is, from their row: set by `impersonationHandle` in
			 * `userPermissions.ts` while `locals.oidc.impersonator` is, since the exchanged token may carry
			 * little more than their `sub`.
			 */
			impersonatedIdentity?: {
				email: string;
				given_name: string;
				family_name: string;
				preferred_username?: string;
				locale?: string;
				phone?: string;
			};
			/**
			 * Set by the `/mcp` endpoint for an AI assistant's request, once its bearer token checked
			 * out: whose account it acts with, whether that account is a system admin, and the one
			 * conference the tool call is about (`#api/context`, `src/api/mcp/`).
			 */
			/**
			 * Whether the linked CHASE is calling: set by `linkHandle` (`hooks.server.ts`) when the
			 * request's link token grants the `chase` role (`#api/handlers/chaseLink/linkAuth`).
			 */
			linkCaller?: boolean;
			mcp?: {
				userId: string;
				isAdmin: boolean;
				conferenceId: string;
			};
		}
	}
}

export {};
