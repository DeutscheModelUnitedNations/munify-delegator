<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import formatNames from '#lib/helpers/formatNames.js';
	import { emailKindTexts, emailStatusLabel } from './emailKindTexts';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const entries = $derived(
		await client.liveQuery.emailLogs({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { createdAt: 'desc' },
				limit: 200
			},
			id: true,
			kind: true,
			status: true,
			email: true,
			error: true,
			createdAt: true,
			sentAt: true,
			user: { givenName: true, familyName: true }
		})
	);

	const badge = {
		SENT: 'badge-success',
		FAILED: 'badge-error',
		SKIPPED: 'badge-ghost',
		SENDING: 'badge-info'
	} as const;
</script>

<section class="flex flex-col gap-2">
	<h3 class="text-lg font-bold">{m.emailSettingsLog()}</h3>
	<p class="text-base-content/70 text-sm">{m.emailSettingsLogDescription()}</p>
	{#if entries.length === 0}
		<p class="text-base-content/60 text-sm italic">{m.emailSettingsLogEmpty()}</p>
	{:else}
		<div class="border-base-300 overflow-x-auto rounded-box border">
			<table class="table-sm table">
				<tbody>
					{#each entries as entry (entry.id)}
						<tr>
							<td class="whitespace-nowrap">
								{(entry.sentAt ?? entry.createdAt).toLocaleString(getLocale(), {
									dateStyle: 'short',
									timeStyle: 'short'
								})}
							</td>
							<td>{emailKindTexts(entry.kind).title}</td>
							<td>
								{formatNames(entry.user.givenName, entry.user.familyName, {
									givenNameUppercase: false,
									familyNameUppercase: false
								})}
								<span class="text-base-content/60 block text-xs">{entry.email}</span>
							</td>
							<td>
								<span class="badge badge-sm {badge[entry.status]}"
									>{emailStatusLabel[entry.status]()}</span
								>
								{#if entry.error}
									<span class="text-error block text-xs">{entry.error}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
