import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MailSyncUser } from './types';

/**
 * The whole mail sync (`runMailSync`) against an in-memory Listmonk and an in-memory user table.
 *
 * The fake Listmonk behaves like the real one (checked against v6.2.0) where sharing the instance
 * with the DMUN member hub depends on it: one subscriber per address (409 on a duplicate), PATCH
 * merges attribs key by key, adding to a list confirms, and the garbage query only deletes
 * subscribers on no list that are not blocklisted. Foreign lists and attribs in these tests are
 * the member hub's (`[DMUN-Intern] …`, `mitgliedshub`).
 */

type Status = 'unconfirmed' | 'confirmed' | 'unsubscribed';
type FakeList = { id: number; uuid: string; name: string; description: string; tags: string[] };
type FakeSubscriber = {
	id: number;
	email: string;
	name: string;
	status: 'enabled' | 'blocklisted';
	attribs: Record<string, unknown>;
	lists: Map<number, Status>;
};
type Body = {
	name?: string;
	description?: string;
	tags?: string[];
	email?: string;
	status?: string;
	attribs?: Record<string, unknown>;
	lists?: number[];
	preconfirm_subscriptions?: boolean;
	ids?: number[];
	action?: 'add' | 'remove';
	target_list_ids?: number[];
	query?: string;
};
type Init = {
	params?: {
		query?: { per_page?: number | 'all'; list_id?: number[]; query?: string; page?: number };
		path?: { list_id?: number; id?: number };
	};
	body?: Body;
};
type Conf = {
	id: string;
	title: string;
	state: 'PREPARATION';
	assignmentReleased: boolean;
	endConference: Date;
};

const h = vi.hoisted(() => ({
	config: { LISTMONK_API_URL: 'http://listmonk.test/api', MAIL_SYNC_BATCH_SIZE: 2 },
	lists: [] as FakeList[],
	subscribers: [] as FakeSubscriber[],
	nextId: 100,
	/** Every changing call, in order. Reads are not recorded. */
	writes: [] as string[],
	/** Makes a call fail by returning an error body for it. */
	fail: undefined as ((method: string, path: string, init: Init) => unknown) | undefined,
	conferences: [] as Conf[],
	users: [] as MailSyncUser[],
	userQueries: 0,
	errors: [] as string[]
}));

vi.mock('../config', () => ({ config: h.config }));
vi.mock('../logs', () => ({
	logTaskStart: () => 0,
	logTaskEnd: () => {},
	taskWarning: (_task: string, message: string) => h.errors.push(`warning: ${message}`),
	taskError: (_task: string, message: string) => h.errors.push(`error: ${message}`)
}));

vi.mock('../db', () => ({
	db: { query: { conference: { findMany: async () => h.conferences } } }
}));

vi.mock('./mailSyncUsers', () => {
	type Recent = { conference: { endConference: { gte: Date } } };
	type Filter = { OR?: Record<string, unknown>[]; AND?: Filter[]; id?: { gt: string } };
	type Item = {
		conference?: { endConference: Date };
		delegation?: { conference: { endConference: Date } };
	};
	const isRecent = (v: unknown): v is Recent =>
		typeof v === 'object' && v !== null && 'conference' in v;
	const conferenceOf = (item: Item) => item.conference ?? item.delegation?.conference;
	const relation = (u: MailSyncUser, key: string): Item[] => {
		if (key === 'delegationMemberships') return u.delegationMemberships;
		if (key === 'singleParticipant') return u.singleParticipant;
		if (key === 'conferenceSupervisor') return u.conferenceSupervisor;
		if (key === 'teamMember') return u.teamMember;
		throw new Error(`unexpected relation ${key}`);
	};
	// Evaluates the shape `mailSyncUserWhere` builds (opt-in flags or a recent participation),
	// with the id cursor `processUsersInBatches` puts next to it.
	const matches = (u: MailSyncUser, where: Filter): boolean => {
		if (where.AND) return where.AND.every((part) => matches(u, part));
		if (where.id) return u.id > where.id.gt;
		return (where.OR ?? []).some((cond) =>
			Object.entries(cond).every(([key, value]) => {
				if (value === true) {
					return key === 'wantsToReceiveGeneralInformation'
						? u.wantsToReceiveGeneralInformation
						: u.wantsJoinTeamInformation;
				}
				if (!isRecent(value)) throw new Error(`unexpected condition on ${key}`);
				const { gte } = value.conference.endConference;
				return relation(u, key).some((item) => {
					const end = conferenceOf(item)?.endConference;
					return end !== undefined && end >= gte;
				});
			})
		);
	};
	return {
		findMailSyncUsers: async (args: { where: Filter; limit: number }) => {
			h.userQueries++;
			return [...h.users]
				.sort((a, b) => a.id.localeCompare(b.id))
				.filter((u) => matches(u, args.where))
				.slice(0, args.limit);
		}
	};
});

