import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import {
	checkInvitationEmails,
	createInvitations,
	INVITATION_EMAIL_STATUSES,
	invitationEmailsSchema,
	invitationsSchema,
	updateInvitation
} from './teamMemberInvitationService';
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
		id: t.id({ description: "The invitation's id, also for someone added directly." }),
		email: t.string(),
		role: t.field({ type: teamRoleEnum }),
		token: t.string({
			description: 'Plaintext, for copy-to-clipboard. Null when the user was added directly.',
			nullable: true
		}),
		expiresAt: t.field({ type: 'DateTime' }),
		addedDirectly: t.boolean({
			description: 'An existing account joined the team right away; nothing was mailed.'
		})
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

const RegeneratedInvitation = schemaBuilder.simpleObject('RegeneratedInvitation', {
	fields: (t) => ({
		token: t.string({ description: 'The new plaintext token, for copy-to-clipboard.' }),
		expiresAt: t.field({ type: 'DateTime' })
	})
});

schemaBuilder.mutationFields((t) => ({
	createTeamMemberInvitations: t.field({
		description:
			'Invites several people at once: an address with an account joins the team right away, any other gets a mailed link. Each address is handled independently: one failure (no valid address, already on the team or invited, taking part in the conference, a role the caller may not hand out) is reported in `errors` and the rest still go through, which is why this returns a result object rather than throwing. Project management invites to any role, team coordinators to any but project management.',
		type: CreateInvitationsResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			invitations: t
				.arg({ type: [CreateInvitationInput], required: true })
				.validate(invitationsSchema)
		},
		resolve: async (_root, args, ctx) => {
			const { callerId } = await assertCanManageInvitations({
				ctx,
				conferenceId: args.conferenceId
			});
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
		description:
			'Makes an invitation unusable. CONFLICT when it was revoked or used already, NOT_FOUND for one the caller may not manage.',
		type: 'Boolean',
		args: { invitationId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const invitation = await assertCanUpdateInvitation({ ctx, invitationId: args.invitationId });
			await updateInvitation({ invitation, revoke: true });
			return true;
		}
	}),

	regenerateTeamMemberInvitation: t.field({
		description:
			'Issues a fresh link for an invitation, with a new expiry; this also undoes a revocation. CONFLICT when it was used already, or the address has been invited again since it was revoked.',
		type: RegeneratedInvitation,
		args: {
			invitationId: t.arg.id({ required: true }),
			sendEmail: t.arg.boolean({
				defaultValue: false,
				description: 'Mails the new link to the invitee.'
			})
		},
		resolve: async (_root, args, ctx) => {
			const invitation = await assertCanUpdateInvitation({ ctx, invitationId: args.invitationId });
			return updateInvitation({
				invitation,
				regenerate: {
					callerId: ctx.mustBeLoggedIn().sub,
					origin: ctx.requestUrl().origin,
					sendEmail: args.sendEmail ?? false
				}
			});
		}
	})
}));

const TeamInvitationEmailStatus = schemaBuilder.enumType('TeamInvitationEmailStatus', {
	values: INVITATION_EMAIL_STATUSES
});

const EmailStatusResult = schemaBuilder.simpleObject('EmailStatusResult', {
	fields: (t) => ({
		email: t.string({ description: 'The address, trimmed and lowercased.' }),
		status: t.field({ type: TeamInvitationEmailStatus })
	})
});

schemaBuilder.queryFields((t) => ({
	checkTeamInvitationEmails: t.field({
		description:
			'Tells the invite form what will happen to each address before anything is sent: already on the team, already invited, a known account that would be added directly, or a new one. For whoever may invite to the conference (manageTeam).',
		type: [EmailStatusResult],
		args: {
			conferenceId: t.arg.id({ required: true }),
			emails: t.arg.stringList({ required: true }).validate(invitationEmailsSchema)
		},
		resolve: async (_root, args, ctx) => {
			await assertCanManageInvitations({ ctx, conferenceId: args.conferenceId });
			return checkInvitationEmails({ conferenceId: args.conferenceId, emails: args.emails });
		}
	})
}));
