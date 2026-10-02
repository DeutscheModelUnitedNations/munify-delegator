import type { TableColumn } from 'svelte-table';
import { m } from '$lib/paraglide/messages';

interface PersonRow {
	user: { id: string; familyName: string | null; givenName: string | null };
}

/** The person's name, family name first and upper-cased, sortable and searchable. */
export function nameColumn<T extends PersonRow>(): TableColumn<T> {
	return {
		key: 'name',
		title: m.name(),
		value: (row) => `${row.user.familyName} ${row.user.givenName} `,
		renderValue: (row) =>
			`<span class="uppercase">${row.user.familyName}</span> ${row.user.givenName} `,
		sortable: true,
		parseHTML: true
	};
}

/** Whether the registration was submitted, as a check or an hourglass. */
export function appliedColumn<T extends { applied: boolean }>(
	getTableSize: () => string
): TableColumn<T> {
	return {
		key: 'applied',
		title: 'Applied',
		value: (row) => (row.applied ? 1 : 0),
		renderValue: (row) =>
			row.applied
				? `<i class="fa-solid fa-circle-check text-success text-${getTableSize()}"></i>`
				: `<i class="fa-solid fa-hourglass-half text-warning text-${getTableSize()}"></i>`,
		parseHTML: true,
		sortable: true,
		class: 'text-center'
	};
}

/**
 * A button opening the person's user card. The table renders HTML strings, so the button cannot
 * carry a handler: wrap the table in `RegistrationAdminTable`, which picks up its clicks.
 */
export function userCardColumn<T extends PersonRow>(): TableColumn<T> {
	return {
		key: 'userCard',
		title: '',
		renderValue: (row) =>
			`<button class="btn btn-ghost btn-xs btn-square usercard-btn" data-userid="${row.user.id}" aria-label="Open user card"><i class="fa-duotone fa-id-card"></i></button>`,
		parseHTML: true,
		class: 'text-center w-10 print:hidden'
	};
}
