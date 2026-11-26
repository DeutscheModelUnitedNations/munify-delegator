/** Thrown when a delivery waited too long for its turn: the scanner tries again later. */
export class IntakeBusyError extends Error {
	constructor() {
		super('Too many scans are being taken in');
		this.name = 'IntakeBusyError';
	}
}

/**
 * Lets deliveries in: only so many at once are read into memory (`places`), of them only so many of one
 * person, so nobody keeps the others out. One without a place waits before anything of it is read, in the
 * order they came, and is turned away after `patienceMs`.
 */
export function createIntakeGate({
	places,
	perPerson,
	patienceMs
}: {
	places: number;
	perPerson: number;
	patienceMs: number;
}) {
	const inside: string[] = [];
	const waiting: { userId: string; enter: () => void }[] = [];

	const hasPlace = (userId: string) =>
		inside.length < places && inside.filter((other) => other === userId).length < perPerson;

	function admitWaiting() {
		for (const next of [...waiting]) {
			if (!hasPlace(next.userId)) continue;
			waiting.splice(waiting.indexOf(next), 1);
			inside.push(next.userId);
			next.enter();
		}
	}

	async function enter(userId: string) {
		if (hasPlace(userId)) {
			inside.push(userId);
			return;
		}
		await new Promise<void>((resolve, reject) => {
			const entry = {
				userId,
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

	function leave(userId: string) {
		inside.splice(inside.indexOf(userId), 1);
		admitWaiting();
	}

	return {
		/**
		 * Receives a delivery: `work` reads it once it has a place. Throws `IntakeBusyError` when there is
		 * no place for it in time.
		 */
		async run<T>({ userId, work }: { userId: string; work: () => Promise<T> }): Promise<T> {
			await enter(userId);
			try {
				return await work();
			} finally {
				leave(userId);
			}
		}
	};
}
