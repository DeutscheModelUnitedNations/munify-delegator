import { queryParameters } from 'sveltekit-search-params';
import { toast } from 'svelte-sonner';
import { client, type Mutation } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';
import { genericPromiseToastMessages } from '$lib/utils/toast';

/** A status change a scan flow makes, minus the identifying fields the flow fills in. */
export type StatusChange = Omit<
	Parameters<Mutation['updateConferenceParticipantStatus']>[0],
	'conferenceId' | 'id' | 'userId'
>;

/** The scanned person's identity, which every scan flow shows. */
function fetchScannedUser(userId: string) {
	return client.query.user({
		__args: { id: userId },
		id: true,
		givenName: true,
		familyName: true,
		birthday: true
	});
}

/** What a scan flow loads for the scanned person: their identity and their status row. */
export interface ScannedUserData<S> {
	user: Awaited<ReturnType<typeof fetchScannedUser>> | null;
	status: S | null;
}

interface Resettable {
	reset(): void;
}

/**
 * The state behind a "scan a participant, check them off in a drawer" page (postal
 * registration): the scanned id in the URL, the person loaded for it, the drawer that shows them
 * only once their data has arrived, and a guard against running the confirm action twice.
 *
 * Construct it during component initialisation: it reads the URL through `queryParameters` and
 * registers effects.
 */
export class ScannedUserFlow<S> {
	#params = queryParameters({ queryUserId: true });
	#fetchStatus: (userId: string) => Promise<S | null>;
	#lastLoadedUserId = $state('');

	data = $state<ScannedUserData<S>>();
	loading = $state(false);
	drawerOpen = $state(false);
	/** Set while the confirm action runs, so a held hotkey cannot fire it twice. */
	busy = $state(false);
	scanner = $state<Resettable>();

	/** @param fetchStatus loads the fields of the person's status row this flow works on */
	constructor(fetchStatus: (userId: string) => Promise<S | null>) {
		this.#fetchStatus = fetchStatus;

		// Fetch the person whenever a new code is scanned
		$effect(() => {
			const queryId = this.queryUserId;
			if (queryId) void this.load(queryId);
		});

		// Close the drawer while nothing, or someone not yet loaded, is scanned
		$effect(() => {
			const queryId = this.queryUserId;
			if (!queryId) {
				this.drawerOpen = false;
				this.#lastLoadedUserId = '';
				return;
			}
			if (queryId !== this.#lastLoadedUserId) {
				this.drawerOpen = false;
			}
		});

		// Open it once the scanned person's data is there
		$effect(() => {
			const loadedId = this.#loadedUserId;
			if (!loadedId) return;
			this.#lastLoadedUserId = loadedId;
			this.drawerOpen = true;
		});
	}

	get queryUserId(): string | null {
		return this.#params.queryUserId;
	}

	set queryUserId(value: string | null) {
		this.#params.queryUserId = value;
	}

	/** The loaded data, but only while it belongs to the person currently scanned. */
	get current(): ScannedUserData<S> | undefined {
		const queryId = this.queryUserId;
		if (!queryId || this.data?.user?.id !== queryId) return undefined;
		return this.data;
	}

	/** The id of the scanned person once their data has finished loading. */
	get #loadedUserId(): string | undefined {
		const id = this.current?.user?.id;
		return this.loading ? undefined : id;
	}

	/** Whether the confirm action may run: someone scanned and loaded, and no action running. */
	get canConfirm(): boolean {
		return !!this.queryUserId && !!this.data?.user && !this.busy;
	}

	async load(userId: string) {
		this.loading = true;
		try {
			const [user, status] = await Promise.all([
				fetchScannedUser(userId),
				this.#fetchStatus(userId)
			]);
			this.data = { user, status };
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Saves a status change through `write` and reloads the person, so the drawer shows what was
	 * stored. Without a person there is nothing to change.
	 */
	async changeStatus(userId: string | undefined, write: (userId: string) => Promise<unknown>) {
		if (!userId) {
			toast.error(m.userNotFound());
			return;
		}
		const promise = write(userId);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await this.load(userId);
	}

	/** Runs `action` unless another one is still running. */
	async runExclusive(action: () => Promise<void>) {
		if (this.busy) return;
		this.busy = true;
		try {
			await action();
		} finally {
			this.busy = false;
		}
	}

	/** Closes the drawer and readies the scanner for the next person. */
	reset() {
		this.drawerOpen = false;
		this.queryUserId = '';
		this.scanner?.reset();
	}
}
