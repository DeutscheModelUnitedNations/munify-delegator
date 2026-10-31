<script lang="ts">
	import Selection from '#lib/components/selection/index';
	import formatNames from '#lib/helpers/formatNames';
	import { m } from '#lib/paraglide/messages';
	import type { PayableUser, PaymentParticipantSelection } from './participantSelection.svelte';

	/** One person a payment can cover, as a checkbox. Labelled with their name unless `label` is given. */
	interface Props {
		selection: PaymentParticipantSelection;
		user: PayableUser;
		label?: string;
		/** Has paid already, so no reference may cover them: shown, but not selectable. */
		paid?: boolean;
	}

	let { selection, user, label, paid = false }: Props = $props();

	let name = $derived(
		label ??
			formatNames({
				givenName: user.givenName ?? undefined,
				familyName: user.familyName ?? undefined
			})
	);
</script>

<Selection.Item
	label={paid ? m.paymentPaidName({ name }) : name}
	selected={selection.isSelected(user.id)}
	changeSelection={(selected) => selection.setSelected({ user, isSelectedNow: selected })}
	disabled={paid || selection.isReferenceCreated}
/>
