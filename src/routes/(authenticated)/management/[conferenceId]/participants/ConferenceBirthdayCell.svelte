<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		hasBirthday: boolean;
	}

	let { hasBirthday }: Props = $props();
</script>

{#if hasBirthday}
	<span class="flex items-center gap-1.5 text-secondary">
		<i class="fa-solid fa-cake-candles"></i>
		<span class="text-xs">{m.yes()}</span>
	</span>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
