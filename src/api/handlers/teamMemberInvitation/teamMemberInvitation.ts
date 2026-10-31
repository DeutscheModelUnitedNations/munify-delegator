import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { callerUserId } from '#api/services/authHelper/utils';
import {
	checkInvitationEmails,
	createInvitations,
	regenerateInvitation,
	revokeInvitation
} from './teamMemberInvitationService';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import {
	assertCanManageInvitations,
	assertCanUpdateInvitation,
	partitionGrantableInvitations,
	registerTeamMemberInvitationAbilities
} from './teamMemberInvitationPermissions';

registerTeamMemberInvitationAbilities();

object({
	table: 'teamMemberInvitation',
	adjust: (t) => ({
		userExists: t.field({
			description:
				'Whether the invited address already has an account, which changes the invitation copy.',
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
		token: t.string({
			description: 'Plaintext, for copy-to-clipboard. Null when the user was added directly.',
			nullable: true
		}),
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
	createTeamMemberInvitations: t.field({
		description:
			'Invites several people at once. Each address is handled independently: one failure is reported in `errors` and the rest still go through, which is why this returns a result object rather than throwing.',
		type: CreateInvitationsResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			invitations: t.arg({ type: [CreateInvitationInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			const callerId = callerUserId(ctx);
			if (!callerId) {
				throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });
			}
			await assertCanManageInvitations({ ctx, conferenceId: args.conferenceId });
			const { grantable, refused } = await partitionGrantableInvitations({
				ctx,
				conferenceId: args.conferenceId,
				invitations: args.invitations
			});

			const result = await createInvitations({
				callerId,
				origin: ctx.requestUrl().origin,
				conferenceId: args.conferenceId,
				invitations: grantable
			});

			return { created: result.created, errors: [...refused, ...result.errors] };
		}
	}),

	revokeTeamMemberInvitation: t.field({
		description: 'Makes an invitation unusable, unless it was used already.',
		type: RevokeInvitationResult,
		args: { invitationId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const invitation = await assertCanUpdateInvitation({ ctx, invitationId: args.invitationId });
			return revokeInvitation(invitation);
		}
	}),

	regenerateTeamMemberInvitation: t.field({
		description:
			'Issues a fresh link for an invitation, with a new expiry; this also undoes a revocation. `sendEmail` mails the new link to the invitee.',
		type: RegenerateInvitationResult,
		args: {
			invitationId: t.arg.id({ required: true }),
			sendEmail: t.arg.boolean({ defaultValue: false })
		},
		resolve: async (_root, args, ctx) => {
			const callerId = callerUserId(ctx);
			if (!callerId) {
				throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });
			}

			const invitation = await assertCanUpdateInvitation({ ctx, invitationId: args.invitationId });
			return regenerateInvitation({
				invitation,
				callerId,
				origin: ctx.requestUrl().origin,
				sendEmail: args.sendEmail
			});
		}
	})
}));

const CheckEmailInput = schemaBuilder.inputType('CheckEmailInput', {
	fields: (t) => ({ email: t.string({ required: true }) })
});

const EmailStatusResult = schemaBuilder.simpleObject('EmailStatusResult', {
	fields: (t) => ({
		email: t.string(),
		status: t.string({
			description: 'One of: already_member, pending_invitation, exists, new_user.'
		}),
		userId: t.string({ nullable: true }),
		pendingInvitationId: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	checkTeamInvitationEmails: t.field({
		description:
			'Tells the invite form what will happen to each address before anything is sent: already on the team, already invited, a known user who would be added directly, or a genuinely new one.',
		type: [EmailStatusResult],
		args: {
			conferenceId: t.arg.id({ required: true }),
			emails: t.arg({ type: [CheckEmailInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageInvitations({ ctx, conferenceId: args.conferenceId });

			return checkInvitationEmails({ conferenceId: args.conferenceId, emails: args.emails });
		}
	})
}));
