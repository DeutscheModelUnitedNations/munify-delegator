import { toast } from 'svelte-sonner';
import { m } from '$lib/paraglide/messages';

export interface PayableUser {
	id: string;
	givenName: string | null;
	familyName: string | null;
}

/**
 * Who a payment covers. Starts out as everyone the caller may pay for (`defaults`) once those have
 * loaded (`ready`), and is locked once a transfer reference has been generated for it. Must be
 * created during component initialisation.
 */
export class PaymentParticipantSelection {
	selected = $state<PayableUser[]>([]);
	isReferenceCreated = $state(false);

	#defaults: () => PayableUser[] | undefined;

	constructor(defaults: () => PayableUser[] | undefined, ready: () => boolean) {
		this.#defaults = defaults;
		let isInitialized = false;
		$effect(() => {
			if (ready() && !isInitialized) {
				this.selectAll();
				isInitialized = true;
			}
		});
	}

	/** Refuses, with a toast, to change a selection a reference was already generated for. */
	#locked() {
		if (this.isReferenceCreated) {
			toast.error(m.cannotChangeParticipantsAfterReferenceCreated());
		}
		return this.isReferenceCreated;
	}

	isSelected(userId: string) {
		return this.selected.some((user) => user.id === userId);
	}

	setSelected(user: PayableUser, selected: boolean) {
		if (this.#locked()) return;
		if (!selected) {
			this.selected = this.selected.filter((x) => x.id !== user.id);
		} else if (!this.isSelected(user.id)) {
			this.selected = [...this.selected, user];
		}
	}

	selectAll() {
		if (this.#locked()) return;
		const defaults = this.#defaults();
		if (defaults) this.selected = defaults;
	}

	clear() {
		if (this.#locked()) return;
		this.selected = [];
	}
}
