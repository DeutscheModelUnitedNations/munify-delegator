// file initialized by the Paraglide-SvelteKit CLI - Feel free to edit it
import { sequence } from '@sveltejs/kit/hooks';
import { i18n } from '$lib/i18n';
import type { HandleServerError } from '@sveltejs/kit';
import registerTasks from './tasks/registerTasks';
import { test } from './tasks/test';
import schedule from 'node-schedule';

// add your own hooks as part of the sequence here
export const handle = sequence(i18n.handle(), async ({ event, resolve }) => {
	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name.startsWith('x-') || name.toLowerCase() === 'content-type'
	});

	const test = schedule.scheduleJob('* * * * *', function () {
		console.log('This runs every minute');
		fetch('https://hooks.slack.com/services/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', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text: 'Heartbeat'
			})
		});
	});

	return response;
});
