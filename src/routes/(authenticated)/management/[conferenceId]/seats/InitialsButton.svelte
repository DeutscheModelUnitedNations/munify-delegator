<script lang="ts">
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';
	import { m } from '$lib/paraglide/messages';
	import { seatSwitch } from './seatSwitchState.svelte';

	interface Props {
		given_name: string;
		family_name: string;
		userId: string;
		conferenceId: string;
		/** Makes the member selectable in switch mode */
		switchSeat?: { memberId: string; delegationId: string; seatLabel: string };
	}

	let { given_name, family_name, userId, conferenceId, switchSeat }: Props = $props();

	const name = $derived(formatNames(given_name, family_name));
	const switching = $derived(seatSwitch.enabled && !!switchSeat);
	const isSelected = $derived(switching && seatSwitch.selected?.memberId === switchSeat?.memberId);
	const tooltip = $derived(
		switching && seatSwitch.selected && !isSelected
			? m.seatSwitchSelectTarget({ name: seatSwitch.selected.name })
			: name
	);
</script>

<div class="tooltip" data-tip={tooltip}>
	<button
		class="btn btn-sm w-10 font-mono {isSelected
			? 'btn-primary'
			: switching
				? 'btn-outline btn-primary'
				: ''}"
		onclick={() => {
			if (switching && switchSeat) {
				seatSwitch.pick({ kind: 'member', name, ...switchSeat });
			} else {
				openUserCard(userId, conferenceId);
			}
		}}
	>
		{formatInitials(given_name, family_name)}
	</button>
</div>
