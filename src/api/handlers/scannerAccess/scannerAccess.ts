import { schemaBuilder } from '#api/rumble';
import { scannerAccessPubsub, teamMemberPubsub } from '#api/pubsub';
import { smtpDelivery } from '#api/handlers/postalScan/smtpConfig';
import {
	assertCanCreateScannerAccess,
	assertCanDeleteScannerAccess,
	assertCanRenewScannerAccess,
	assertCanSeeTeamScannerAccesses,
	assertOwnScannerTeamMember
} from './scannerAccessPermissions';
import {
	createScannerAccess,
	deleteScannerAccess,
	renewScannerAccess,
	scannerAccessesOf,
	scannerNameSchema,
	teamScannerAccesses
} from './scannerAccessService';

const ScannerAccessRef = schemaBuilder.simpleObject('ScannerAccess', {
	description:
		"One of the caller's logins for their scanners. Its password is never answered again.",
	fields: (t) => ({
		id: t.id(),
		name: t.string(),
		username: t.string(),
		lastUsedAt: t.field({ type: 'DateTime', nullable: true }),
		expiresAt: t.field({
			type: 'DateTime',
			description: 'From then on it delivers nothing until it is renewed.'
		})
	})
});

const TeamScannerAccessRef = schemaBuilder.simpleObject('TeamScannerAccess', {
	description: 'A scanner login of somebody on the team, for project management.',
	fields: (t) => ({
		id: t.id(),
		name: t.string(),
		ownerGivenName: t.string({ nullable: true }),
		ownerFamilyName: t.string({ nullable: true }),
		lastUsedAt: t.field({ type: 'DateTime', nullable: true }),
		expiresAt: t.field({ type: 'DateTime' })
	})
});

const NewScannerAccessRef = schemaBuilder.simpleObject('NewScannerAccess', {
	description: 'A login just made, with its password, which is shown this once.',
	fields: (t) => ({
		id: t.id(),
		name: t.string(),
		username: t.string(),
		password: t.string()
	})
});

const SmtpDeliveryRef = schemaBuilder.simpleObject('SmtpDelivery', {
	description: 'Where scanners send their emails.',
	fields: (t) => ({
		host: t.string(),
		port: t.int(),
		security: t.string({ description: '`TLS` from the start, or `STARTTLS`.' })
	})
});

type Subscriptions = Parameters<typeof scannerAccessPubsub.registerOnInstance>[0]['instance'];

/** Makes a field hear of every change of a login, and of who is on a team. */
function listenToAccesses(instance: Subscriptions) {
	for (const table of [scannerAccessPubsub, teamMemberPubsub]) {
		for (const action of ['created', 'removed', 'updated'] as const) {
			table.registerOnInstance({ instance, action });
		}
	}
}

schemaBuilder.queryFields((t) => ({
	myScannerAccesses: t.field({
		description:
			"The caller's scanner logins in the conference, which scanners deliver postal registration scans with by email or WebDAV. FORBIDDEN unless they manage its participants (project management and participant care).",
		type: [ScannerAccessRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		smartSubscription: true,
		subscribe: listenToAccesses,
		resolve: async (_root, { conferenceId }, ctx) => {
			const { teamMemberId } = await assertOwnScannerTeamMember({ ctx, conferenceId });
			return scannerAccessesOf(teamMemberId);
		}
	}),

	teamScannerAccesses: t.field({
		description:
			"Every scanner login of the conference's team, with whose it is. FORBIDDEN unless the caller manages the conference (project management).",
		type: [TeamScannerAccessRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		smartSubscription: true,
		subscribe: listenToAccesses,
		resolve: async (_root, { conferenceId }, ctx) => {
			await assertCanSeeTeamScannerAccesses({ ctx, conferenceId });
			return teamScannerAccesses(conferenceId);
		}
	}),

	smtpDelivery: t.field({
		description: 'Where scanners send their emails; null when this instance takes none.',
		type: SmtpDeliveryRef,
		nullable: true,
		resolve: (_root, _args, ctx) => {
			ctx.mustBeLoggedIn();
			return smtpDelivery();
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	createScannerAccess: t.field({
		description:
			'Makes a scanner login of the caller in the conference, with a password answered this once. What a scanner delivers with it counts as theirs, and they are told when it cannot be matched. FORBIDDEN unless they manage its participants; CONFLICT once they have too many.',
		type: NewScannerAccessRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }).validate(scannerNameSchema)
		},
		resolve: async (_root, { conferenceId, name }, ctx) => {
			const { teamMemberId } = await assertCanCreateScannerAccess({ ctx, conferenceId });
			return createScannerAccess({ teamMemberId, name });
		}
	}),

	renewScannerAccess: t.field({
		description: "Lets one of the caller's scanner logins work for another half year.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, { id }, ctx) => {
			await assertCanRenewScannerAccess({ ctx, id });
			await renewScannerAccess(id);
			return true;
		}
	}),

	deleteScannerAccess: t.field({
		description:
			"Removes a scanner login: the scanner delivers nothing more. The caller's own, or any of a conference they manage (project management).",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, { id }, ctx) => {
			await assertCanDeleteScannerAccess({ ctx, id });
			await deleteScannerAccess(id);
			return true;
		}
	})
}));
