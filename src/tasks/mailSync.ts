import schedule from 'node-schedule';
import { config } from './config';
import { tasksDb } from './tasksDb';
import { logLoading, logTaskEnd, logTaskStart, taskError, taskWarning } from './logs';
import { listmonkClient } from './apis/listmonk/listmonkClient';
import type {
	User as BaseUser,
	Conference,
	ConferenceSupervisor,
	Delegation,
	DelegationMember,
	SingleParticipant,
	TeamMember
} from '@prisma/client';
import formatNames from '$lib/services/formatNames';
import deepEquals from './helper/deepEquals';
import { Command } from 'commander';
import { argv } from 'process';
import dayjs from 'dayjs';

// GLOBALS

const TASK_NAME = 'Mail Service: Sync with Listmonk';
const CRON = '0 */15 * * * *';

const requiredListsGlobal = ['DMUN_NEWSLETTER', 'DMUN_TEAM_TENDERS'];

const requiredListsPerConference = [
	'REGISTRATION_NOT_COMPLETED',
	'REGISTRATION_COMPLETED',
	'REJECTED_PARTICIPANTS',
	'DELEGATION_MEMBERS_NATIONS',
	'DELEGATION_MEMBERS_NSA',
	'SINGLE_PARTICIPANTS',
	'HEAD_DELEGATES',
	// "NO_POSTAL_REGISTRATION",
	// "NO_PAYMENT",
	'SUPERVISORS',
	'SUPERVISORS_REGISTRATION_NOT_COMPLETED',
	'TEAM'
] as const;

// TYPES

interface User extends BaseUser {
	delegationMemberships: (DelegationMember & {
		delegation: Delegation & {
			conference: Conference;
		};
	})[];
	singleParticipant: (SingleParticipant & {
		conference: Conference;
	})[];
	conferenceSupervisor: (ConferenceSupervisor & {
		conference: Conference;
		supervisedDelegationMembers: (DelegationMember & { delegation: Delegation })[];
		supervisedSingleParticipants: SingleParticipant[];
	})[];
	teamMember: (TeamMember & {
		conference: Conference;
	})[];
}

interface Subscriber {
	id: number;
	created_at: string;
	updated_at: string;
	uuid: string;
	email: string;
	name: string;
	attribs: Attribs;
	status: string;
	lists: ListAtSubscribers[];
}

export interface Attribs {
	userId: string;
	conferences: {
		id: string;
		title: string;
		role:
			| 'DELEGATE_NATION'
			| 'DELEGATE_NSA'
			| 'SINGLE_PARTICIPANT'
			| 'SUPERVISOR'
			| 'PARTICIPANT_CARE'
			| 'PROJECT_MANAGEMENT'
			| 'MEMBER' // Team Member
			| undefined;
	}[];
}

