import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { callerUserId } from '#api/services/authHelper/utils';
import {
	checkInvitationEmails,
	createInvitations,
	regenerateInvitation,
	revokeInvitation
} from './teamMemberInvitationService';
import { teamMemberInvitationPubsub, teamMemberPubsub } from '#api/pubsub';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';
import {
	assertCanGrantInvitationRole,
	assertCanManageInvitations,
	assertCanUpdateInvitation,
	registerTeamMemberInvitationAbilities
} from './teamMemberInvitationPermissions';

registerTeamMemberInvitationAbilities();

object({
	table: 'teamMemberInvitation',
	adjust: (t) => ({
		/** Whether the invited address already has an account, which changes the invitation copy. */
		userExists: t.field({
			type: 'Boolean',
			resolve: async (invitation) =>
				(await db.query.user.findFirst({
					where: { email: invitation.email },
					columns: { id: true }
				})) !== undefined
		})
	})
});
query({ table: 'teamMemberInvitation' });
const teamRoleEnum = enum_({ tsName: 'teamRole' });

const CreateInvitationInput = schemaBuilder.inputType('CreateInvitationInput', {
	fields: (t) => ({
		email: t.string({ required: true }),
		role: t.field({ type: teamRoleEnum, required: true })
	})
});

const CreatedInvitation = schemaBuilder.simpleObject('CreatedInvitation', {
	fields: (t) => ({
		id: t.string(),
		email: t.string(),
		role: t.string(),
		/** Plaintext, for copy-to-clipboard. Null when the user was added directly. */
		token: t.string({ nullable: true }),
		expiresAt: t.field({ type: 'DateTime' }),
		addedDirectly: t.boolean()
	})
});

const InvitationError = schemaBuilder.simpleObject('InvitationError', {
	fields: (t) => ({ email: t.string(), error: t.string() })
});

const CreateInvitationsResult = schemaBuilder.simpleObject('CreateInvitationsResult', {
	fields: (t) => ({
		created: t.field({ type: [CreatedInvitation] }),
		errors: t.field({ type: [InvitationError] })
	})
});

const RevokeInvitationResult = schemaBuilder.simpleObject('RevokeInvitationResult', {
	fields: (t) => ({ success: t.boolean(), message: t.string({ nullable: true }) })
});

const RegenerateInvitationResult = schemaBuilder.simpleObject('RegenerateInvitationResult', {
	fields: (t) => ({
		success: t.boolean(),
		newToken: t.string({ nullable: true }),
		newExpiresAt: t.field({ type: 'DateTime', nullable: true }),
		message: t.string({ nullable: true })
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Invites several people at once. Each address is handled independently: one failure is
	 * reported in `errors` and the rest still go through, which is why this returns a result
	 * object rather than throwing.
	 */
	createTeamMemberInvitations: t.field({
		type: CreateInvitationsResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			invitations: t.arg({ type: [CreateInvitationInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			const callerId = callerUserId(ctx);
			if (!callerId) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}
			await assertCanManageInvitations(ctx, args.conferenceId);

			const result = await createInvitations(
				callerId,
				ctx.requestUrl().origin,
				args.conferenceId,
				args.invitations,
				(role) => assertCanGrantInvitationRole(ctx, args.conferenceId, role)
			);

			teamMemberInvitationPubsub.created();
			teamMemberPubsub.created();

			return result;
		}
	}),

	revokeTeamMemberInvitation: t.field({
		type: RevokeInvitationResult,
		args: { invitationId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const invitation = await assertCanUpdateInvitation(ctx, args.invitationId);
			const result = await revokeInvitation(invitation);
			if (!result.success) return result;

			teamMemberInvitationPubsub.updated(args.invitationId);

			return result;
		}
	}),

	regenerateTeamMemberInvitation: t.field({
		type: RegenerateInvitationResult,
		args: {
			invitationId: t.arg.id({ required: true }),
			sendEmail: t.arg.boolean({ defaultValue: false })
		},
		resolve: async (_root, args, ctx) => {
			const callerId = callerUserId(ctx);
			if (!callerId) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}

			const invitation = await assertCanUpdateInvitation(ctx, args.invitationId);
			const result = await regenerateInvitation(
				invitation,
				callerId,
				ctx.requestUrl().origin,
				args.sendEmail
			);
			if (result.success) teamMemberInvitationPubsub.updated(args.invitationId);

			return result;
		}
	})
}));

const CheckEmailInput = schemaBuilder.inputType('CheckEmailInput', {
	fields: (t) => ({ email: t.string({ required: true }) })
});

const EmailStatusResult = schemaBuilder.simpleObject('EmailStatusResult', {
	fields: (t) => ({
		email: t.string(),
		/** One of: already_member, pending_invitation, exists, new_user. */
		status: t.string(),
		userId: t.string({ nullable: true }),
		pendingInvitationId: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * Tells the invite form what will happen to each address before anything is sent: already on
	 * the team, already invited, a known user who would be added directly, or a genuinely new one.
	 */
	checkTeamInvitationEmails: t.field({
		type: [EmailStatusResult],
		args: {
			conferenceId: t.arg.id({ required: true }),
			emails: t.arg({ type: [CheckEmailInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageInvitations(ctx, args.conferenceId);

			return checkInvitationEmails(args.conferenceId, args.emails);
		}
	})
}));
