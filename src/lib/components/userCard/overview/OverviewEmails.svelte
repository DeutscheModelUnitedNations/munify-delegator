<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { emailKindTexts, emailStatusLabel } from '#lib/helpers/emailKindTexts';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';

	/** The last mails the conference sent the person, or tried to. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const entries = $derived(
		await client.liveQuery.emailLogs({
			__args: {
				where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } },
				orderBy: { createdAt: 'desc' },
				limit: 3
			},
			kind: true,
			status: true,
			createdAt: true,
			sentAt: true
		})
	);
</script>

{#if entries.length === 0}
	<p class="text-base-content/60 italic">{m.userCardNoEmails()}</p>
{:else}
	<ul class="divide-base-300 flex flex-col divide-y">
		{#each entries as entry (entry.id)}
			<li class="flex items-baseline gap-2 py-1">
				<span class="text-base-content/60 shrink-0 font-mono text-xs">
					{(entry.sentAt ?? entry.createdAt).toLocaleDateString(getLocale(), {
						day: '2-digit',
						month: '2-digit'
					})}
				</span>
				<span class="min-w-0 flex-1">{emailKindTexts(entry.kind).title}</span>
				{#if entry.status !== 'SENT'}
					<span class="text-xs {entry.status === 'FAILED' ? 'text-error' : 'text-base-content/60'}">
						{emailStatusLabel[entry.status]()}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
