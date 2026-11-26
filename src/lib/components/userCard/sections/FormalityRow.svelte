<script lang="ts">
	import type { FormalityKey, FormalityStatuses } from '../formalities';
	import type { StatusChange } from '../tabs/participantStatus';
	import { administrativeOptions, FORMALITY_META } from './formalityOptions';
	import PhotoStatus from './PhotoStatus.svelte';
	import StatusRow from './StatusRow.svelte';

	/** One formality of the person, changed where it is shown; the photo consent with what it allows. */
	interface Props {
		formality: Exclude<FormalityKey, 'mediaConsentStatus'>;
		status: FormalityStatuses | undefined;
		change: (input: StatusChange) => Promise<void>;
	}

	let { formality, status, change }: Props = $props();

	const meta = $derived(FORMALITY_META[formality]);
</script>

{#snippet photos()}
	<PhotoStatus {status} {change} />
{/snippet}

<StatusRow
	title={meta.title()}
	icon={meta.icon}
	active={status?.[formality] ?? 'PENDING'}
	options={administrativeOptions()}
	change={(value) => change({ [formality]: value })}
	extra={formality === 'mediaConsent' ? photos : undefined}
/>
