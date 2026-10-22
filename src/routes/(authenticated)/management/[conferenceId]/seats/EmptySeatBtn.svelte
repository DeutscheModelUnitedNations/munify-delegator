<script lang="ts">
	import type { getUserInfo$result } from '$houdini';
	import type { SwitchEmptySeat } from '$lib/services/seatSwitch';
	import AddParticipantBtn from './AddParticipantBtn.svelte';
	import SwitchTargetSeatBtn from './SwitchTargetSeatBtn.svelte';
	import { seatSwitch } from './seatSwitchState.svelte';

	interface Props {
		seat: Omit<SwitchEmptySeat, 'kind'>;
		user: Partial<getUserInfo$result['previewUserByIdOrEmail']> | undefined;
		addParticipant: () => Promise<void>;
		warning?: boolean;
	}

	let { seat, user = $bindable(), addParticipant, warning = false }: Props = $props();
</script>

<!-- in switch mode a free seat is a target to move someone into, otherwise it adds a participant -->
{#if seatSwitch.enabled}
	<SwitchTargetSeatBtn {seat} />
{:else}
	<AddParticipantBtn bind:user targetRole={seat.seatLabel} {addParticipant} {warning} />
{/if}
