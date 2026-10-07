<script lang="ts">
	import { draggable } from '@thisux/sveltednd';
	import type { Snippet } from 'svelte';

	/**
	 * Wraps an application card so it can be dragged out of `container`; the dragged data is the
	 * application's id. `onDragChange` reports when a drag starts and ends, so the page can show its
	 * drop zones.
	 */
	interface Props {
		container: string;
		id: string;
		/** Classes applied while dragging; the library's default when left out. */
		draggingClass?: string;
		onDragChange: (dragging: boolean) => void;
		children: Snippet;
	}

	let { container, id, draggingClass, onDragChange, children }: Props = $props();
</script>

<div
	role="none"
	use:draggable={{ container, dragData: { id }, attributes: { draggingClass } }}
	ondrag={() => onDragChange(true)}
	ondragend={() => onDragChange(false)}
	class="cursor-grab"
>
	{@render children()}
</div>
