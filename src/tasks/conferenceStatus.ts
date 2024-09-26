import schedule from 'node-schedule';
import { config } from './config';
import { tasksDb } from './tasksDb';
import { IncomingWebhook } from '@slack/webhook';

if (config.SLACK_NOTIFICATION_WEBHOOK) {
	const webhook = new IncomingWebhook(config.SLACK_NOTIFICATION_WEBHOOK!);

	const test = schedule.scheduleJob('* * * * *', async function () {
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

			try {
				await webhook.send({
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
											text: conference.start
												? `Noch ${Math.ceil((conference.start?.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Tage bis zur Konferenz (Start am ${conference.start.toLocaleDateString(
														'de',
														{ day: '2-digit', month: '2-digit', year: 'numeric' }
													)})`
												: 'Kein Konferenzdatum festgelegt'
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: conference.endRegistration
												? `Anmeldung noch ${Math.ceil((conference.endRegistration?.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Tage offen (bis ${conference.endRegistration.toLocaleDateString(
														'de',
														{ day: '2-digit', month: '2-digit', year: 'numeric' }
													)})`
												: 'Kein Anmeldeschluss festgelegt'
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: ' '
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Offene Anmeldungen: `
										},
										{
											type: 'text',
											style: { code: true, bold: true },
											text: `${openApplications}`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Abgeschlossene Anmeldungen: `
										},
										{
											type: 'text',
											style: { code: true },
											text: `${closedApplications}`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: ' '
										}
									]
								}
							]
						},
						{
							type: 'divider'
						},
						{
							type: 'rich_text',
							elements: [
								{
									type: 'rich_text_section',
									elements: [
										{
											style: { bold: true },
											type: 'text',
											text: `Delegationen`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Offene Anmeldungen: `
										},
										{
											type: 'text',
											style: { code: true, bold: true },
											text: `${openApplicationsDelegationsMembers}`
										},
										{
											type: 'text',
											text: ` Teilnehmende in `
										},
										{
											type: 'text',
											style: { code: true },
											text: `${openApplicationsDelegations.length}`
										},
										{
											type: 'text',
											text: ` Delegationen`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Abgeschlossene Anmeldungen: `
										},
										{
											type: 'text',
											style: { code: true },
											text: `${closedApplicationsDelegationsMembers}`
										},
										{
											type: 'text',
											text: ` Teilnehmende in `
										},
										{
											type: 'text',
											style: { code: true },
											text: `${closedApplicationsDelegations.length}`
										},
										{
											type: 'text',
											text: ` Delegationen`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: ' '
										}
									]
								}
							]
						},
						{
							type: 'divider'
						},
						{
							type: 'rich_text',
							elements: [
								{
									type: 'rich_text_section',
									elements: [
										{
											style: { bold: true },
											type: 'text',
											text: `Einzelbewerbungen`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Offene Anmeldungen: `
										},
										{
											type: 'text',
											style: { code: true, bold: true },
											text: `${openApplicationsSingle.length}`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Abgeschlossene Anmeldungen: `
										},
										{
											type: 'text',
											style: { code: true },
											text: `${closedApplicationsSingle.length}`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: ' '
										}
									]
								},
								{
									type: 'rich_text_list',
									elements: blocksForIndividualApplications.map((role) => ({
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `${role.name}: `
											},
											{
												type: 'text',
												style: { code: true, bold: true },
												text: `${role.openApplications}`
											},
											{
												type: 'text',
												text: ` offen   |   `
											},
											{
												type: 'text',
												style: { code: true, bold: true },
												text: `${role.closedApplications}`
											},
											{
												type: 'text',
												text: ` abgeschlossen`
											}
										]
									})),
									style: 'bullet',
									border: 1
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: ' '
										}
									]
								}
							]
						},
						{
							type: 'divider'
						},
						{
							type: 'rich_text',
							elements: [
								{
									type: 'rich_text_section',
									elements: [
										{
											style: { bold: true },
											type: 'text',
											text: `Betreuer*innen`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: `Angemeldete Betreuer*innen: `
										},
										{
											type: 'text',
											style: { code: true, bold: true },
											text: `${supervisors}`
										}
									]
								},
								{
									type: 'rich_text_section',
									elements: [
										{
											type: 'text',
											text: ' '
										}
									]
								}
							]
						},
						{
							type: 'divider'
						}
					]
				});

				console.info(`Slack notification for ${conference.title} sent`);
			} catch (error) {
				console.error(`Slack notification for ${conference.title} errored`, error);
			}
		}
	});
} else {
	console.warn('You need to specify the SLACK_NOTIFICATION_WEBHOOK env to use the slack bot!');
}