vi.mock('../apis/listmonk/listmonkClient', () => {
	const view = (s: FakeSubscriber) => ({
		id: s.id,
		uuid: `sub-${s.id}`,
		email: s.email,
		name: s.name,
		status: s.status,
		attribs: structuredClone(s.attribs),
		created_at: '',
		updated_at: '',
		lists: [...s.lists].map(([id, status]) => {
			const list = h.lists.find((l) => l.id === id)!;
			return {
				id,
				uuid: list.uuid,
				name: list.name,
				type: 'private',
				tags: list.tags,
				subscription_status: status,
				created_at: '',
				updated_at: ''
			};
		})
	});
	const ok = (data: unknown) => ({ data: { data } });
	const byEmail = (email: string) =>
		h.subscribers.find((s) => s.email.toLowerCase() === email.toLowerCase());

	const findSubscriber = (query: string) => {
		const email = /LOWER\('(.*)'\)$/.exec(query)![1].replaceAll("''", "'");
		const found = byEmail(email);
		return ok({ results: found ? [view(found)] : [], total: found ? 1 : 0 });
	};

	const subscribersOn = (query: NonNullable<NonNullable<Init['params']>['query']>) => {
		if (query.per_page !== 'all') throw new Error('the sync must fetch in one request');
		const ids = query.list_id ?? [];
		const results = h.subscribers.filter((s) => ids.some((id) => s.lists.has(id))).map(view);
		return ok({ results, total: results.length });
	};

	/** One handler per endpoint the sync uses, keyed by method and path template. */
	const routes: Record<string, (init: Init, body: Body) => unknown> = {
		'GET /lists': () => ok({ results: structuredClone(h.lists) }),
		'POST /lists': (_, body) => {
			const id = h.nextId++;
			const list = {
				id,
				uuid: `list-${id}`,
				name: body.name ?? '',
				description: body.description ?? '',
				tags: body.tags ?? []
			};
			h.lists.push(list);
			h.writes.push(`create list ${list.name} [${list.tags}]`);
			return ok(list);
		},
		'DELETE /lists/{list_id}': (init) => {
			const id = init.params?.path?.list_id;
			h.lists = h.lists.filter((l) => l.id !== id);
			for (const s of h.subscribers) if (id !== undefined) s.lists.delete(id);
			h.writes.push(`delete list ${id}`);
			return ok(true);
		},
		'GET /subscribers': (init) => {
			const query = init.params?.query ?? {};
			return query.query ? findSubscriber(query.query) : subscribersOn(query);
		},
		'POST /subscribers': (_, body) => {
			const email = body.email ?? '';
			if (byEmail(email)) return { error: { message: 'E-mail already exists.' } };
			const status: Status = body.preconfirm_subscriptions ? 'confirmed' : 'unconfirmed';
			const s: FakeSubscriber = {
				id: h.nextId++,
				email: email.toLowerCase(),
				name: body.name ?? '',
				status: 'enabled',
				attribs: structuredClone(body.attribs ?? {}),
				lists: new Map((body.lists ?? []).map((id) => [id, status]))
			};
			h.subscribers.push(s);
			h.writes.push(`create ${s.email} [${body.lists}]`);
			return ok(view(s));
		},
		'PUT /subscribers/lists': (_, body) => {
			for (const s of h.subscribers.filter((x) => body.ids?.includes(x.id))) {
				for (const listId of body.target_list_ids ?? []) {
					if (body.action === 'add') s.lists.set(listId, 'confirmed');
					else s.lists.delete(listId);
				}
				h.writes.push(`${body.action} ${s.email} [${body.target_list_ids}]`);
			}
			return ok(true);
		},
		'PATCH /subscribers/{id}': (init, body) => {
			const s = h.subscribers.find((x) => x.id === init.params?.path?.id)!;
			if (body.name) s.name = body.name;
			// Like Listmonk: the body is laid over the stored subscriber, key by key.
			if (body.attribs) Object.assign(s.attribs, structuredClone(body.attribs));
			h.writes.push(`patch ${s.email} ${JSON.stringify(body)}`);
			return ok(view(s));
		},
		'POST /subscribers/query/delete': (_, body) => {
			h.writes.push(`garbage ${body.query}`);
			h.subscribers = h.subscribers.filter((s) => s.status === 'blocklisted' || s.lists.size > 0);
			return ok(true);
		}
	};

	function handle(method: string, path: string, init: Init = {}) {
		const failure = h.fail?.(method, path, init);
		if (failure) return { error: failure };
		const route = routes[`${method} ${path}`];
		if (!route) throw new Error(`unexpected call ${method} ${path}`);
		return route(init, init.body ?? {});
	}

	return {
		listmonkClient: {
			GET: async (path: string, init?: Init) => handle('GET', path, init),
			POST: async (path: string, init?: Init) => handle('POST', path, init),
			PUT: async (path: string, init?: Init) => handle('PUT', path, init),
			PATCH: async (path: string, init?: Init) => handle('PATCH', path, init),
			DELETE: async (path: string, init?: Init) => handle('DELETE', path, init)
		}
	};
});

