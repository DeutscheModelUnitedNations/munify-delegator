import { m } from '#lib/paraglide/messages';
import type { Audience, TopicReaders } from '#lib/guide/outline';

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

/** Who reads the topic overview, in a few words; nobody: "no one yet". */
export function topicReadersLabel({
	readers,
	roles
}: {
	readers: TopicReaders;
	roles: readonly { id: string; name: string }[];
}) {
	const names = [
		...(readers.nonStateActors ? [m.guideAudienceNonStateActors()] : []),
		...readers.roleIds.map((id) => roles.find((role) => role.id === id)?.name ?? '?'),
		...(readers.supervisors ? [m.guideAudienceSupervisors()] : [])
	];
	return names.length > 0 ? names.join(', ') : m.guideTopicOverviewNobody();
}
