import { schemaBuilder } from '#api/rumble';
import { scannerAccessPubsub, teamMemberPubsub } from '#api/pubsub';
import {
	assertCanCreateScannerAccess,
	assertCanDeleteScannerAccess,
	assertCanRenewScannerAccess,
	assertOwnScannerAccesses,
	canUseScanners
} from './scannerAccessPermissions';
import {
	createScannerAccess,
	deleteScannerAccess,
	renewScannerAccess,
	scannerAccessesOf,
	scannerNameSchema
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

const NewScannerAccessRef = schemaBuilder.simpleObject('NewScannerAccess', {
	description: 'A login just made, with its password, which is shown this once.',
	fields: (t) => ({
		id: t.id(),
		name: t.string(),
		username: t.string(),
		password: t.string()
	})
});

const MyScannersRef = schemaBuilder.simpleObject('MyScanners', {
	description: "The caller's scanners.",
	fields: (t) => ({
		allowed: t.boolean({
			description:
				'Whether they manage the participants of some conference (project management and participant care), so a scanner of theirs could deliver.'
		}),
		accesses: t.field({ type: [ScannerAccessRef] })
	})
});

schemaBuilder.queryFields((t) => ({
	myScanners: t.field({
		description:
			"The caller's scanner logins, which scanners deliver postal registration scans with over WebDAV, into every conference whose participants they manage.",
		type: MyScannersRef,
		smartSubscription: true,
		// they are no rows of their own: any change of a login, and of who is on a team
		subscribe: (instance) => {
			for (const table of [scannerAccessPubsub, teamMemberPubsub]) {
				for (const action of ['created', 'removed', 'updated'] as const) {
					table.registerOnInstance({ instance, action });
				}
			}
		},
		resolve: async (_root, _args, ctx) => {
			const { userId } = assertOwnScannerAccesses(ctx);
			const [allowed, accesses] = await Promise.all([
				canUseScanners(ctx),
				scannerAccessesOf(userId)
			]);
			return { allowed, accesses };
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	createScannerAccess: t.field({
		description:
			'Makes a scanner login of the caller, with a password answered this once. What a scanner delivers with it counts as theirs, and they are told when it cannot be matched. FORBIDDEN unless they manage the participants of some conference; CONFLICT once they have too many.',
		type: NewScannerAccessRef,
		args: {
			name: t.arg.string({ required: true }).validate(scannerNameSchema)
		},
		resolve: async (_root, { name }, ctx) => {
			const { userId } = await assertCanCreateScannerAccess(ctx);
			return createScannerAccess({ userId, name });
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
		description: "Removes one of the caller's scanner logins: the scanner delivers nothing more.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, { id }, ctx) => {
			await assertCanDeleteScannerAccess({ ctx, id });
			await deleteScannerAccess(id);
			return true;
		}
	})
}));