const { runMailSync } = await import('./orchestrator');
const { CONFERENCE_LIST_TYPES, GLOBAL_LIST_TYPES } = await import('./types');

const GARBAGE_QUERY =
	"subscribers.status != 'blocklisted' AND NOT EXISTS " +
	'(SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = subscribers.id)';

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

/** Relative to today, so the retention window (ten months back) needs no fake clock. */
function monthsAgo(months: number) {
	const date = new Date();
	date.setMonth(date.getMonth() - months);
	return date;
}

const RECENT: Conf = {
	id: 'RECab1xyz',
	title: 'MUN-SH 2026',
	state: 'PREPARATION',
	assignmentReleased: true,
	endConference: monthsAgo(1)
};
const OLD: Conf = {
	id: 'OLDab1xyz',
	title: 'MUN-SH 2024',
	state: 'PREPARATION',
	assignmentReleased: true,
	endConference: monthsAgo(24)
};
const TEAM = '[RECab1] MUN-SH 2026 - TEAM';
const OLD_TEAM = '[OLDab1] MUN-SH 2024 - TEAM';
const NEWSLETTER = '[global] DMUN_NEWSLETTER';
const HUB = '[DMUN-Intern] Rundbrief';

function user(id: string, email: string, overrides: Partial<MailSyncUser> = {}): MailSyncUser {
	const u: MailSyncUser = {
		id,
		email,
		givenName: id,
		familyName: 'Muster',
		wantsToReceiveGeneralInformation: false,
		wantsJoinTeamInformation: false,
		delegationMemberships: [],
		singleParticipant: [],
		conferenceSupervisor: [],
		teamMember: [],
		...overrides
	};
	h.users.push(u);
	return u;
}

const team = (conf: Conf = RECENT) => [
	{ conferenceId: conf.id, role: 'MEMBER' as const, conference: conf }
];

function list(name: string, tags: string[] = []) {
	const id = h.nextId++;
	h.lists.push({ id, uuid: `list-${id}`, name, description: '', tags });
	return id;
}

function subscriber(
	email: string,
	lists: Record<number, Status>,
	overrides: Partial<FakeSubscriber> = {}
) {
	const s: FakeSubscriber = {
		id: h.nextId++,
		email,
		name: 'Name from the hub',
		status: 'enabled',
		attribs: {},
		lists: new Map(Object.entries(lists).map(([id, status]) => [Number(id), status])),
		...overrides
	};
	h.subscribers.push(s);
	return s;
}

const listId = (name: string) => h.lists.find((l) => l.name === name)?.id;
const sub = (email: string) => h.subscribers.find((s) => s.email === email);
const listsOf = (email: string) =>
	Object.fromEntries(
		[...(sub(email)?.lists ?? [])].map(([id, status]) => [
			h.lists.find((l) => l.id === id)!.name,
			status
		])
	);

let hubList: number;

