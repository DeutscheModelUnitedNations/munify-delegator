import { config } from './config';
import { db } from '$api/db/db';
import { IncomingWebhook } from '@slack/webhook';
import { logTaskEnd, logTaskStart, taskWarning } from './logs';
import { conferenceStats } from '$api/services/statistics';
import fs from 'fs';
import { registerTask } from './registry';
import { conferenceStatusBlocks } from './conferenceStatusMessage';

// GLOBALS

const TASK_NAME = 'Conference Status Slack Notification';

// HELPER FUNCTIONS

function readHistoricStats(conferenceId: string) {
	try {
		const historicStatsRaw = fs.readFileSync(`./ephemeralData/${conferenceId}.json`, 'utf8');
		return historicStatsRaw ? JSON.parse(historicStatsRaw) : undefined;
	} catch {
		console.info('No historic stats found. Continuing without...');
		return undefined;
	}
}

function writeHistoricStats(conferenceId: string, stats: Record<string, unknown>) {
	try {
		if (!fs.existsSync('./ephemeralData')) {
			fs.mkdirSync('./ephemeralData');
		}
		fs.writeFileSync(`./ephemeralData/${conferenceId}.json`, JSON.stringify(stats));
	} catch (error) {
		console.error("Couldn't save stats to file", error);
	}
}

// MAIN TASK

async function runConferenceStatus(): Promise<void> {
	const webhook = new IncomingWebhook(config.SLACK_NOTIFICATION_WEBHOOK!);
	const startTime = logTaskStart(TASK_NAME);

	const conferencesWithOpenRegistration = await db.query.conference.findMany({
		where: { state: 'PARTICIPANT_REGISTRATION', startAssignment: { gte: new Date() } }
	});

	for (const conference of conferencesWithOpenRegistration) {
		const { countdowns, registrationStatistics: rs } = await conferenceStats({
			conferenceId: conference.id
		});

		// import historic stats from file
		const hs: typeof rs | undefined = readHistoricStats(conference.id);

		try {
			await webhook.send({
				blocks: conferenceStatusBlocks(conference, countdowns, rs, hs)
			});

			console.info(`Slack notification for ${conference.title} sent`);

			// save stats to file
			writeHistoricStats(conference.id, rs);
		} catch (error) {
			console.error(`Slack notification for ${conference.title} errored`, error);
		}
	}

	logTaskEnd(TASK_NAME, startTime);
}

if (config.SLACK_NOTIFICATION_WEBHOOK) {
	await registerTask('CONFERENCE_STATUS', TASK_NAME, runConferenceStatus);
} else {
	taskWarning(
		TASK_NAME,
		'You need to specify the SLACK_NOTIFICATION_WEBHOOK env to use the slack bot!'
	);
}
