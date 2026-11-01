<script lang="ts">
	import type { SwitchEmptySeat } from '#lib/helpers/seatSwitch';
	import type { UserPreview } from './userPreview';
	import AddParticipantBtn from './AddParticipantBtn.svelte';
	import SwitchTargetSeatBtn from './SwitchTargetSeatBtn.svelte';
	import { getSeatSwitch } from './seatSwitchState.svelte';

	interface Props {
		seat: Omit<SwitchEmptySeat, 'kind'>;
		user: Partial<UserPreview> | undefined;
		addParticipant: () => Promise<void>;
		warning?: boolean;
	}

	let { seat, user = $bindable(), addParticipant, warning = false }: Props = $props();

	const seatSwitch = getSeatSwitch();
</script>

<!-- in switch mode a free seat is a target to move someone into, otherwise it adds a participant -->
{#if seatSwitch.enabled}
	<SwitchTargetSeatBtn {seat} />
{:else}
	<AddParticipantBtn bind:user targetRole={seat.seatLabel} {addParticipant} {warning} />
{/if}
