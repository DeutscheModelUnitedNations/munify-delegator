<script lang="ts">
	import formatNames, { formatInitials } from '#lib/helpers/formatNames';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import type { SwitchMember } from '#lib/helpers/seatSwitch';
	import { getSeatSwitch } from './seatSwitchState.svelte';

	interface Props {
		given_name: string;
		family_name: string;
		userId: string;
		/** Makes the member selectable in switch mode */
		switchSeat?: Omit<SwitchMember, 'kind' | 'name'>;
	}

	let { given_name, family_name, userId, switchSeat }: Props = $props();

	const seatSwitch = getSeatSwitch();

	const name = $derived(formatNames(given_name, family_name));
	const switching = $derived(seatSwitch.enabled && !!switchSeat);
	const isSelected = $derived(switching && seatSwitch.selected?.memberId === switchSeat?.memberId);
	const tooltip = $derived(
		switching && seatSwitch.selected && !isSelected
			? m.seatSwitchSelectTarget({ name: seatSwitch.selected.name })
			: name
	);
	const variant = $derived(isSelected ? 'btn-primary' : switching ? 'btn-outline btn-primary' : '');
</script>

<div class="tooltip" data-tip={tooltip}>
	<button
		class="btn btn-sm w-10 font-mono {variant}"
		onclick={() => {
			if (switching && switchSeat) {
				seatSwitch.pick({ kind: 'member', name, ...switchSeat });
			} else {
				openUserCard(userId);
			}
		}}
	>
		{formatInitials(given_name, family_name)}
	</button>
</div>
