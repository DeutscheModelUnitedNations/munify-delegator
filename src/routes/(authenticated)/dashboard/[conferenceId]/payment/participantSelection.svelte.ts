import { toast } from 'svelte-sonner';
import { m } from '#lib/paraglide/messages.js';

export interface PayableUser {
	id: string;
	givenName: string | null;
	familyName: string | null;
}

export type PaymentParticipantSelection = ReturnType<typeof createPaymentParticipantSelection>;

/**
 * Who a payment covers. Starts out as everyone the caller may pay for (`defaults`) once those have
 * loaded (`ready`), and is locked once a transfer reference has been generated for it. Must be
 * called during component initialisation.
 */
export function createPaymentParticipantSelection(
	defaults: () => PayableUser[] | undefined,
	ready: () => boolean
) {
	let selected = $state<PayableUser[]>([]);
	let isReferenceCreated = $state(false);

	/** Refuses, with a toast, to change a selection a reference was already generated for. */
	function locked() {
		if (isReferenceCreated) {
			toast.error(m.cannotChangeParticipantsAfterReferenceCreated());
		}
		return isReferenceCreated;
	}

	function isSelected(userId: string) {
		return selected.some((user) => user.id === userId);
	}

	function setSelected(user: PayableUser, isSelectedNow: boolean) {
		if (locked()) return;
		if (!isSelectedNow) {
			selected = selected.filter((x) => x.id !== user.id);
		} else if (!isSelected(user.id)) {
			selected = [...selected, user];
		}
	}

	function selectAll() {
		if (locked()) return;
		const current = defaults();
		if (current) selected = current;
	}

	function clear() {
		if (locked()) return;
		selected = [];
	}

	let isInitialized = false;
	$effect(() => {
		if (ready() && !isInitialized) {
			selectAll();
			isInitialized = true;
		}
	});

	return {
		get selected() {
			return selected;
		},
		set selected(value: PayableUser[]) {
			selected = value;
		},
		get isReferenceCreated() {
			return isReferenceCreated;
		},
		set isReferenceCreated(value: boolean) {
			isReferenceCreated = value;
		},
		isSelected,
		setSelected,
		selectAll,
		clear
	};
}
