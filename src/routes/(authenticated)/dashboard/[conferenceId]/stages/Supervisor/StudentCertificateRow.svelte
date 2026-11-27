<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { downloadCertificateFor } from '#lib/api/downloadCertificate';
	import formatNames from '#lib/helpers/formatNames';
	import type { StudentCertificateRow } from './studentCertificates';

	/** One student in their supervisor's certificate list: a download once they attended. */
	interface Props {
		conferenceId: string;
		row: StudentCertificateRow;
	}

	let { conferenceId, row }: Props = $props();

	const name = $derived(
		formatNames({ givenName: row.givenName ?? undefined, familyName: row.familyName ?? undefined })
	);

	let downloading = $state(false);

	async function download() {
		downloading = true;
		await downloadCertificateFor({ conferenceId, userId: row.userId });
		downloading = false;
	}
</script>

<li class="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
	<span>{name}</span>
	{#if row.didAttend}
		<button
			class="btn btn-sm btn-ghost text-primary"
			aria-label={m.studentCertificateDownloadFor({ name })}
			disabled={downloading}
			onclick={download}
		>
			<i
				aria-hidden="true"
				class={downloading ? 'loading loading-spinner loading-xs' : 'ph-duotone ph-download-simple'}
			></i>
			{m.download()}
		</button>
	{:else}
		<span class="text-base-content/60 text-sm">{m.userCardCertificateNeedsParticipation()}</span>
	{/if}
</li>
