<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The free-text search; the grid asks with it once typing pauses. */
	interface Props {
		value: string;
		busy: boolean;
		oninput: (value: string) => void;
	}

	let { value, busy, oninput }: Props = $props();
</script>

<label class="no-print input input-bordered flex grow basis-full items-center gap-2 sm:basis-auto">
	<input
		type="search"
		class="grow"
		{value}
		oninput={(event) => oninput(event.currentTarget.value)}
		placeholder={m.search()}
		aria-label={m.search()}
	/>
	{#if busy}
		<span class="loading loading-xs loading-spinner"></span>
	{:else if value}
		<button
			class="btn btn-square btn-ghost btn-sm"
			aria-label={m.a11yClearSearch()}
			onclick={() => oninput('')}
		>
			<i class="fa-sharp-duotone fa-solid fa-times"></i>
		</button>
	{:else}
		<i class="fa-sharp-duotone fa-solid fa-magnifying-glass"></i>
	{/if}
</label>
