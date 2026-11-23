import { m } from '#lib/paraglide/messages';
import type { Audience } from '#lib/guide/outline';

/** Who an audience is, in a few words: the custom roles by name. */
export function audienceLabel({
	audience,
	roles
}: {
	audience: Audience;
	roles: readonly { id: string; name: string }[];
}) {
	switch (audience.type) {
		case 'everyone':
			return m.guideAudienceEveryone();
		case 'delegates':
			return m.guideAudienceDelegates();
		case 'nonStateActors':
			return m.guideAudienceNonStateActors();
		case 'supervisors':
			return m.guideAudienceSupervisors();
		case 'customRoles':
			return audience.roleIds
				.map((id) => roles.find((role) => role.id === id)?.name ?? '?')
				.join(', ');
	}
}
