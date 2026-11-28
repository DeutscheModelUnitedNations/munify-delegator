/**
 * The sounds a scanner makes: a short high beep for a page done with, a low double tone for one a
 * person has to look at. Browsers let a page make sound only once the person did something on it,
 * so `unlock` is called on each of their gestures until it took.
 */
export function createScanSounds() {
	let context: AudioContext | undefined;

	/** The audio context, woken; none where the browser has none. */
	function awake() {
		if (typeof AudioContext === 'undefined') return undefined;
		context ??= new AudioContext();
		if (context.state === 'suspended') void context.resume().catch(() => undefined);
		return context;
	}

	/** A tone of `frequency` Hz, `after` seconds from now, `length` seconds long, faded in and out. */
	function tone({
		frequency,
		after,
		length
	}: {
		frequency: number;
		after: number;
		length: number;
	}) {
		const audio = awake();
		if (!audio) return;
		const start = audio.currentTime + after;
		const oscillator = audio.createOscillator();
		const gain = audio.createGain();
		oscillator.type = 'square';
		oscillator.frequency.setValueAtTime(frequency, start);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
		oscillator.connect(gain).connect(audio.destination);
		oscillator.start(start);
		oscillator.stop(start + length + 0.02);
	}

	return {
		/** Lets the page make sound; call it from a gesture of the person's. */
		unlock: () => void awake(),
		/** Whether sound can be made now. */
		get unlocked() {
			return context?.state === 'running';
		},
		/** A page done with. */
		success: () => tone({ frequency: 1760, after: 0, length: 0.12 }),
		/** A page a person has to look at. */
		problem() {
			tone({ frequency: 440, after: 0, length: 0.2 });
			tone({ frequency: 294, after: 0.26, length: 0.35 });
		}
	};
}
