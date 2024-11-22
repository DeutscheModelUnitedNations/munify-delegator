import { config } from './config';
import { IncomingWebhook, type IncomingWebhookSendArguments } from '@slack/webhook';

export function logLoading(taskName: string, schedule: string) {
	console.info(`Loading Task: ${taskName}`);
	console.info(`    -> Schedule: ${schedule}`);
}

export function logTaskStart(taskName: string) {
	console.info(`Started Task: ${taskName}`);
	console.info('----');
	return new Date().getTime();
}

export function logTaskEnd(taskName: string, startTime?: number) {
	console.info('----');
	console.info(
		`Finished Task: ${taskName} ${startTime ? `(in ${new Date().getTime() - startTime}ms)` : ''}`
	);
}

export function taskWarning(taskName: string, message: string) {
	console.warn(`Warning in task "${taskName}" - ${message}`);
}

export function taskError(taskName: string, message: string, error?: string | Error) {
	console.error(`Error in task "${taskName}" - ${message}`);
	slackNotification([
		{
			type: 'rich_text',
			elements: [
				{
					type: 'rich_text_section',
					elements: [
						{
							type: 'emoji',
							name: 'warning'
						},
						{
							type: 'text',
							style: { bold: true },
							text: ` Error in task "${taskName}"`
						}
					]
				},
				{
					type: 'rich_text_section',
					elements: [
						{
							type: 'text',
							text: message
						}
					]
				},
				{
					type: 'rich_text_preformatted',
					elements: [
						{
							type: 'text',
							text: error ? error.toString() : 'No error message provided'
						}
					]
				}
			]
		}
	]);
}

export function slackNotification(blocks: IncomingWebhookSendArguments['blocks']) {
	if (config.SLACK_ERROR_WEBHOOK) {
		const webhook = new IncomingWebhook(config.SLACK_ERROR_WEBHOOK!);
		webhook.send({
			blocks
		});
	}
}
