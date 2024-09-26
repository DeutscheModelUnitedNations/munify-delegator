import schedule from 'node-schedule';
import { config } from './config';
import { tasksDb } from './tasksDb';

// offene Bewerbungen Delegationen -> 30 User in 16 Delegationen
// abgeschlossene Bewerbungen Delegationen

// offene Einzelbewerbung
// abgeschlossene Einzelbewerbung

// offene Pressebewerbung
// abgeschlossene Pressebewerbung

// Betreuer*innen

// OFFENE BEWERBUNGEN GESAMT
// ABGESCHLOSSENE BEWERBUNGEN GESAMT

if (config.SLACK_NOTIFICATION_WEBHOOK) {
	const test = schedule.scheduleJob('* * * * * *', async function () {
		console.info('Sending Conference Update to Slack');

		const conferencesWithOpenRegistration = await tasksDb.conference.findMany({
			where: {
				startRegistration: {
					lte: new Date()
				},
				endRegistration: {
					gte: new Date()
				}
			},
			include: {
				delegations: {
					include: {
						members: true
					}
				},
				singleParticipant: {
					include: {
						appliedForRoles: true
					}
				},
				individualApplicationOptions: true,
				conferenceSupervisors: true
			}
		});

		for (const conference of conferencesWithOpenRegistration) {
			const openApplicationsDelegations = conference.delegations.filter(
				(delegation) => !delegation.applied
			);
			const closedApplicationsDelegations = conference.delegations.filter(
				(delegation) => delegation.applied
			);
			const openApplicationsDelegationsMembers = openApplicationsDelegations.reduce(
				(acc, delegation) => acc + delegation.members.length,
				0
			);
			const closedApplicationsDelegationsMembers = closedApplicationsDelegations.reduce(
				(acc, delegation) => acc + delegation.members.length,
				0
			);
			const openApplicationsSingle = conference.singleParticipant.filter(
				(application) => !application.applied
			);
			const closedApplicationsSingle = conference.singleParticipant.filter(
				(application) => application.applied
			);
			const supervisors = conference.conferenceSupervisors.length;
			const openApplications = openApplicationsDelegationsMembers + openApplicationsSingle.length;
			const closedApplications =
				closedApplicationsDelegationsMembers + closedApplicationsSingle.length;

			const blocksForIndividualApplications = conference.individualApplicationOptions.map(
				(role) => {
					const openApplications = openApplicationsSingle.filter((application) =>
						application.appliedForRoles.find((appliedRole) => appliedRole.id === role.id)
					);
					const closedApplications = closedApplicationsSingle.filter((application) =>
						application.appliedForRoles.find((appliedRole) => appliedRole.id === role.id)
					);

					return {
						name: role.name,
						openApplications: openApplications.length,
						closedApplications: closedApplications.length
					};
				}
			);

			const res = await fetch(config.SLACK_NOTIFICATION_WEBHOOK!, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					blocks: [
						{
							type: 'header',
							text: {
								type: 'plain_text',
								text: `Konferenz-Update: ${conference.title}`
							}
						},
						{
							type: 'rich_text',
							elements: [
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Offene Bewerbungen: ${openApplications}`
										}
									]
								}
							]
						}
					]
				})
			});

			if (res.ok) {
				console.info(`Slack notification for ${conference.title} sent`);
			} else {
				console.error(`Slack notification for ${conference.title} errored`, await res.text());
			}
		}
	});
} else {
	console.warn('You need to specify the SLACK_NOTIFICATION_WEBHOOK env to use the slack bot!');
}
