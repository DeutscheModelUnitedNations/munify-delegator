<script lang="ts">
	import Selection from '$lib/components/selection';
	import formatNames from '$lib/helpers/formatNames';
	import type { PayableUser, PaymentParticipantSelection } from './participantSelection.svelte';

	/** One person a payment can cover, as a checkbox. Labelled with their name unless `label` is given. */
	interface Props {
		selection: PaymentParticipantSelection;
		user: PayableUser;
		label?: string;
	}

	let { selection, user, label }: Props = $props();
</script>

<Selection.Item
	label={label ?? formatNames(user.givenName ?? undefined, user.familyName ?? undefined)}
	selected={selection.isSelected(user.id)}
	changeSelection={(selected) => selection.setSelected(user, selected)}
	disabled={selection.isReferenceCreated}
/>
