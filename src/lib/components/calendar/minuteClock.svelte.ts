/**
 * The present moment in milliseconds, following along every minute and whenever the page is looked
 * at again (a phone stops the timers of a page in the background). Created while a component
 * initialises.
 */
export function createMinuteClock() {
	let time = $state(Date.now());

	$effect(() => {
		const tick = () => (time = Date.now());
		const interval = setInterval(tick, 60_000);
		document.addEventListener('visibilitychange', tick);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', tick);
		};
	});

	return {
		get time() {
			return time;
		}
	};
}
