<script lang="ts">
	import Selection from '#lib/components/selection/index.js';
	import { sortByNames } from '#lib/helpers/formatNames.js';
	import SelectableParticipant from './SelectableParticipant.svelte';
	import type { PayableUser, PaymentParticipantSelection } from './participantSelection.svelte';

	/** A group of people a payment can cover, by name, each with a checkbox. */
	interface Props {
		title: string;
		selection: PaymentParticipantSelection;
		participants: { id: string; user: PayableUser }[];
		/** People who have paid: listed, but not selectable. */
		paidUserIds: ReadonlySet<string>;
	}

	let { title, selection, participants, paidUserIds }: Props = $props();
</script>

<Selection.Fieldset {title}>
	{#each participants.toSorted( (a, b) => sortByNames(a.user, b.user) ) as participant (participant.id)}
		<SelectableParticipant
			{selection}
			user={participant.user}
			paid={paidUserIds.has(participant.user.id)}
		/>
	{/each}
</Selection.Fieldset>
