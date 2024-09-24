import schedule from 'node-schedule';

export const test = schedule.scheduleJob('* * * * *', function () {
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
