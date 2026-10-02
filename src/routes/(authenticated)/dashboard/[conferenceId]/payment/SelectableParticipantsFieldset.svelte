<script lang="ts">
	import Selection from '$lib/components/selection';
	import { sortByNames } from '$lib/helpers/formatNames';
	import SelectableParticipant from './SelectableParticipant.svelte';
	import type { PayableUser, PaymentParticipantSelection } from './participantSelection.svelte';

	/** A group of people a payment can cover, by name, each with a checkbox. */
	interface Props {
		title: string;
		selection: PaymentParticipantSelection;
		participants: { id: string; user: PayableUser }[];
	}

	let { title, selection, participants }: Props = $props();
</script>

<Selection.Fieldset {title}>
	{#each participants.toSorted( (a, b) => sortByNames(a.user, b.user) ) as participant (participant.id)}
		<SelectableParticipant {selection} user={participant.user} />
	{/each}
</Selection.Fieldset>
