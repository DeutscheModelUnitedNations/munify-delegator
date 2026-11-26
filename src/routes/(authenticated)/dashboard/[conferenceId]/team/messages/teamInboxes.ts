import type { ChatInbox, ChatKind } from '#lib/helpers/chat';
import { groupName, inboxName } from '#lib/components/chat/chatLabels';

/**
 * What the team's list is narrowed by: a team inbox, or (`GROUP`) the group of a committee or
 * custom role the caller is in.
 */
export type InboxKind = ChatInbox | 'GROUP';

/** A team inbox the caller answers, or a group they are in, with the key the page filters by. */
export interface TeamInbox {
	key: string;
	inbox: InboxKind;
	committeeAbbreviation: string | null;
	/** A custom role's inbox or group: the role */
	roleName?: string | null;
	/** A trusted person's own inbox: the chats written to them alone */
	own: boolean;
	/** A group: whose it is, to open it */
	group?: { committeeId: string | null; roleId: string | null };
}

/**
 * What tells the inboxes apart: the kind, the committee of a chairs' or consultants' one, the role
 * of a custom role's, and for a trusted person whether a chat is written to all of them or to them
 * alone. A group is keyed by its committee or role.
 */
export function inboxKey({
	kind,
	inbox,
	committeeId,
	roleId,
	trustedPersonName
}: {
	kind?: ChatKind;
	inbox?: ChatInbox | null;
	committeeId?: string | null;
	roleId?: string | null;
	/** Set on a chat with one trusted person, which only that person reads */
	trustedPersonName?: string | null;
}) {
	if (kind === 'COMMITTEE') return `GROUP:committee:${committeeId ?? ''}`;
	if (kind === 'ROLE') return `GROUP:role:${roleId ?? ''}`;
	if (inbox === 'ROLE_SUPPORT') return `${inbox}:role:${roleId ?? ''}`;
	if (inbox === 'PARTICIPANT_CARE') return inbox;
	if (inbox === 'TRUSTED_PERSON') return trustedPersonName ? `${inbox}:own` : inbox;
	return `${inbox ?? ''}:${committeeId ?? ''}`;
}

const TRUSTED: TeamInbox[] = [
	{ key: 'TRUSTED_PERSON', inbox: 'TRUSTED_PERSON', committeeAbbreviation: null, own: false },
	{ key: 'TRUSTED_PERSON:own', inbox: 'TRUSTED_PERSON', committeeAbbreviation: null, own: true }
];

/** The inboxes every committee has. */
const COMMITTEE_INBOXES: readonly ChatInbox[] = ['CHAIR', 'CONSULTANT'];

type CommitteeInbox = TeamInbox & { committeeAbbreviation: string };

const byCommittee = (a: CommitteeInbox, b: CommitteeInbox) =>
	a.committeeAbbreviation.localeCompare(b.committeeAbbreviation) || a.inbox.localeCompare(b.inbox);

const committeeInbox = ({
	kind,
	committee
}: {
	kind: ChatInbox;
	committee: { id: string; abbreviation: string };
}): CommitteeInbox => ({
	key: inboxKey({ inbox: kind, committeeId: committee.id }),
	inbox: kind,
	committeeAbbreviation: committee.abbreviation,
	own: false
});

/** A function of the caller as the inboxes and groups ask. */
interface HeldFunction {
	kind: ChatInbox;
	committeeId?: string | null;
	committee?: { abbreviation: string } | null;
	roleId?: string | null;
	role?: { name: string | null } | null;
}

/**
 * The inbox and group of each custom role somebody looks after (`ROLE_SUPPORT`), by role, and the
 * group of each committee they chair or advise (once, holding both), by committee.
 */
function rolesAndGroupsOf(functions: readonly HeldFunction[]) {
	const roles = functions.flatMap((held) =>
		held.kind === 'ROLE_SUPPORT' && held.roleId
			? [roleEntries({ ...held, roleId: held.roleId })]
			: []
	);
	const committeeGroups = new Map(
		functions.flatMap((held) => {
			const group = committeeGroupOf(held);
			return group ? [[group.key, group] as const] : [];
		})
	);
	return {
		roleInboxes: roles.map((role) => role.inbox).sort(byName),
		groups: [
			...[...committeeGroups.values()].sort(byName),
			...roles.map((role) => role.group).sort(byName)
		]
	};
}

