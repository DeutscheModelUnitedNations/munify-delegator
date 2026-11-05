<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/**
	 * The grip on a header's right edge: drag to resize the column, double-click for its default
	 * width, arrow keys for steps of ten pixels.
	 */
	interface Props {
		width: number;
		onresize: (width: number) => void;
		onreset: () => void;
	}

	let { width, onresize, onreset }: Props = $props();

	function start(event: PointerEvent) {
		event.preventDefault();
		event.stopPropagation();
		const startX = event.clientX;
		const startWidth = width;
		const handle = event.currentTarget;
		if (handle instanceof Element) handle.setPointerCapture(event.pointerId);
		const move = (moved: PointerEvent) => onresize(startWidth + moved.clientX - startX);
		const stop = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', stop);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', stop);
	}

	function key(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') onresize(width - 10);
		else if (event.key === 'ArrowRight') onresize(width + 10);
		else return;
		event.preventDefault();
	}
</script>

<button
	type="button"
	aria-label={m.dataGridResizeColumn()}
	title={m.dataGridResizeColumn()}
	class="hover:bg-primary/40 focus-visible:bg-primary/40 absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none"
	onpointerdown={start}
	ondblclick={onreset}
	onkeydown={key}
></button>