beforeEach(() => {
	h.config.LISTMONK_API_URL = 'http://listmonk.test/api';
	h.config.MAIL_SYNC_BATCH_SIZE = 2;
	h.lists = [];
	h.subscribers = [];
	h.nextId = 100;
	h.writes = [];
	h.fail = undefined;
	h.conferences = [RECENT, OLD];
	h.users = [];
	h.userQueries = 0;
	h.errors = [];
	hubList = list(HUB, ['mitgliedshub']);
	vi.spyOn(console, 'info').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------------------------

describe('runMailSync – lists', () => {
	test('creates the global lists and every list of every conference, with tags', async () => {
		await runMailSync();

		for (const type of GLOBAL_LIST_TYPES) {
			expect(h.lists.find((l) => l.name === `[global] ${type}`)?.tags).toEqual(['global']);
		}
		for (const type of CONFERENCE_LIST_TYPES) {
			expect(h.lists.find((l) => l.name === `[RECab1] MUN-SH 2026 - ${type}`)?.tags).toEqual([
				'RECab1-mun-sh_2026',
				type.toLowerCase()
			]);
		}
		expect(h.lists).toHaveLength(1 + GLOBAL_LIST_TYPES.length + 2 * CONFERENCE_LIST_TYPES.length);
	});

	test('reuses existing lists instead of creating them again', async () => {
		await runMailSync();
		h.writes = [];
		await runMailSync();

		expect(h.writes.filter((w) => w.startsWith('create list'))).toEqual([]);
	});

	test('deletes its own lists of deleted conferences, never lists of other systems', async () => {
		const orphan = list('[ZZZZZZ] MUN-SH 2019 - TEAM');
		const lookalike = list('[global] SOMETHING_ELSE');
		await runMailSync();

		const ids = h.lists.map((l) => l.id);
		expect(ids).not.toContain(orphan);
		expect(ids).toEqual(expect.arrayContaining([hubList, lookalike]));
	});

	test('carries on when an orphan list cannot be deleted', async () => {
		list('[ZZZZZZ] MUN-SH 2019 - TEAM');
		user('u1', 'a@x.org', { teamMember: team() });
		h.fail = (method, path) =>
			method === 'DELETE' && path === '/lists/{list_id}' ? 'nope' : undefined;
		await runMailSync();

		expect(listsOf('a@x.org')).toEqual({ [TEAM]: 'confirmed' });
	});

	test('aborts without touching subscribers when the lists cannot be read', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		h.fail = (method, path) => (method === 'GET' && path === '/lists' ? 'down' : undefined);
		await runMailSync();

		expect(h.writes).toEqual([]);
		expect(h.errors).toEqual(['error: Failed to fetch lists from Listmonk. Aborting task.']);
	});

	test('aborts when a list cannot be created', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		h.fail = (method, path, init) =>
			method === 'POST' && path === '/lists' && init.body?.name === NEWSLETTER ? 'nope' : undefined;
		await runMailSync();

		expect(sub('a@x.org')).toBeUndefined();
		expect(h.errors).toEqual([
			'error: Failed to create list [global] DMUN_NEWSLETTER (global). Aborting task.'
		]);
	});

	test('does nothing at all without a Listmonk URL', async () => {
		h.config.LISTMONK_API_URL = '';
		await runMailSync();

		expect(h.writes).toEqual([]);
		expect(h.errors).toEqual(['error: Listmonk API URL is not set. Aborting task.']);
	});
});

// ---------------------------------------------------------------------------------------------
// Subscribers
// ---------------------------------------------------------------------------------------------