const byName = (a: TeamInbox, b: TeamInbox) =>
	(a.committeeAbbreviation ?? a.roleName ?? '').localeCompare(
		b.committeeAbbreviation ?? b.roleName ?? ''
	);

/** The inbox and the group of a custom role somebody looks after. */
function roleEntries(held: HeldFunction & { roleId: string }) {
	const base = { committeeAbbreviation: null, roleName: held.role?.name ?? null, own: false };
	const inbox: TeamInbox = {
		...base,
		key: inboxKey({ inbox: 'ROLE_SUPPORT', roleId: held.roleId }),
		inbox: 'ROLE_SUPPORT'
	};
	const group: TeamInbox = {
		...base,
		key: inboxKey({ kind: 'ROLE', roleId: held.roleId }),
		inbox: 'GROUP',
		group: { committeeId: null, roleId: held.roleId }
	};
	return { inbox, group };
}

/** The group of the committee somebody chairs or advises; undefined for every other function. */
function committeeGroupOf(held: HeldFunction): TeamInbox | undefined {
	if ((held.kind !== 'CHAIR' && held.kind !== 'CONSULTANT') || !held.committeeId) return undefined;
	return {
		key: inboxKey({ kind: 'COMMITTEE', committeeId: held.committeeId }),
		inbox: 'GROUP',
		committeeAbbreviation: held.committee?.abbreviation ?? null,
		own: false,
		group: { committeeId: held.committeeId, roleId: null }
	};
}

/**
 * The inboxes somebody answers: participant care's for who cares for the participants, a trusted
 * person's two (all of them together, and their own), one per committee function they hold, by
 * committee, and one per custom role they look after. A system admin reads every inbox but the
 * trusted persons' and the roles': participant care's and the chairs' and consultants' of every
 * committee. Last the groups they are in by their functions, which a system admin is not in by
 * being one.
 */
export function inboxesOf({
	cares,
	functions,
	isAdmin = false,
	committees = []
}: {
	cares: boolean;
	functions: readonly HeldFunction[];
	isAdmin?: boolean;
	/** The conference's committees: an admin reads the inboxes of all of them */
	committees?: readonly { id: string; abbreviation: string }[];
}): TeamInbox[] {
	const held = isAdmin
		? committees.flatMap((committee) =>
				COMMITTEE_INBOXES.map((kind) => committeeInbox({ kind, committee }))
			)
		: functions.flatMap((held) =>
				held.committeeId && held.committee && held.kind !== 'ROLE_SUPPORT'
					? [
							committeeInbox({
								kind: held.kind,
								committee: { id: held.committeeId, abbreviation: held.committee.abbreviation }
							})
						]
					: []
			);
	const care: TeamInbox = {
		key: inboxKey({ inbox: 'PARTICIPANT_CARE' }),
		inbox: 'PARTICIPANT_CARE',
		committeeAbbreviation: null,
		own: false
	};
	const trusted = functions.some((held) => held.kind === 'TRUSTED_PERSON');
	const { roleInboxes, groups } = rolesAndGroupsOf(functions);
	return [
		...(cares ? [care] : []),
		...(trusted ? TRUSTED : []),
		...held.sort(byCommittee),
		...roleInboxes,
		...groups
	];
}

/** What an inbox or group of the filter is called in full: "Chairs · GA", "Group Press". */
export function teamInboxName(inbox: TeamInbox) {
	if (inbox.inbox === 'GROUP') {
		return groupName({
			kind: inbox.group?.roleId ? 'ROLE' : 'COMMITTEE',
			committee: inbox.committeeAbbreviation ? { abbreviation: inbox.committeeAbbreviation } : null,
			role: { name: inbox.roleName ?? null }
		});
	}
	return inboxName({ ...inbox, inbox: inbox.inbox });
}

/** How much of each inbox is unread, by its key. */
export function unreadByInbox(
	chats: readonly {
		kind?: ChatKind;
		inbox?: ChatInbox | null;
		committeeId?: string | null;
		roleId?: string | null;
		trustedPersonName?: string | null;
		unreadCount: number;
	}[]
) {
	const unread = new Map<string, number>();
	for (const chat of chats) {
		const key = inboxKey(chat);
		unread.set(key, (unread.get(key) ?? 0) + chat.unreadCount);
	}
	return unread;
}

