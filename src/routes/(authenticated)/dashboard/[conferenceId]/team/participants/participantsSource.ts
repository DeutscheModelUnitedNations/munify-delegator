import { client } from '#lib/api/rumbleClient/client';
import { createServerSource } from '#lib/components/dataGrid/serverSource';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import { fetchConferenceParticipants } from './conferenceParticipants';
import { transformParticipants } from './dataTransform';
import type { NationOption } from './columns';
import type { ParticipantRow } from './types';

/**
 * The rows for the users given, in their order: their registrations are fetched (live), and the
 * reader builds the rows from them wherever it is called (in a `$derived`, where that is tracked).
 */
async function rowsFor({
	conferenceId,
	userIds
}: {
	conferenceId: string;
	userIds: string[];
}): Promise<() => ParticipantRow[]> {
	if (userIds.length === 0) return () => [];
	const registrations = await fetchConferenceParticipants({ conferenceId, userIds });
	const position = new Map(userIds.map((id, index) => [id, index]));
	return () =>
		transformParticipants({
			queryData: registrations,
			startConference: registrations.conference?.startConference,
			endConference: registrations.conference?.endConference
		}).sort((a, b) => (position.get(a.userId) ?? 0) - (position.get(b.userId) ?? 0));
}

/**
 * The participants table's rows: the API's table engine picks and orders the people, then their
 * registrations are read (live) through the ordinary queries.
 */
export function participantsSource(conferenceId: string) {
	return createServerSource<ParticipantRow>({
		table: 'participants',
		conferenceId,
		rowsFor: ({ ids }) => rowsFor({ conferenceId, userIds: ids })
	});
}

/** The nations and non-state actors of the conference, for the nation column's filter. */
export async function fetchNationOptions(conferenceId: string): Promise<NationOption[]> {
	const roles = await client.liveQuery.conferenceRoles({
		__args: {
			where: {
				conferenceId: { eq: conferenceId },
				OR: [{ kind: 'NATION' }, { kind: 'NON_STATE_ACTOR' }]
			}
		},
		id: true,
		kind: true,
		name: true,
		nation: { alpha2Code: true, alpha3Code: true }
	});
	return roles
		.flatMap((role) => {
			if (role.kind === 'NATION' && role.nation) {
				const code = role.nation.alpha3Code;
				return [{ value: code, label: getFullTranslatedCountryNameFromISO3Code(code) }];
			}
			return role.name ? [{ value: role.name, label: role.name }] : [];
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}
