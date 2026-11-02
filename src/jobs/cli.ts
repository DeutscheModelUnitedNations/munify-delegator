import { defineCommand, runMain } from 'citty';
import { DEFAULT_RETENTION_DAYS } from './retention';
import { DEFAULT_GRACE_HOURS } from './fileReferences';
import { runJob } from './logs';

/**
 * One-shot background jobs, run by an external scheduler (a cron job, a Dokploy schedule) as
 * `delegator-jobs <command>` from the jobs image (`Dockerfile.jobs`), after avv's `jobs` CLI.
 * Every command is imported when it runs, so a command only needs what it uses, and runs through
 * `runJob`, which logs its start, end and failure and sets the exit code the scheduler sees.
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
	run: ({ args }) =>
		runJob({
			job: 'invitation-cleanup',
			async run() {
				const retentionDays = Number(args['retention-days']);
				if (!Number.isInteger(retentionDays) || retentionDays < 0) {
					throw new Error(
						`--retention-days must be a whole number of days, got "${args['retention-days']}"`
					);
				}
				const { runInvitationCleanup } = await import('./invitationCleanup');
				await runInvitationCleanup({ retentionDays, dryRun: args['dry-run'] });
			}
		})
});

const fileCleanup = defineCommand({
	meta: {
		description: 'Delete uploaded files nothing uses any more, and objects without a file'
	},
	args: {
		'grace-hours': {
			type: 'string',
			description: 'Hours an unused upload is kept, so a form being saved can still claim it',
			default: String(DEFAULT_GRACE_HOURS)
		},
		'dry-run': {
			type: 'boolean',
			description: 'Only count what would be deleted',
			default: false
		}
	},
	run: ({ args }) =>
		runJob({
			job: 'file-cleanup',
			async run() {
				const graceHours = Number(args['grace-hours']);
				if (!Number.isFinite(graceHours) || graceHours < 1) {
					throw new Error(`--grace-hours must be at least 1, got "${args['grace-hours']}"`);
				}
				const { runFileCleanup } = await import('./fileCleanup');
				await runFileCleanup({ graceHours, dryRun: args['dry-run'] });
			}
		})
});

const refreshStatistics = defineCommand({
	meta: { description: 'Refresh the statistics materialized views' },
	run: () =>
		runJob({
			job: 'refresh-statistics',
			async run() {
				const { runRefreshStatistics } = await import('./refreshStatistics');
				await runRefreshStatistics();
			}
		})
});

const mailSync = defineCommand({
	meta: { description: 'Sync users and their conference lists with Listmonk' },
	run: () =>
		runJob({
			job: 'mail-sync',
			// the sync reports its failures through the exit code instead of throwing
			async run() {
				const { runMailSync } = await import('./mailSync/orchestrator');
				await runMailSync();
			}
		})
});

const sendEmails = defineCommand({
	meta: {
		description: 'Send the automatic emails that are due'
	},
	run: () =>
		runJob({
			job: 'send-emails',
			async run() {
				const { runSendEmails } = await import('./sendEmails');
				await runSendEmails();
			}
		})
});

const main = defineCommand({
	meta: {
		name: 'delegator-jobs',
		description: 'MUNify DELEGATOR background job runner'
	},
	subCommands: {
		'file-cleanup': fileCleanup,
		'invitation-cleanup': invitationCleanup,
		'mail-sync': mailSync,
		'refresh-statistics': refreshStatistics,
		'send-emails': sendEmails
	}
});

// a command's own failures are `runJob`'s to log; what reaches citty is a usage error, which it
// prints with the usage
void runMain(main);
