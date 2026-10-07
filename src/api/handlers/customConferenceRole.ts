import { abilityBuilder, object, query } from '$api/rumble';
import { systemAdmin } from '$api/services/authHelper';
import { assignmentVisible } from '$api/services/assignmentVisibility';

// Custom roles come with the conference's seeding document and are read-only in the app.
abilityBuilder.customConferenceRole.allow('read');
abilityBuilder.customConferenceRole.allow(['update', 'delete']).when(systemAdmin);

export const CustomConferenceRoleRef = object({
	table: 'customConferenceRole',
	adjust: (t) => ({
		// Who holds a role is part of the assignment, which participants only see once it is
		// released.
		singleParticipantAssignments: t.relation('singleParticipantAssignments', {
			query: async (_args, ctx) =>
				(await ctx.abilities.singleParticipant.filter('read')).merge({
					where: assignmentVisible(ctx)
				}).query.many
		})
	})
});
query({ table: 'customConferenceRole' });
