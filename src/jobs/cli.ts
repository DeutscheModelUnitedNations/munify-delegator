import { defineCommand, runMain } from 'citty';
import { DEFAULT_RETENTION_DAYS } from './retention';

/**
 * One-shot background jobs, run by an external scheduler (a cron job, a Dokploy schedule) as
 * `delegator-jobs <command>` from the jobs image (`Dockerfile.jobs`), after avv's `jobs` CLI.
 * Every command is imported when it runs, so a command only needs what it uses.
 */

const invitationCleanup = defineCommand({
	meta: {
		description: 'Delete team member invitations that expired a while ago'
	},
	args: {
		'retention-days': {
			type: 'string',
			description: 'Days an invitation is kept after it expired',
			default: String(DEFAULT_RETENTION_DAYS)
		},
		'dry-run': {
			type: 'boolean',
			description: 'Only count what would be deleted',
			default: false
		}
	},
	async run({ args }) {
		const retentionDays = Number(args['retention-days']);
		if (!Number.isInteger(retentionDays) || retentionDays < 0) {
			throw new Error(
				`--retention-days must be a whole number of days, got "${args['retention-days']}"`
			);
		}
		const { runInvitationCleanup } = await import('./invitationCleanup');
		console.info('Starting invitation-cleanup job');
		await runInvitationCleanup({ retentionDays, dryRun: args['dry-run'] });
		process.exit(0);
	}
});

const refreshStatistics = defineCommand({
	meta: { description: 'Refresh the statistics materialized views' },
	async run() {
		const { runRefreshStatistics } = await import('./refreshStatistics');
		console.info('Starting refresh-statistics job');
		await runRefreshStatistics();
		process.exit(0);
	}
});

const mailSync = defineCommand({
	meta: { description: 'Sync users and their conference lists with Listmonk' },
	async run() {
		const { runMailSync } = await import('./mailSync/orchestrator');
		await runMailSync();
		// the sync reports its failures through the exit code instead of throwing
		process.exit();
	}
});

const main = defineCommand({
	meta: {
		name: 'delegator-jobs',
		description: 'MUNify DELEGATOR background job runner'
	},
	subCommands: {
		'invitation-cleanup': invitationCleanup,
		'mail-sync': mailSync,
		'refresh-statistics': refreshStatistics
	}
});

runMain(main).catch((error) => {
	console.error(error);
	process.exit(1);
});
