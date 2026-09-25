import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	isSystemAdmin,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

// Ported from abilities/entities/attendanceEntry.ts
abilityBuilder.attendanceEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own attendance entries.
abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { conferenceParticipantStatus: { user: { id } } } } : undefined;
});

// Every team member of the conference may read them.
abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
	const conferenceParticipantStatus = isTeamMemberOfConference(ctx);
	return conferenceParticipantStatus ? { where: { conferenceParticipantStatus } } : undefined;
});

// Participant care and project management manage them.
abilityBuilder.attendanceEntry.allow(['update', 'delete']).when((ctx) => {
	const conferenceParticipantStatus = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return conferenceParticipantStatus ? { where: { conferenceParticipantStatus } } : undefined;
});

export const AttendanceEntryRef = object({ table: 'attendanceEntry' });
query({ table: 'attendanceEntry' });

schemaBuilder.mutationFields((t) => ({
	createAttendanceEntry: t.drizzleField({
		type: AttendanceEntryRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			occasion: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw new GraphQLError('Must be logged in');
			}
			if (!args.occasion.trim()) {
				throw new GraphQLError('Occasion must not be empty.');
			}

			// Any team member of the conference may record attendance, not just management - and a
			// system admin passes without being on the team. Both match the legacy resolver.
			if (!isSystemAdmin(ctx)) {
				const teamMember = await db.query.teamMember.findFirst({
					where: { conferenceId: args.conferenceId, userId: callerId }
				});
				if (!teamMember) {
					throw new GraphQLError('Only team members can create attendance entries.');
				}
			}

			// The participant status row is created on demand, as the legacy upsert did. The no-op
			// `set` is how Postgres returns the existing row on conflict.
			const status = await db
				.insert(schema.conferenceParticipantStatus)
				.values({ userId: args.userId, conferenceId: args.conferenceId })
				.onConflictDoUpdate({
					target: [
						schema.conferenceParticipantStatus.userId,
						schema.conferenceParticipantStatus.conferenceId
					],
					set: { userId: args.userId }
				})
				.returning()
				.then(assertFirstEntryExists);

			const created = await db
				.insert(schema.attendanceEntry)
				.values({
					conferenceParticipantStatusId: status.id,
					occasion: args.occasion,
					recordedById: callerId
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.attendanceEntry
				.findFirst(
					query(
						ctx.abilities.attendanceEntry.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteAttendanceEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.attendanceEntry)
				.where(
					ctx.abilities.attendanceEntry.filter('delete').merge({ where: { id: args.id } }).sql.where
				)
				.returning({ id: schema.attendanceEntry.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Attendance entry not found, or not yours to delete');
			}
			return true;
		}
	})
}));
