import { object, query, schemaBuilder } from '#api/rumble';
import { ConferenceRef } from '#api/handlers/conference/conference';
import { loadSchoolRegistrations, refreshSchoolSuggestions } from './schoolSuggestions';
import {
	schoolRowSources,
	schoolRows,
	type SchoolRow,
	type SchoolRowSources
} from './conferenceAggregates';
import {
	assertCanAnalyzeSchoolSuggestions,
	readableSchoolRegistrations,
	registerSchoolSuggestionAbilities
} from './schoolSuggestionPermissions';
import {
	conferenceParticipantPubsub,
	delegationMemberPubsub,
	delegationPubsub,
	schoolPubsub,
	schoolSuggestionPubsub,
	singleParticipantPubsub
} from '#api/pubsub';
import { updateIfAllowed } from '#api/services/authHelper/utils';

registerSchoolSuggestionAbilities();

object({ table: 'schoolSuggestion' });
object({ table: 'schoolSuggestionVariant' });
query({ table: 'schoolSuggestion' });

/** A row of the school overview, with the rows it was counted from (not exposed). */
type ConferenceSchoolsShape = SchoolRow & { sources: SchoolRowSources | undefined };

const ConferenceSchools = schemaBuilder.objectRef<ConferenceSchoolsShape>('ConferenceSchools');
ConferenceSchools.implement({
	// a rename, a person changing school or a registration being withdrawn refreshes the overview
	subscribe: (subscriptions, row) => {
		schoolPubsub.registerOnInstance({
			instance: subscriptions,
			action: 'updated',
			primaryKeyValue: row.schoolId
		});
		const sources = [
			[conferenceParticipantPubsub, row.sources?.participantIds],
			[delegationPubsub, row.sources?.delegationIds],
			[singleParticipantPubsub, row.sources?.singleParticipantIds]
		] as const;
		for (const [pubsub, ids] of sources) {
			for (const primaryKeyValue of ids ?? []) {
				pubsub.registerOnInstance({ instance: subscriptions, action: 'updated', primaryKeyValue });
			}
		}
	},
	fields: (t) => ({
		schoolId: t.exposeID('schoolId'),
		school: t.exposeString('school', { description: "The school's name" }),
		delegationCount: t.exposeInt('delegationCount'),
		delegationMembers: t.exposeInt('delegationMembers'),
		singleParticipants: t.exposeInt('singleParticipants'),
		sumParticipants: t.exposeInt('sumParticipants')
	})
});

schemaBuilder.objectField(ConferenceRef, 'schools', (t) =>
	t.field({
		description:
			'The people of applied registrations grouped by their own school, which is how the organizers see which schools are sending how many people.',
		type: [ConferenceSchools],
		// registrations and schools coming or going; changes to counted rows are each row's
		subscribe: (subscriptions) => {
			for (const pubsub of [
				schoolPubsub,
				conferenceParticipantPubsub,
				delegationPubsub,
				delegationMemberPubsub,
				singleParticipantPubsub
			]) {
				pubsub.registerOnInstance({ instance: subscriptions, action: 'created' });
				pubsub.registerOnInstance({ instance: subscriptions, action: 'removed' });
			}
		},
		resolve: async (conference, _args, ctx) => {
			const registrations = await loadSchoolRegistrations(
				await readableSchoolRegistrations({ ctx, conferenceId: conference.id })
			);
			const sources = schoolRowSources(registrations);
			return schoolRows(registrations).map((row) => ({
				...row,
				sources: sources.get(row.schoolId)
			}));
		}
	})
);

schemaBuilder.mutationFields((t) => ({
	analyzeSchoolSuggestions: t.field({
		description:
			"Looks for groups of similar school names among the people of the conference's applications (participant care) and brings the suggestions in line with them: a group found again keeps its decision, groups no longer found are removed.",
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanAnalyzeSchoolSuggestions({ ctx, conferenceId: args.conferenceId });
			await refreshSchoolSuggestions({
				conferenceId: args.conferenceId,
				readable: await readableSchoolRegistrations({ ctx, conferenceId: args.conferenceId })
			});
			return true;
		}
	}),

	dismissSchoolSuggestion: t.field({
		description:
			'Marks a suggested group of similar school names as no duplicates (participant care), so it is not suggested again.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await updateIfAllowed({
				ctx,
				table: 'schoolSuggestion',
				id: args.id,
				values: { dismissed: true }
			});
			schoolSuggestionPubsub.updated(args.id);
			return true;
		}
	})
}));
