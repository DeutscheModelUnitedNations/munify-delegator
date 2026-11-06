import { schemaBuilder } from '#api/rumble';
import { assertCanReadCollectiveGroups } from './collectiveGroupPermissions';
import { loadCollectiveGroups } from './collectiveGroupService';

const CollectiveGroupSchool = schemaBuilder.simpleObject('CollectiveGroupSchool', {
	description: 'The school of a group decided together.',
	fields: (t) => ({
		id: t.id(),
		name: t.string(),
		isForeignSchool: t.boolean({ description: 'An Auslandsschule.' })
	})
});

const CollectiveGroupMember = schemaBuilder.simpleObject('CollectiveGroupMember', {
	description: 'A delegation member of a group decided together.',
	fields: (t) => ({
		delegationMemberId: t.id(),
		delegationId: t.id({ description: 'The delegation whose review decides about the member.' })
	})
});

const CollectiveGroup = schemaBuilder.simpleObject('CollectiveGroup', {
	description:
		'The applied students of one supervisor from one school, as long as there are at most `conference.maxCollectiveGroupSize` of them: they all get a seat or none.',
	fields: (t) => ({
		key: t.string({ description: 'The supervisor and the school, as one key.' }),
		supervisorId: t.id({ description: 'The conference supervisor.' }),
		school: t.field({ type: CollectiveGroupSchool }),
		members: t.field({ type: [CollectiveGroupMember] }),
		singleParticipantIds: t.idList(),
		size: t.int({ description: 'Delegation members and single participants together.' })
	})
});

schemaBuilder.queryFields((t) => ({
	collectiveGroups: t.field({
		description:
			"The conference's groups decided together, by school name; none while the rule is switched off. A student with two supervisors is in two groups. Not live: ask again to see new supervisions. Participant care only (FORBIDDEN otherwise).",
		type: [CollectiveGroup],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReadCollectiveGroups({ ctx, conferenceId: args.conferenceId });
			return loadCollectiveGroups(args.conferenceId);
		}
	})
}));
