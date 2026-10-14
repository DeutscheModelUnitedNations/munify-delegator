<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let { seats = $bindable() }: { seats: number } = $props();
</script>

<label class="floating-label">
	<span>{m.seatsPerDelegation()}</span>
	<input
		type="number"
		min="1"
		class="input w-full"
		placeholder={m.seatsPerDelegation()}
		bind:value={seats}
	/>
</label>
