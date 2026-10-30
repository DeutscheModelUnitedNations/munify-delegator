import { toast } from 'svelte-sonner';
import { m } from '#lib/paraglide/messages';

export interface PayableUser {
	id: string;
	givenName: string | null;
	familyName: string | null;
}

export type PaymentParticipantSelection = ReturnType<typeof createPaymentParticipantSelection>;

/**
 * Who a payment covers: everyone in `payable` until the payer picks, then the ones they picked
 * that are still payable. Locked once a transfer reference has been generated for it.
 */
export function createPaymentParticipantSelection(payable: () => PayableUser[]) {
	let pickedIds = $state<string[]>();
	let isReferenceCreated = $state(false);

	const selected = $derived(
		pickedIds ? payable().filter((user) => pickedIds?.includes(user.id)) : payable()
	);

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
		const ids = selected.map((x) => x.id).filter((id) => id !== user.id);
		pickedIds = isSelectedNow ? [...ids, user.id] : ids;
	}

	function selectAll() {
		if (locked()) return;
		pickedIds = undefined;
	}

	function clear() {
		if (locked()) return;
		pickedIds = [];
	}

	return {
		get selected() {
			return selected;
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