describe('runMailSync – subscribers', () => {
	test('creates subscribers with their lists, name and attribs', async () => {
		user('u1', '  Erika@X.org ', {
			givenName: 'erika',
			familyName: 'mustermann',
			teamMember: team()
		});
		await runMailSync();

		expect(sub('erika@x.org')).toMatchObject({
			name: 'Erika Mustermann',
			attribs: {
				userId: 'u1',
				conferences: [{ id: RECENT.id, role: 'MEMBER', title: 'MUN-SH 2026' }]
			}
		});
		expect(listsOf('erika@x.org')).toEqual({ [TEAM]: 'confirmed' });
	});

	test('fetches only the subscribers on its own lists', async () => {
		subscriber('hubonly@x.org', { [hubList]: 'confirmed' });
		let fetched: number[] = [];
		h.fail = (method, path, init) => {
			if (method === 'GET' && path === '/subscribers' && init.params?.query?.list_id) {
				fetched = init.params.query.list_id;
			}
			return undefined;
		};
		await runMailSync();

		expect(fetched).not.toContain(hubList);
		expect(fetched).toHaveLength(h.lists.length - 1);
		expect(sub('hubonly@x.org')?.lists.size).toBe(1);
	});

	test('joins a subscriber the member hub created, keeping its lists, attribs and name', async () => {
		subscriber(
			'a@x.org',
			{ [hubList]: 'confirmed' },
			{ attribs: { mitgliedshub: { memberId: 'm1', memberNumber: 1 } } }
		);
		user('u1', 'A@x.org', { teamMember: team() });
		await runMailSync();

		expect(h.subscribers.filter((s) => s.email === 'a@x.org')).toHaveLength(1);
		expect(sub('a@x.org')).toMatchObject({
			name: 'Name from the hub',
			attribs: {
				mitgliedshub: { memberId: 'm1', memberNumber: 1 },
				userId: 'u1',
				conferences: [{ id: RECENT.id, role: 'MEMBER', title: 'MUN-SH 2026' }]
			}
		});
		expect(listsOf('a@x.org')).toEqual({ [HUB]: 'confirmed', [TEAM]: 'confirmed' });
	});

	test('counts a failed join and carries on with the next user', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		user('u2', 'b@x.org', { teamMember: team() });
		h.fail = (method, path, init) =>
			method === 'POST' && path === '/subscribers' && init.body?.email === 'a@x.org'
				? { message: 'E-mail already exists.' }
				: undefined;
		await runMailSync();

		expect(sub('a@x.org')).toBeUndefined();
		expect(listsOf('b@x.org')).toEqual({ [TEAM]: 'confirmed' });
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create user u1'));
	});

	test('adds and removes only its own lists, adding before removing', async () => {
		await runMailSync();
		subscriber('a@x.org', { [hubList]: 'confirmed', [listId(OLD_TEAM)!]: 'confirmed' });
		user('u1', 'a@x.org', { teamMember: team() });
		h.writes = [];
		await runMailSync();

		expect(listsOf('a@x.org')).toEqual({ [HUB]: 'confirmed', [TEAM]: 'confirmed' });
		const changes = h.writes.filter((w) => /^(add|remove) a@x.org/.test(w));
		expect(changes).toEqual([
			`add a@x.org [${listId(TEAM)}]`,
			`remove a@x.org [${listId(OLD_TEAM)}]`
		]);
	});

	test('keeps the name of a subscriber the member hub shares, updates it otherwise', async () => {
		await runMailSync();
		subscriber('shared@x.org', { [hubList]: 'confirmed', [listId(TEAM)!]: 'confirmed' });
		subscriber('ours@x.org', { [listId(TEAM)!]: 'confirmed' });
		user('u1', 'shared@x.org', { givenName: 'Neu', teamMember: team() });
		user('u2', 'ours@x.org', { givenName: 'Neu', teamMember: team() });
		await runMailSync();

		expect(sub('shared@x.org')?.name).toBe('Name from the hub');
		expect(sub('ours@x.org')?.name).toBe('Neu Muster');
	});

	test('leaves an unsubscribe in Listmonk alone', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		await runMailSync();
		sub('a@x.org')!.lists.set(listId(TEAM)!, 'unsubscribed');
		h.writes = [];
		await runMailSync();

		expect(listsOf('a@x.org')).toEqual({ [TEAM]: 'unsubscribed' });
		expect(h.writes.filter((w) => !w.startsWith('garbage'))).toEqual([]);
	});

	test('processes every user across batches', async () => {
		for (let i = 1; i <= 5; i++) user(`u${i}`, `u${i}@x.org`, { teamMember: team() });
		await runMailSync();

		expect(h.subscribers.map((s) => s.email).sort()).toEqual([
			'u1@x.org',
			'u2@x.org',
			'u3@x.org',
			'u4@x.org',
			'u5@x.org'
		]);
		expect(h.userQueries).toBe(3);
	});

	test('carries on when one subscriber cannot be changed', async () => {
		await runMailSync();
		subscriber('a@x.org', { [listId(TEAM)!]: 'confirmed' });
		subscriber('b@x.org', { [listId(TEAM)!]: 'confirmed' });
		user('u1', 'a@x.org', { teamMember: team() });
		user('u2', 'b@x.org', { teamMember: team() });
		h.fail = (method, path, init) =>
			method === 'PATCH' &&
			path === '/subscribers/{id}' &&
			init.params?.path?.id === sub('a@x.org')!.id
				? { message: 'nope' }
				: undefined;
		await runMailSync();

		expect(sub('a@x.org')?.attribs.userId).toBeUndefined();
		expect(sub('b@x.org')?.attribs.userId).toBe('u2');
	});

	test('changes nothing on a second run, also next to subscribers of the member hub', async () => {
		subscriber('shared@x.org', { [hubList]: 'confirmed' }, { attribs: { mitgliedshub: {} } });
		subscriber('hubonly@x.org', { [hubList]: 'confirmed' });
		user('u1', 'shared@x.org', { teamMember: team() });
		user('u2', 'ours@x.org', { teamMember: team(), wantsToReceiveGeneralInformation: true });
		user('u3', 'old@x.org', { teamMember: team(OLD), wantsToReceiveGeneralInformation: true });
		await runMailSync();
		h.writes = [];
		await runMailSync();

		expect(h.writes).toEqual([`garbage ${GARBAGE_QUERY}`]);
	});
});

