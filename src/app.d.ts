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
			 * `hooks.server.ts` while `locals.oidc.impersonator` is, since the exchanged token may carry
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
		}
	}
}

export {};
