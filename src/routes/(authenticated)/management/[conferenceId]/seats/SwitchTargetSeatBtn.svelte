<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { seatSwitch } from './seatSwitchState.svelte';
	import type { SwitchEmptySeat } from '$lib/services/seatSwitch';

	interface Props {
		seat: Omit<SwitchEmptySeat, 'kind'>;
	}

	let { seat }: Props = $props();
</script>

<div class="tooltip" data-tip={seatSwitch.selected ? m.seatSwitchMoveHere() : m.seatSwitchHint()}>
	<button
		aria-label={`${m.seatSwitchMoveHere()}: ${seat.seatLabel}`}
		class="btn btn-sm btn-outline btn-primary w-10 border-dashed"
		disabled={!seatSwitch.selected}
		onclick={() => seatSwitch.pick({ kind: 'empty', ...seat })}
	>
		<i class="fas fa-arrow-down-to-bracket"></i>
	</button>
</div>