// ---------------------------------------------------------------------------------------------
// Releasing and garbage
// ---------------------------------------------------------------------------------------------

describe('runMailSync – releasing', () => {
	test('releases subscribers no user claims: our lists and attribs go, theirs stay', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		await runMailSync();
		sub('a@x.org')!.lists.set(hubList, 'confirmed');
		sub('a@x.org')!.attribs.mitgliedshub = { memberId: 'm1' };
		h.users = [];
		await runMailSync();

		expect(listsOf('a@x.org')).toEqual({ [HUB]: 'confirmed' });
		expect(sub('a@x.org')?.attribs).toEqual({
			userId: null,
			conferences: null,
			mitgliedshub: { memberId: 'm1' }
		});
	});

	test('deletes released subscribers left on no list at all', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		await runMailSync();
		h.users = [];
		await runMailSync();

		expect(sub('a@x.org')).toBeUndefined();
	});

	test('takes participants of conferences older than ten months off their lists', async () => {
		await runMailSync();
		subscriber('old@x.org', { [listId(OLD_TEAM)!]: 'confirmed' }, { attribs: { userId: 'u1' } });
		user('u1', 'old@x.org', { teamMember: team(OLD) });
		await runMailSync();

		expect(sub('old@x.org')).toBeUndefined();
	});

	test('keeps the newsletter of an opted-in participant of an old conference', async () => {
		await runMailSync();
		subscriber('old@x.org', {
			[listId(OLD_TEAM)!]: 'confirmed',
			[listId(NEWSLETTER)!]: 'confirmed'
		});
		user('u1', 'old@x.org', { teamMember: team(OLD), wantsToReceiveGeneralInformation: true });
		await runMailSync();

		expect(listsOf('old@x.org')).toEqual({ [NEWSLETTER]: 'confirmed' });
		expect(sub('old@x.org')?.attribs).toMatchObject({ userId: 'u1', conferences: [] });
	});

	test('adds opted-in users even without any conference', async () => {
		user('u1', 'fan@x.org', { wantsJoinTeamInformation: true });
		await runMailSync();

		expect(listsOf('fan@x.org')).toEqual({ '[global] DMUN_TEAM_TENDERS': 'confirmed' });
	});

	test('sends the shared garbage query after all changes', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		await runMailSync();

		expect(h.writes.at(-1)).toBe(`garbage ${GARBAGE_QUERY}`);
	});

	test('keeps blocklisted subscribers, so the next run does not mail them afresh', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		await runMailSync();
		sub('a@x.org')!.status = 'blocklisted';
		h.users = [];
		await runMailSync();

		expect(sub('a@x.org')?.lists.size).toBe(0);
	});

	test('survives a failing garbage query', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		h.fail = (method, path) =>
			method === 'POST' && path === '/subscribers/query/delete' ? 'nope' : undefined;
		await expect(runMailSync()).resolves.toBeUndefined();

		expect(listsOf('a@x.org')).toEqual({ [TEAM]: 'confirmed' });
	});

	test('aborts before planning when the subscribers cannot be fetched', async () => {
		user('u1', 'a@x.org', { teamMember: team() });
		h.fail = (method, path) => (method === 'GET' && path === '/subscribers' ? 'down' : undefined);
		await runMailSync();

		expect(sub('a@x.org')).toBeUndefined();
		expect(h.errors).toContain(
			'error: Could not fetch all subscribers from Listmonk. Aborting task.'
		);
		expect(h.userQueries).toBe(0);
	});
});
