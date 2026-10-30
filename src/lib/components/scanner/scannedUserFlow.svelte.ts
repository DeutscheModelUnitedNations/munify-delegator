import { queryParameters } from 'sveltekit-search-params';
import { toast } from 'svelte-sonner';
import { client, type Mutation } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { genericPromiseToastMessages } from '#lib/utils/toast';

/** A status change a scan flow makes, minus the identifying fields the flow fills in. */
export type StatusChange = Omit<
	Parameters<Mutation['updateConferenceParticipant']>[0],
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

export type ScannedUserFlow<S> = ReturnType<typeof createScannedUserFlow<S>>;

/**
 * The state behind a "scan a participant, check them off in a drawer" page (postal
 * registration): the scanned id in the URL, the person loaded for it, the drawer that shows them
 * only once their data has arrived, and a guard against running the confirm action twice.
 *
 * Call it during component initialisation: it reads the URL through `queryParameters` and
 * registers effects.
 *
 * @param fetchStatus loads the fields of the person's status row this flow works on
 */
export function createScannedUserFlow<S>(fetchStatus: (userId: string) => Promise<S | null>) {
	const params = queryParameters({ queryUserId: true });
	let lastLoadedUserId = $state('');

	let data = $state<ScannedUserData<S>>();
	let loading = $state(false);
	let drawerOpen = $state(false);
	/** Set while the confirm action runs, so a held hotkey cannot fire it twice. */
	let busy = $state(false);
	let scanner = $state<Resettable>();

	function getQueryUserId(): string | null {
		return params.queryUserId;
	}

	/** The loaded data, but only while it belongs to the person currently scanned. */
	function getCurrent(): ScannedUserData<S> | undefined {
		const queryId = getQueryUserId();
		if (!queryId || data?.user?.id !== queryId) return undefined;
		return data;
	}

	/** The id of the scanned person once their data has finished loading. */
	function getLoadedUserId(): string | undefined {
		const id = getCurrent()?.user?.id;
		return loading ? undefined : id;
	}

	async function load(userId: string) {
		loading = true;
		try {
			const [user, status] = await Promise.all([fetchScannedUser(userId), fetchStatus(userId)]);
			data = { user, status };
		} finally {
			loading = false;
		}
	}

	// Fetch the person whenever a new code is scanned
	$effect(() => {
		const queryId = getQueryUserId();
		if (queryId) void load(queryId);
	});

	// Close the drawer while nothing, or someone not yet loaded, is scanned
	$effect(() => {
		const queryId = getQueryUserId();
		if (!queryId) {
			drawerOpen = false;
			lastLoadedUserId = '';
			return;
		}
		if (queryId !== lastLoadedUserId) {
			drawerOpen = false;
		}
	});

	// Open it once the scanned person's data is there
	$effect(() => {
		const loadedId = getLoadedUserId();
		if (!loadedId) return;
		lastLoadedUserId = loadedId;
		drawerOpen = true;
	});

	return {
		get data() {
			return data;
		},
		set data(value: ScannedUserData<S> | undefined) {
			data = value;
		},
		get loading() {
			return loading;
		},
		set loading(value: boolean) {
			loading = value;
		},
		get drawerOpen() {
			return drawerOpen;
		},
		set drawerOpen(value: boolean) {
			drawerOpen = value;
		},
		get busy() {
			return busy;
		},
		set busy(value: boolean) {
			busy = value;
		},
		get scanner() {
			return scanner;
		},
		set scanner(value: Resettable | undefined) {
			scanner = value;
		},

		get queryUserId(): string | null {
			return getQueryUserId();
		},
		set queryUserId(value: string | null) {
			params.queryUserId = value;
		},

		get current() {
			return getCurrent();
		},

		/** Whether the confirm action may run: someone scanned and loaded, and no action running. */
		get canConfirm(): boolean {
			return !!getQueryUserId() && !!data?.user && !busy;
		},

		load,

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
			await load(userId);
		},

		/** Runs `action` unless another one is still running. */
		async runExclusive(action: () => Promise<void>) {
			if (busy) return;
			busy = true;
			try {
				await action();
			} finally {
				busy = false;
			}
		},

		/** Closes the drawer and readies the scanner for the next person. */
		reset() {
			drawerOpen = false;
			params.queryUserId = '';
			scanner?.reset();
		}
	};
}
