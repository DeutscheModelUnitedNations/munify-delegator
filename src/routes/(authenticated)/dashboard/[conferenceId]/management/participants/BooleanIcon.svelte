<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		value: boolean | null;
	}

	let { value }: Props = $props();
</script>

{#if value === true}
	<span class="flex items-center gap-1.5 text-success">
		<i class="fa-solid fa-circle-check"></i>
		<span class="text-xs">{m.yes()}</span>
	</span>
{:else if value === false}
	<span class="flex items-center gap-1.5 text-error">
		<i class="fa-solid fa-circle-xmark"></i>
		<span class="text-xs">{m.no()}</span>
	</span>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
