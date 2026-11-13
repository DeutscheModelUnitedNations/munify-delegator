import { m } from '#lib/paraglide/messages';
import formatNames from '#lib/helpers/formatNames';
import type { AnnouncementState } from '#lib/helpers/announcements';

/** What one row of the team's announcement list shows: its badges, its facts and its buttons. */

type Person = { givenName: string; familyName: string } | null | undefined;

/** The fields of a row the list reads. */
export interface RowFacts {
	importance: string;
	pinned: boolean;
	notifyByMail: boolean;
	publishAt?: Date | string | null;
	visibleUntil?: Date | string | null;
	editedAt?: Date | string | null;
	recipientCount: number;
	readCount: number;
	author?: Person;
	publishedBy?: Person;
}

const nameOf = (user: Person) =>
	user
		? formatNames({
				givenName: user.givenName,
				familyName: user.familyName,
				options: { givenNameUppercase: false, familyNameUppercase: false }
			})
		: undefined;

export interface RowBadge {
	key: string;
	look: string;
	icon?: string;
	label: string;
}

const IMPORTANCE_BADGE: Record<string, () => RowBadge> = {
	URGENT: () => ({ key: 'urgent', look: 'badge-error', label: m.announcementImportanceUrgent() }),
	IMPORTANT: () => ({
		key: 'important',
		look: 'badge-warning',
		label: m.announcementImportanceImportant()
	})
};

/** How loud it is, whether it is pinned and whether a mail goes with it. */
export function rowBadges(row: RowFacts): RowBadge[] {
	const badges = [IMPORTANCE_BADGE[row.importance]?.()];
	if (row.pinned)
		badges.push({
			key: 'pinned',
			look: 'badge-ghost gap-1',
			icon: 'ph-fill ph-push-pin',
			label: m.announcementPinned()
		});
	if (row.notifyByMail)
		badges.push({
			key: 'mail',
			look: 'badge-ghost gap-1',
			icon: 'ph-duotone ph-envelope',
			label: m.announcementWithMail()
		});
	return badges.filter((badge) => !!badge);
}

export interface RowFact {
	key: string;
	text: string;
}

const isOutOrOver = (state: AnnouncementState) => state === 'PUBLISHED' || state === 'EXPIRED';

/**
 * The line under a row: when it goes or went out, until when it shows, when it changed, whom it
 * reaches (or how many of them read it, once it is out) and who wrote and published it.
 */
export function rowFacts({
	row,
	state,
	dateTime
}: {
	row: RowFacts;
	state: AnnouncementState;
	dateTime: (value: Date | string) => string;
}): RowFact[] {
	const facts: RowFact[] = [];
	if (row.publishAt) {
		const date = dateTime(row.publishAt);
		facts.push({
			key: 'publishAt',
			text:
				state === 'SCHEDULED'
					? m.announcementScheduledFor({ date })
					: m.announcementPublishedAt({ date })
		});
	}
	if (row.visibleUntil)
		facts.push({
			key: 'visibleUntil',
			text: m.announcementVisibleUntilDate({ date: dateTime(row.visibleUntil) })
		});
	if (row.editedAt)
		facts.push({ key: 'editedAt', text: m.announcementEditedAt({ date: dateTime(row.editedAt) }) });
	facts.push({
		key: 'reach',
		text: isOutOrOver(state)
			? m.announcementReadBy({ read: row.readCount, total: row.recipientCount })
			: m.announcementAudienceReaches({ count: row.recipientCount })
	});
	const author = nameOf(row.author);
	if (author) facts.push({ key: 'author', text: m.announcementWrittenBy({ name: author }) });
	const publisher = nameOf(row.publishedBy);
	if (publisher && state !== 'DRAFT')
		facts.push({ key: 'publishedBy', text: m.announcementPublishedBy({ name: publisher }) });
	return facts;
}

const ROW_ACTIONS = [
	'edit',
	'publish',
	'withdraw',
	'renotify',
	'test-mail',
	'duplicate',
	'archive',
	'delete'
] as const;
export type RowAction = (typeof ROW_ACTIONS)[number];

const ACTION_LOOK: Record<RowAction, { icon: string; label: () => string; look?: string }> = {
	edit: { icon: 'ph-pen', label: () => m.edit() },
	publish: { icon: 'ph-megaphone', label: () => m.announcementPublish(), look: 'btn-primary' },
	withdraw: { icon: 'ph-arrow-u-up-left', label: () => m.announcementWithdraw() },
	renotify: { icon: 'ph-envelope', label: () => m.announcementRenotify() },
	'test-mail': { icon: 'ph-paper-plane-tilt', label: () => m.announcementTestMail() },
	duplicate: { icon: 'ph-copy', label: () => m.announcementDuplicate() },
	archive: { icon: 'ph-archive', label: () => m.announcementArchive() },
	delete: { icon: 'ph-trash', label: () => m.delete(), look: 'btn-ghost text-error' }
};

/** Whether the row offers the action in its state. */
const OFFERED: Record<RowAction, (state: AnnouncementState, row: RowFacts) => boolean> = {
	edit: () => true,
	// a draft or an archived one goes out, anything else is taken back
	publish: (state) => state === 'DRAFT' || state === 'ARCHIVED',
	withdraw: (state) => state !== 'DRAFT' && state !== 'ARCHIVED',
	renotify: (state, row) => state === 'PUBLISHED' && row.notifyByMail,
	'test-mail': () => true,
	duplicate: () => true,
	archive: (state) => state !== 'ARCHIVED',
	delete: () => true
};

/** The buttons of a row, in their order. */
export function rowActions({ row, state }: { row: RowFacts; state: AnnouncementState }) {
	return ROW_ACTIONS.filter((action) => OFFERED[action](state, row)).map((action) => ({
		action,
		icon: ACTION_LOOK[action].icon,
		label: ACTION_LOOK[action].label(),
		look: ACTION_LOOK[action].look ?? ''
	}));
}
