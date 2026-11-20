<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Up, down and remove for an item of a list in the sidebar builder. */
	interface Props {
		onMove: (by: number) => void;
		onRemove: () => void;
		removeLabel: string;
		size?: 'xs' | 'sm';
	}

	let { onMove, onRemove, removeLabel, size = 'xs' }: Props = $props();
	const button = $derived(size === 'xs' ? 'btn btn-xs join-item' : 'btn btn-sm join-item');
</script>

<div class="join">
	<button class={button} aria-label={m.guideMoveUp()} onclick={() => onMove(-1)}>
		<i class="ph-duotone ph-arrow-up" aria-hidden="true"></i>
	</button>
	<button class={button} aria-label={m.guideMoveDown()} onclick={() => onMove(1)}>
		<i class="ph-duotone ph-arrow-down" aria-hidden="true"></i>
	</button>
	<button class="{button} btn-error btn-outline" aria-label={removeLabel} onclick={onRemove}>
		<i class="ph-duotone ph-x" aria-hidden="true"></i>
	</button>
</div>
