import { getLocale } from '#lib/paraglide/runtime';
import { m } from '#lib/paraglide/messages';
import { capitalizeFirstLetter } from '#lib/helpers/capitalizeFirstLetter';
import { cellOf, defineColumns } from '#lib/components/dataGrid/gridColumn';
import { WAITING_LIST_COLUMNS } from '#lib/dataGrid/tables/waitingList';
import type { BaseView } from '#lib/dataGrid/tableState';
import HiddenIcon from './HiddenIcon.svelte';
import type { WaitingListRow } from './waitingListRows';

const dateTime = (date: Date | null) =>
	date
		? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(date)
		: '—';

/** The waiting list's columns: the API's metadata (`WAITING_LIST_COLUMNS`) with labels and cells. */
export function waitingListColumns() {
	const entry = m.waitingList();
	const person = m.personalData();
	const texts = m.dataGridApplicationTexts();
	return defineColumns<WaitingListRow, (typeof WAITING_LIST_COLUMNS)[number]>({
		metas: WAITING_LIST_COLUMNS,
		extras: {
			position: {
				label: m.waitingListPosition(),
				group: entry,
				size: 110,
				align: 'right',
				value: (row) => row.position ?? null,
				text: (row) => (row.position !== undefined ? String(row.position) : '—')
			},
			createdAt: {
				label: m.timestamp(),
				group: entry,
				size: 180,
				value: (row) => row.createdAt,
				text: (row) => dateTime(row.createdAt)
			},
			assignedAt: {
				label: m.waitingListSeatedAt(),
				group: entry,
				defaultVisible: false,
				size: 180,
				value: (row) => row.assignedAt,
				text: (row) => dateTime(row.assignedAt)
			},
			seated: {
				label: m.dataGridWaitingListSeated(),
				group: entry,
				defaultVisible: false,
				value: (row) => row.seated
			},
			family_name: {
				label: m.familyName(),
				group: person,
				alwaysVisible: true,
				value: (row) => row.family_name,
				text: (row) => capitalizeFirstLetter(row.family_name)
			},
			given_name: {
				label: m.givenName(),
				group: person,
				value: (row) => row.given_name,
				text: (row) => capitalizeFirstLetter(row.given_name)
			},
			email: { label: m.email(), group: person, size: 220, value: (row) => row.email },
			phone: { label: m.phone(), group: person, value: (row) => row.phone },
			birthday: {
				label: m.birthday(),
				group: person,
				defaultVisible: false,
				value: (row) => row.birthday
			},
			conferenceAge: {
				label: m.conferenceAge(),
				group: person,
				align: 'right',
				size: 110,
				value: (row) => row.conferenceAge ?? null
			},
			participationCount: {
				label: m.participationCount(),
				group: person,
				align: 'right',
				value: (row) => row.participationCount
			},
			city: {
				label: m.city(),
				group: person,
				value: (row) => row.city,
				text: (row) => (row.city ? capitalizeFirstLetter(row.city) : '—')
			},
			school: { label: m.schoolOrInstitution(), group: person, value: (row) => row.school },
			motivation: {
				label: m.motivation(),
				group: texts,
				size: 240,
				value: (row) => row.motivation
			},
			experience: {
				label: m.experience(),
				group: texts,
				size: 240,
				value: (row) => row.experience
			},
			requests: { label: m.specialWishes(), group: texts, size: 240, value: (row) => row.requests },
			hidden: {
				label: m.hidden(),
				group: entry,
				size: 120,
				value: (row) => row.hidden,
				cell: (row) => cellOf({ component: HiddenIcon, props: { value: row.hidden } })
			}
		}
	});
}

/** The table opens on the visible entries still waiting, first come first. */
export const WAITING_LIST_BASE: BaseView = {
	sorting: [{ id: 'createdAt', desc: false }],
	filter: {
		type: 'group',
		op: 'and',
		items: [
			{ type: 'condition', column: 'hidden', operator: 'isFalse' },
			{ type: 'condition', column: 'seated', operator: 'isFalse' }
		]
	},
	pageSize: 20
};