export interface ListAtSubscribers {
	subscription_status: string;
	id: number;
	uuid: string;
	name: string;
	type: string;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface ListData {
	id: number;
	name: string;
	type: (typeof requiredListsPerConference)[number] | (typeof requiredListsGlobal)[number];
}

interface SubscriberObj {
	lists: string[];
	attribs: Attribs;
}

// HELPER FUNCTIONS

function shortenId(id: string) {
	return id.slice(0, 6);
}

function createGlobalList(listName: (typeof requiredListsGlobal)[number]) {
	return `[global] ${listName}`;
}

function createListName(
	conferenceTitle: string,
	conferenceId: string,
	listName: (typeof requiredListsPerConference)[number]
) {
	return `[${shortenId(conferenceId)}] ${conferenceTitle} - ${listName}`;
}

function createTagName(conferenceTitle: string, conferenceId: string) {
	return `${shortenId(conferenceId)}-${conferenceTitle.replace(' ', '_').toLowerCase()}`;
}

async function getSubscribers<T>(perPage: number): Promise<T[]> {
	let allEntries: T[] = [];
	let currentPage = 1;
	let totalEntries = 0;

	do {
		// Construct the API URL with the current page and per_page
		const res = await listmonkClient.GET('/subscribers', {
			params: {
				query: {
					per_page: perPage,
					page: currentPage
				}
			}
		});

		if (res.error || !res.data.data || !res.data.data.results || !res.data.data.total) {
			taskWarning(TASK_NAME, `Failed to fetch subscribers from Listmonk`);
			return [];
		}

		// Append the current page's entries to the allEntries array
		allEntries = [...allEntries, ...(res.data.data?.results ?? [])] as T[];

		// Update total entries and current page
		totalEntries = res.data.data.total;
		currentPage++;
	} while ((currentPage - 1) * perPage < totalEntries); // Ensure all pages are fetched

	return allEntries;
}

async function getUsers(): Promise<User[]> {
	const lt = dayjs().add(10, 'month').toDate();

	return await tasksDb.user.findMany({
		include: {
			delegationMemberships: {
				include: {
					delegation: {
						include: {
							conference: true
						}
					}
				}
			},
			singleParticipant: {
				include: {
					conference: true
				}
			},
			conferenceSupervisor: {
				include: {
					conference: true,
					supervisedDelegationMembers: {
						include: {
							delegation: true
						}
					},
					supervisedSingleParticipants: true
				}
			},
			teamMember: {
				include: {
					conference: true
				}
			}
		},
		where: {
			OR: [
				{
					delegationMemberships: {
						some: {
							conference: {
								endConference: {
									lt
								}
							}
						}
					}
				},
				{
					singleParticipant: {
						some: {
							conference: {
								endConference: {
									lt
								}
							}
						}
					}
				},
				{
					conferenceSupervisor: {
						some: {
							conference: {
								endConference: {
									lt
								}
							}
						}
					}
				},
				{
					teamMember: {
						some: {
							conference: {
								endConference: {
									lt
								}
							}
						}
					}
				}
			]
		}
	});
}

function constructSubscriberObjectFromUser(user: User): SubscriberObj {
	const attribs: SubscriberObj['attribs'] = {
		conferences: [],
		userId: user.id
	};

	const lists: string[] = [];

	// Assign Lists based on Roles at Conferences

	for (const dm of user.delegationMemberships) {
		attribs.conferences.push({
			id: dm.conferenceId,
			role: dm.delegation.assignedNationAlpha3Code
				? 'DELEGATE_NATION'
				: dm.delegation.assignedNonStateActorId
					? 'DELEGATE_NSA'
					: undefined,
			title: dm.delegation.conference.title
		});
		if (dm.delegation.assignedNationAlpha3Code) {
			lists.push(
				createListName(
					dm.delegation.conference.title,
					dm.conferenceId,
					'DELEGATION_MEMBERS_NATIONS'
				)
			);
		} else if (dm.delegation.assignedNonStateActorId) {
			lists.push(
				createListName(dm.delegation.conference.title, dm.conferenceId, 'DELEGATION_MEMBERS_NSA')
			);
		}
		if (
			dm.isHeadDelegate &&
			(dm.delegation.assignedNationAlpha3Code || dm.delegation.assignedNonStateActorId)
		) {
			lists.push(createListName(dm.delegation.conference.title, dm.conferenceId, 'HEAD_DELEGATES'));
		}

		if (
			dm.delegation.conference.state !== 'PARTICIPANT_REGISTRATION' &&
			!dm.delegation.assignedNationAlpha3Code &&
			!dm.delegation.assignedNonStateActorId
		) {
			lists.push(
				createListName(dm.delegation.conference.title, dm.conferenceId, 'REJECTED_PARTICIPANTS')
			);
		}

		if (dm.delegation.applied) {
			lists.push(
				createListName(dm.delegation.conference.title, dm.conferenceId, 'REGISTRATION_COMPLETED')
			);
		} else {
			lists.push(
				createListName(
					dm.delegation.conference.title,
					dm.conferenceId,
					'REGISTRATION_NOT_COMPLETED'
				)
			);
		}
	}

	for (const sp of user.singleParticipant) {
		attribs.conferences.push({
			id: sp.conferenceId,
			role: 'SINGLE_PARTICIPANT',
			title: sp.conference.title
		});

		if (sp.assignedRoleId) {
			lists.push(createListName(sp.conference.title, sp.conferenceId, 'SINGLE_PARTICIPANTS'));
		} else if (sp.conference.state !== 'PARTICIPANT_REGISTRATION') {
			lists.push(createListName(sp.conference.title, sp.conferenceId, 'REJECTED_PARTICIPANTS'));
		}

		if (sp.applied) {
			lists.push(createListName(sp.conference.title, sp.conferenceId, 'REGISTRATION_COMPLETED'));
		} else {
			lists.push(
				createListName(sp.conference.title, sp.conferenceId, 'REGISTRATION_NOT_COMPLETED')
			);
		}
	}

	for (const supervisors of user.conferenceSupervisor) {
		attribs.conferences.push({
			id: supervisors.conferenceId,
			role: 'SUPERVISOR',
			title: supervisors.conference.title
		});

		if (supervisors.conference.state === 'PARTICIPANT_REGISTRATION') {
			if (
				supervisors.supervisedDelegationMembers.map((d) => d.delegation).some((d) => d.applied) ||
				supervisors.supervisedSingleParticipants.some((d) => d.applied)
			) {
				lists.push(
					createListName(supervisors.conference.title, supervisors.conferenceId, 'SUPERVISORS')
				);
			}
			if (
				supervisors.supervisedDelegationMembers.map((d) => d.delegation).some((d) => !d.applied) ||
				supervisors.supervisedSingleParticipants.some((d) => !d.applied)
			) {
				lists.push(
					createListName(
						supervisors.conference.title,
						supervisors.conferenceId,
						'SUPERVISORS_REGISTRATION_NOT_COMPLETED'
					)
				);
			}
		} else {
			if (
				supervisors.supervisedDelegationMembers
					.map((d) => d.delegation)
					.some((d) => d.assignedNationAlpha3Code || d.assignedNonStateActorId) ||
				supervisors.supervisedSingleParticipants.some((d) => d.assignedRoleId)
			) {
				lists.push(
					createListName(supervisors.conference.title, supervisors.conferenceId, 'SUPERVISORS')
				);
			}
		}
	}

	// Assign Global Lists based on User Preferences

	if (user.wantsToReceiveGeneralInformation) {
		lists.push(createGlobalList('DMUN_NEWSLETTER'));
	}

	if (user.wantsJoinTeamInformation) {
		lists.push(createGlobalList('DMUN_TEAM_TENDERS'));
	}

	// Assign all conference Lists to Team Members

	for (const tm of user.teamMember) {
		attribs.conferences.push({
			id: tm.conferenceId,
			role: tm.role,
			title: tm.conference.title
		});
		// Default Team list for all Team Members
		lists.push(createListName(tm.conference.title, tm.conferenceId, 'TEAM'));
		if (tm.role === 'PARTICIPANT_CARE' || tm.role === 'PROJECT_MANAGEMENT') {
			// Project Management and Participant Care get all lists for the conference
			// This is usefull to make sure which information reaches which subscriber (control)
			lists.push(createListName(tm.conference.title, tm.conferenceId, 'REGISTRATION_COMPLETED'));
			lists.push(
				createListName(tm.conference.title, tm.conferenceId, 'REGISTRATION_NOT_COMPLETED')
			);
			lists.push(createListName(tm.conference.title, tm.conferenceId, 'SUPERVISORS'));
		}
	}

	return {
		attribs,
		lists: [...new Set(lists)]
	};
}

function constructSubscriberObjectFromSubscriber(subscriber: Subscriber): SubscriberObj {
	return {
		attribs: subscriber.attribs,
		lists: subscriber.lists.map((l) => l.name)
	};
}

function compareSubscriberToUser(subscriber: Subscriber, user: User) {
	const subscriberObj = constructSubscriberObjectFromSubscriber(subscriber);
	const userObj = constructSubscriberObjectFromUser(user);

	const listIsinSubscriberObj = subscriberObj.lists.every((list) => userObj.lists.includes(list));
	const listIsinUserObj = userObj.lists.every((list) => subscriberObj.lists.includes(list));

	const emailMatches = subscriber.email.toLowerCase() === user.email.toLowerCase();
	const nameMatches =
		subscriber.name ===
		formatNames(user.given_name, user.family_name, { familyNameUppercase: false });

	return (
		deepEquals(subscriberObj.attribs, userObj.attribs) &&
		emailMatches &&
		nameMatches &&
		listIsinSubscriberObj &&
		listIsinUserObj &&
		subscriberObj.lists.length === userObj.lists.length
	);
}

const mainFunction = async () => {
	const startTime = logTaskStart(TASK_NAME);
	if (!config.LISTMONK_API_URL || config.LISTMONK_API_URL === '') {
		taskError(TASK_NAME, 'Listmonk API URL is not set. Aborting task.');
		return;
	}

	// Save all Lists for later use
	const allLists: ListData[] = [];

	// Get all conferences
	const conferences = await tasksDb.conference.findMany();

	// Get all Listmonk Subscribers

	const subscribers = await getSubscribers<Subscriber>(40);
	console.info(`Fetched ${subscribers.length} subscribers from Listmonk`);

	const users = await getUsers();
	console.info(`Loaded ${users.length} users from the Database`);

	console.info('\nSTEP 1: Updating Lists');
	console.info('======================');

	// Update Global Lists
	console.info(`Syncing Global Lists`);

	const listsResponse = await listmonkClient.GET('/lists', {
		params: {
			query: {
				per_page: 500
			}
		}
	});
	if (listsResponse.error) {
		taskError(
			TASK_NAME,
			`Failed to fetch lists from Listmonk. Aborting task.`,
			(listsResponse as any).error
		);
		return;
	}
	const lists = listsResponse.data.data?.results;

	// Update Global Lists
	for (const list of requiredListsGlobal) {
		const listName = createGlobalList(list);
		const listmonkList = lists?.find((l) => l.name === listName);
		if (!listmonkList) {
			const res = await listmonkClient.POST('/lists', {
				body: {
					name: listName,
					description: `List for ${listName} (global)`,
					tags: ['global']
				}
			});
			if (res.error || !res.data.data || !res.data.data.uuid || !res.data.data.name) {
				taskError(
					TASK_NAME,
					`Failed to create list ${listName} (global). Aborting task.`,
					res.error ? (res as any).error : undefined
				);
				return;
			}
			const resData = res.data.data;
			allLists.push({
				id: resData.id!,
				name: resData.name!,
				type: list
			});
			console.info(`  - Created list ${listName}`);
		} else {
			allLists.push({
				id: listmonkList.id!,
				name: listmonkList.name!,
				type: list
			});
			console.info(`  - List ${listName} already exists`);
		}
	}

	// Update per Conference
	for (const conference of conferences) {
		console.info(`Syncing Lists for conference ${conference.title}`);

		// create lists
		for (const list of requiredListsPerConference) {
			const listmonkList = lists?.find(
				(l) => l.name === createListName(conference.title, conference.id, list)
			);
			if (!listmonkList) {
				const listName = createListName(conference.title, conference.id, list);
				const res = await listmonkClient.POST('/lists', {
					body: {
						name: listName,
						description: `List for ${list} of conference ${conference.title}`,
						tags: [createTagName(conference.title, conference.id), list.toLowerCase()]
					}
				});
				if (res.error || !res.data.data || !res.data.data.uuid || !res.data.data.name) {
					taskError(
						TASK_NAME,
						`Failed to create list ${list} for conference ${conference.title}. Aborting task.`,
						res.error ? (res as any).error : undefined
					);
					return;
				}
				const resData = res.data.data;
				allLists.push({
					id: resData.id!,
					name: resData.name!,
					type: list
				});
				console.info(`  - Created list ${listName}`);
			} else {
				allLists.push({
					id: listmonkList.id!,
					name: listmonkList.name!,
					type: list
				});
				console.info(`  - List ${listmonkList.name} already exists`);
			}
		}

		// Update per Conference
		for (const conference of conferences) {
			console.info(`Syncing Lists for conference ${conference.title}`);

			// create lists
			for (const list of requiredListsPerConference) {
				const listmonkList = lists?.find(
					(l) => l.name === createListName(conference.title, conference.id, list)
				);
				if (!listmonkList) {
					const listName = createListName(conference.title, conference.id, list);
					const res = await listmonkClient.POST('/lists', {
						body: {
							name: listName,
							description: `List for ${list} of conference ${conference.title}`,
							tags: [createTagName(conference.title, conference.id), list.toLowerCase()]
						}
					});
					if (res.error || !res.data.data || !res.data.data.uuid || !res.data.data.name) {
						taskError(
							TASK_NAME,
							`Failed to create list ${list} for conference ${conference.title}. Aborting task.`,
							res.error ? (res as any).error : undefined
						);
						return;
					}
					const resData = res.data.data;
					allLists.push({
						id: resData.id!,
						name: resData.name!,
						type: list
					});
					console.info(`  - Created list ${listName}`);
				} else {
					allLists.push({
						id: listmonkList.id!,
						name: listmonkList.name!,
						type: list
					});
					console.info(`  - List ${listmonkList.name} already exists`);
				}
			}
		}

		console.info('Cleaning up orphan lists');
		const allListIds = allLists.map((l) => l.id);
		const listsToDelete = lists?.filter((l) => l.id && !allListIds.includes(l.id));
		for (const list of listsToDelete || []) {
			const res = await listmonkClient.DELETE(`/lists/{list_id}`, {
				params: {
					path: {
						list_id: list.id!
					}
				}
			});
			if (res.error) {
				console.info(
					`  ! Failed to delete list ${list.name}: Listmonk API Error\n${JSON.stringify((res as any).error, null, 2)}`
				);
				continue;
			}
			console.info(`  - Deleted list ${list.name}`);
		}

		console.info('\nSTEP 2: Creating, Deleting and Updating Subscribers');
		console.info('===================================================');

		const usersToCreate = users.filter((u) => {
			const subscriber = subscribers.find((s) => s.email.toLowerCase() === u.email.toLowerCase());
			const { lists } = constructSubscriberObjectFromUser(u);
			return !subscriber && lists.length > 0;
		});
		console.info(`Subscribers to create: ${usersToCreate.length}`);

		const subscribersToDelete = subscribers.filter((s) => {
			const user = users.find((u) => u.email.toLowerCase() === s.email.toLowerCase());
			const { lists } = constructSubscriberObjectFromSubscriber(s);
			return !user || lists.length === 0;
		});
		console.info(`Subscribers to delete: ${subscribersToDelete.length}`);

		const subscribersToUpdate = subscribers.filter((s) => {
			const user = users.find((u) => u.email.toLowerCase() === s.email.toLowerCase());
			return user && !compareSubscriberToUser(s, user);
		});
		console.info(`Subscribers to update: ${subscribersToUpdate.length}`);

		const usersWithoutLists = users.filter(
			(u) => constructSubscriberObjectFromUser(u).lists.length === 0
		);
		console.info(`Users without lists: ${usersWithoutLists.length}`);

		if (usersToCreate.length > 0) console.info('\nExecuting Create operations:');
		for (const u of usersToCreate) {
			const subscriberObj = constructSubscriberObjectFromUser(u);
			const res = await listmonkClient.POST('/subscribers', {
				body: {
					email: u.email,
					name: formatNames(u.given_name, u.family_name, { familyNameUppercase: false }),
					attribs: subscriberObj.attribs as Record<string, any>,
					lists: allLists.filter((l) => subscriberObj.lists.includes(l.name)).map((l) => l.id)
				}
			});
			if (res.error) {
				console.error(
					`  ! Failed to create subscriber for user ${u.id}: Listmonk API Error\n${JSON.stringify((res as any).error, null, 2)}`
				);
			} else {
				console.info(`  - Created subscriber for user ${u.id}`);
			}
		}

		if (subscribersToDelete.length > 0) console.info('\nExecuting Delete operations:');
		for (const s of subscribersToDelete) {
			const res = await listmonkClient.DELETE(`/subscribers/{id}`, {
				params: {
					path: {
						id: s.id
					}
				}
			});
			if (res.error) {
				console.error(
					`  ! Failed to delete subscriber ${s.attribs.userId}: Listmonk API Error\n${JSON.stringify((res as any).error, null, 2)}`
				);
			} else {
				console.info(`  - Deleted subscriber ${s.attribs.userId}`);
			}
		}

		if (subscribersToUpdate.length > 0) console.info('\nExecuting Update operations:');
		for (const s of subscribersToUpdate) {
			const u = users.find((u) => u.email.toLowerCase() === s.email.toLowerCase());
			if (!u) {
				console.error(`  ! Failed to find user for subscriber ${s.attribs.userId}: User not found`);
				continue;
			}
			const subscriberObj = constructSubscriberObjectFromUser(u!);
			const res = await listmonkClient.PUT(`/subscribers/{id}`, {
				params: {
					path: {
						id: s.id
					}
				},
				body: {
					email: u.email,
					name: formatNames(u.given_name, u.family_name, { familyNameUppercase: false }),
					attribs: subscriberObj.attribs as Record<string, any>,
					lists: allLists.filter((l) => subscriberObj.lists.includes(l.name)).map((l) => l.id),
					preconfirm_subscriptions: true
				}
			});
			if (res.error) {
				console.error(
					`  ! Failed to update subscriber ${s.attribs.userId}: Listmonk API Error\n${JSON.stringify((res as any).error, null, 2)}`
				);
			} else {
				console.info(`  - Updated subscriber ${s.attribs.userId}`);
			}
		}

		logTaskEnd(TASK_NAME, startTime);
	}
};

const program = new Command();

program.option('--run-once', 'Run the mail sync task once immediately');
program.parse(argv);

const options = program.opts();

// MAIN TASK

if (options.runOnce) {
	console.info(`Running ${TASK_NAME} once immediately`);
	await mainFunction();
} else {
	logLoading(TASK_NAME, CRON);
	const _ = schedule.scheduleJob(
		// TODO: we should allow passing the TZ via env var to the container
		{ rule: CRON, tz: 'Etc/GMT-2' },
		mainFunction
	);
}
