<script lang="ts">
	import type { MediaconsentstatusEnum } from '#lib/api/rumbleClient/client';
	import { photoStatusShown, type FormalityStatuses } from '../formalities';
	import type { StatusChange } from '../tabs/participantStatus';
	import StateMenu from '../ui/StateMenu.svelte';
	import { FORMALITY_META, mediaConsentOptions } from './formalityOptions';

	/** What the photo consent allows, beside its status. */
	interface Props {
		status: FormalityStatuses | undefined;
		change: (input: StatusChange) => Promise<void>;
	}

	let { status, change }: Props = $props();

	let pending = $state(false);

	async function select(mediaConsentStatus: MediaconsentstatusEnum) {
		pending = true;
		try {
			await change({ mediaConsentStatus });
		} finally {
			pending = false;
		}
	}
</script>

{#if status && photoStatusShown(status)}
	<StateMenu
		name={FORMALITY_META.mediaConsentStatus.title()}
		active={status.mediaConsentStatus}
		options={mediaConsentOptions()}
		disabled={pending}
		onSelect={select}
	/>
{/if}
