import { graphql } from '$houdini';

export const fastUserQuery = graphql(`
	query OfflineUser {
		offlineUserRefresh {
			nextTokenRefreshDue
			user {
				sub
				email
				family_name
				given_name
				locale
				phone
				preferred_username
				hasPassword
				mfaVerificationFactors
				ssoIdentities {
					issuer
					identityId
				}
				socialIdentities
			}
		}
		myOIDCRoles
	}
`);
