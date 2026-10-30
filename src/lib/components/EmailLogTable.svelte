<script lang="ts">
	import type { EmailkindEnum, EmailstatusEnum } from '#lib/api/rumbleClient/client';
	import { getLocale } from '#lib/paraglide/runtime';
	import formatNames from '#lib/helpers/formatNames';
	import { emailKindTexts, emailStatusLabel } from '#lib/helpers/emailKindTexts';

	/** Rows of the automatic mails' log: when, which mail, to whom, and how it went. */
	interface Props {
		entries: readonly {
			id: string;
			kind: EmailkindEnum;
			status: EmailstatusEnum;
			email?: string | null;
			error?: string | null;
			createdAt: Date;
			sentAt?: Date | null;
			/** Left out where the table is about one person anyway */
			user?: { givenName: string; familyName: string };
		}[];
		empty: string;
	}

	let { entries, empty }: Props = $props();

	const badge = {
		SENT: 'badge-success',
		FAILED: 'badge-error',
		SKIPPED: 'badge-ghost',
		SENDING: 'badge-info'
	} as const;
</script>

{#if entries.length === 0}
	<p class="text-base-content/60 text-sm italic">{empty}</p>
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
							{#if entry.user}
								{formatNames(entry.user.givenName, entry.user.familyName, {
									givenNameUppercase: false,
									familyNameUppercase: false
								})}
							{/if}
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