/**
 * An inbox's chats as its list shows them: the open ones, and with the archive shown the archived
 * ones after them. `archived` counts the ones put away, shown or not.
 */
export function listedChats<T extends { archived: boolean }>({
	chats,
	showArchive
}: {
	chats: readonly T[];
	showArchive: boolean;
}) {
	const open = chats.filter((chat) => !chat.archived);
	const archived = chats.filter((chat) => chat.archived);
	return { chats: showArchive ? [...open, ...archived] : open, archived: archived.length };
}

/**
 * A kind of inbox as the filter's first row offers it: participant care's one inbox, or the
 * chairs', consultants' or trusted persons' several, which a second row tells apart. A group of one
 * inbox is keyed by that inbox; a group of several by its kind, narrowing to all of them.
 */
export interface InboxGroup {
	key: string;
	kind: InboxKind;
	inboxes: TeamInbox[];
}

/** The inbox groups, in the order their first inbox comes in. */
export function inboxGroups(inboxes: readonly TeamInbox[]): InboxGroup[] {
	const byKind = new Map<InboxKind, TeamInbox[]>();
	for (const inbox of inboxes) byKind.set(inbox.inbox, [...(byKind.get(inbox.inbox) ?? []), inbox]);
	return [...byKind].map(([kind, members]) => {
		const [only] = members;
		return {
			key: members.length === 1 && only ? only.key : `group:${kind}`,
			kind,
			inboxes: members
		};
	});
}

/**
 * What a filter key narrows the list to: its group, the one inbox if it names one, and the keys of
 * the inboxes whose chats stay. A key naming nothing the caller answers (a function taken away)
 * narrows nothing.
 */
export function inboxFilter({
	groups,
	selected
}: {
	groups: readonly InboxGroup[];
	selected: string | null | undefined;
}): { key: string; group: InboxGroup; inbox: TeamInbox | null; keys: Set<string> } | null {
	for (const group of groups) {
		const inbox =
			group.inboxes.find((inbox) => inbox.key === selected) ??
			(group.key === selected && group.inboxes.length === 1 ? group.inboxes[0] : undefined);
		if (inbox) return { key: inbox.key, group, inbox, keys: new Set([inbox.key]) };
		if (group.key === selected) {
			const keys = new Set(group.inboxes.map((inbox) => inbox.key));
			return { key: group.key, group, inbox: null, keys };
		}
	}
	return null;
}

/**
 * The inbox filter's two rows: the kinds, when there are several, and the inboxes of the kind
 * chosen (or of the only one), when it has several. Each row starts with its "all". Every button
 * says whether it is pressed, the filter key pressing it selects (pressed again, it lets go) and
 * how much is unread behind it.
 */
export function inboxFilterRows({
	groups,
	selected,
	unreadOf
}: {
	groups: readonly InboxGroup[];
	selected: string | null;
	unreadOf: ReadonlyMap<string, number>;
}) {
	const filter = inboxFilter({ groups, selected });
	const several = groups.length > 1;
	const unreadIn = (inboxes: readonly TeamInbox[]) =>
		inboxes.reduce((sum, inbox) => sum + (unreadOf.get(inbox.key) ?? 0), 0);
	const kinds = several
		? {
				all: { pressed: filter === null, target: null, unread: 0 },
				groups: groups.map((group) => {
					const pressed = filter?.group.key === group.key;
					return {
						group,
						pressed,
						target: pressed ? null : group.key,
						unread: unreadIn(group.inboxes)
					};
				})
			}
		: null;
	// the inboxes of the kind chosen, or of the only kind there is
	const group = several ? filter?.group : groups[0];
	// with one kind only, "all" in the second row is the whole list
	const allMembers = several ? (group?.key ?? null) : null;
	const members =
		group && group.inboxes.length > 1
			? {
					group,
					all: { pressed: selected === allMembers, target: allMembers, unread: 0 },
					inboxes: group.inboxes.map((inbox) => {
						const pressed = filter?.inbox?.key === inbox.key;
						return {
							inbox,
							pressed,
							target: pressed ? allMembers : inbox.key,
							unread: unreadOf.get(inbox.key) ?? 0
						};
					})
				}
			: null;
	return { kinds, members };
}
