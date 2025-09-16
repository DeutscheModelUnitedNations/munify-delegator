<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import codenmz from '$lib/services/codenamize';
	import GenericWidget from './DelegationStats/GenericWidget.svelte';

	interface Props {
		delegationId: string;
	}

	let { delegationId }: Props = $props();

	const delegationStats = $derived([
		{
			icon: 'text',
			title: m.delegationName(),
			value: codenmz(delegationId),
			desc: m.delegationNameExplaination()
		}
	]);
</script>

<GenericWidget content={delegationStats} />
