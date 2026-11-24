<script lang="ts">
	import type { FormalityKey, FormalityStatuses } from '../formalities';
	import type { StatusChange } from '../tabs/participantStatus';
	import { administrativeOptions, FORMALITY_META, mediaConsentOptions } from './formalityOptions';
	import StatusRow from './StatusRow.svelte';

	/** One formality of the person with the buttons to change it, wherever the card shows it. */
	interface Props {
		formality: FormalityKey;
		status: FormalityStatuses | undefined;
		change: (input: StatusChange) => Promise<void>;
	}

	let { formality, status, change }: Props = $props();

	const meta = $derived(FORMALITY_META[formality]);
</script>

{#if formality === 'mediaConsentStatus'}
	<StatusRow
		title={meta.title()}
		icon={meta.icon}
		active={status?.mediaConsentStatus ?? 'NOT_SET'}
		options={mediaConsentOptions()}
		change={(mediaConsentStatus) => change({ mediaConsentStatus })}
	/>
{:else}
	{@const key = formality}
	<StatusRow
		title={meta.title()}
		icon={meta.icon}
		active={status?.[key] ?? 'PENDING'}
		options={administrativeOptions()}
		change={(value) => change({ [key]: value })}
	/>
{/if}
