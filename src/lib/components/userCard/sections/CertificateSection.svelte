<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { downloadCertificateFor } from '#lib/api/downloadCertificate';
	import Row from '../ui/Row.svelte';
	import { fetchParticipantStatus } from '../tabs/participantStatus';

	/** The person's participation certificate as a list row, generated when it is asked for. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	// The API issues one only to who took part
	const statuses = $derived(await fetchParticipantStatus({ userId, conferenceId }));
	const didAttend = $derived(statuses.at(0)?.didAttend ?? false);
</script>

{#snippet needsParticipation()}
	<span class="text-base-content/60">{m.userCardCertificateNeedsParticipation()}</span>
{/snippet}

<Row
	icon="certificate"
	title={m.certificate()}
	children={didAttend ? undefined : needsParticipation}
>
	{#snippet actions()}
		<button
			class="btn btn-sm btn-ghost text-primary disabled:text-base-content/40"
			disabled={!didAttend}
			onclick={() => downloadCertificateFor({ conferenceId, userId })}
		>
			<i aria-hidden="true" class="ph-duotone ph-download-simple"></i>
			{m.download()}
		</button>
	{/snippet}
</Row>
