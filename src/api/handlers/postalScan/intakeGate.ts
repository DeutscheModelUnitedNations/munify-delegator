/** Thrown when a delivery waited too long for its turn: the scanner tries again later. */
export class IntakeBusyError extends Error {
	constructor() {
		super('Too many scans are being taken in');
		this.name = 'IntakeBusyError';
	}
}

/** Who delivers, as the gate shares its places out. */
export interface IntakeKeys {
	conferenceId: string;
	teamMemberId: string;
}

/**
 * Lets deliveries in: only so many at once are read into memory (`places`), of them only so many of
 * one conference and of one person, so nobody keeps the others out. One without a place waits before
 * anything of it is read, in the order they came, and is turned away after `patienceMs`. Those let in
 * are worked on one at a time.
 */
export function createIntakeGate({
	places,
	perConference,
	perMember,
	patienceMs
}: {
	places: number;
	perConference: number;
	perMember: number;
	patienceMs: number;
}) {
	const inside: IntakeKeys[] = [];
	const waiting: { keys: IntakeKeys; enter: () => void }[] = [];
	let last: Promise<unknown> = Promise.resolve();

	const count = (matches: (keys: IntakeKeys) => boolean) => inside.filter(matches).length;
	const hasPlace = ({ conferenceId, teamMemberId }: IntakeKeys) =>
		inside.length < places &&
		count((keys) => keys.conferenceId === conferenceId) < perConference &&
		count((keys) => keys.teamMemberId === teamMemberId) < perMember;

	function admitWaiting() {
		for (const next of [...waiting]) {
			if (!hasPlace(next.keys)) continue;
			waiting.splice(waiting.indexOf(next), 1);
			inside.push(next.keys);
			next.enter();
		}
	}

	async function enter(keys: IntakeKeys) {
		if (hasPlace(keys)) {
			inside.push(keys);
			return;
		}
		await new Promise<void>((resolve, reject) => {
			const entry = {
				keys,
				enter: () => {
					clearTimeout(timer);
					resolve();
				}
			};
			const timer = setTimeout(() => {
				waiting.splice(waiting.indexOf(entry), 1);
				reject(new IntakeBusyError());
			}, patienceMs);
			waiting.push(entry);
		});
	}

	function leave(keys: IntakeKeys) {
		inside.splice(inside.indexOf(keys), 1);
		admitWaiting();
	}

	return {
		/**
		 * Takes in a delivery: `receive` reads it once it has a place, `work` runs in turn. Throws
		 * `IntakeBusyError` when there is no place for it in time.
		 */
		async run<D, T>({
			keys,
			receive,
			work
		}: {
			keys: IntakeKeys;
			receive: () => Promise<D>;
			work: (delivery: D) => Promise<T>;
		}): Promise<T> {
			// of its own, so it is this delivery that leaves, not another of the same person
			const own = { ...keys };
			await enter(own);
			try {
				const delivery = await receive();
				const done = last.then(() => work(delivery));
				// the next one runs whether or not this one failed
				last = done.catch(() => undefined);
				return await done;
			} finally {
				leave(own);
			}
		}
	};
}
