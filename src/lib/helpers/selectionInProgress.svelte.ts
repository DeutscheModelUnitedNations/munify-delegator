import { selectionInProgress, technicalRegistrationDeadline } from './applicationReadiness';

type DeadlineConference = Parameters<typeof selectionInProgress>[0]['conference'];

/** The longest delay `setTimeout` takes; a longer wait re-arms itself when this one fires. */
const MAX_TIMEOUT = 2_147_483_647;

/**
 * `selectionInProgress`, re-evaluated once the technical deadline passes, so an open dashboard
 * switches over on its own. Call it while a component initializes.
 */
export function watchSelectionInProgress(conference: () => DeadlineConference) {
	let now = $state(Date.now());

	$effect(() => {
		const current = conference();
		if (current.state !== 'PARTICIPANT_REGISTRATION') return;
		const delay = technicalRegistrationDeadline(current).getTime() - now + 1000;
		if (delay <= 0) return;
		const timeout = setTimeout(() => (now = Date.now()), Math.min(delay, MAX_TIMEOUT));
		return () => clearTimeout(timeout);
	});

	return {
		get current() {
			return selectionInProgress({ conference: conference(), now });
		}
	};
}
