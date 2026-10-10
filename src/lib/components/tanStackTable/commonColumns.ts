import { m } from '$lib/paraglide/messages';
import { renderComponent } from '$lib/components/tanStackTable';
import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
import AppliedIcon from './cells/AppliedIcon.svelte';
import PersonName from './cells/PersonName.svelte';
import UserCardButton from './cells/UserCardButton.svelte';

interface PersonRow {
	user: { id: string; familyName: string | null; givenName: string | null };
}

/** The person's name, family name first and upper-cased, sortable and searchable. */
export function nameColumn<T extends PersonRow>(): ManagedColumn<T> {
	return {
		id: 'name',
		header: m.name(),
		accessorFn: (row) => `${row.user.familyName} ${row.user.givenName}`,
		cell: ({ row }) =>
			renderComponent(PersonName, {
				familyName: row.original.user.familyName,
				givenName: row.original.user.givenName
			})
	};
}

/** Whether the registration was submitted, as a check or an hourglass. */
export function appliedColumn<T extends { applied: boolean }>(): ManagedColumn<T> {
	return {
		id: 'applied',
		header: 'Applied',
		// the accessor is what gets searched, so keep it out of free text: a number
		accessorFn: (row) => (row.applied ? 1 : 0),
		cell: ({ row }) => renderComponent(AppliedIcon, { applied: row.original.applied })
	};
}

/** A button opening the person's user card. */
export function userCardColumn<T extends PersonRow>(): ManagedColumn<T> {
	return {
		id: 'userCard',
		header: '',
		cell: ({ row }) => renderComponent(UserCardButton, { userId: row.original.user.id }),
		enableSorting: false
	};
}
