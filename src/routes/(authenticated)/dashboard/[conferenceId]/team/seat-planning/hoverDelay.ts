/**
 * The delays of a hover popover: it opens a while after the pointer arrives, so sweeping over a
 * list does not flash one for every row, and closes a while after it leaves, so the pointer can
 * cross the gap into the popover.
 */
export function createHoverDelay<T>({
	showDelay,
	hideDelay,
	onShow,
	onHide
}: {
	showDelay: number;
	hideDelay: number;
	onShow: (value: T) => void;
	onHide: () => void;
}) {
	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	const cancelShow = () => {
		clearTimeout(showTimer);
		showTimer = undefined;
	};
	const cancelHide = () => {
		clearTimeout(hideTimer);
		hideTimer = undefined;
	};

	return {
		/** Shows `value` after the delay, in place of one still waiting; keeps an open popover open */
		show(value: T) {
			cancelHide();
			cancelShow();
			showTimer = setTimeout(() => {
				showTimer = undefined;
				onShow(value);
			}, showDelay);
		},
		/**
		 * Hides after the delay. Asking again while it waits does not start the delay over: every
		 * pointer move outside asks, so a restart would keep the popover open while the pointer moves.
		 */
		hide() {
			cancelShow();
			if (hideTimer !== undefined) return;
			hideTimer = setTimeout(() => {
				hideTimer = undefined;
				onHide();
			}, hideDelay);
		},
		/** The pointer is back on the anchor or the popover: whatever was going to close it does not */
		stay: cancelHide,
		dispose() {
			cancelShow();
			cancelHide();
		}
	};
}
