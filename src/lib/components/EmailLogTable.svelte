<script lang="ts">
	import type {
		EmailkindEnum,
		EmailstatusEnum,
		EmailtriggerEnum
	} from '#lib/api/rumbleClient/client';
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import { emailKindTexts, emailStatusLabel } from '#lib/helpers/emailKindTexts';

	/** Rows of the mail log: when, which mail, to whom, how it went, and who sent it by hand. */
	interface Props {
		entries: readonly {
			id: string;
			kind: EmailkindEnum;
			status: EmailstatusEnum;
			email?: string | null;
			error?: string | null;
			createdAt: Date;
			sentAt?: Date | null;
			/** Left out where the table is about one person anyway; none for a team invitation */
			user?: { givenName: string; familyName: string } | null;
			trigger?: EmailtriggerEnum;
			sentBy?: { givenName: string; familyName: string } | null;
		}[];
		empty: string;
	}

	let { entries, empty }: Props = $props();
	type Entry = Props['entries'][number];

	const nameOf = (person: { givenName: string; familyName: string }) =>
		formatNames({
			givenName: person.givenName,
			familyName: person.familyName,
			options: { givenNameUppercase: false, familyNameUppercase: false }
		});

	const when = (entry: Entry) =>
		(entry.sentAt ?? entry.createdAt).toLocaleString(getLocale(), {
			dateStyle: 'short',
			timeStyle: 'short'
		});

	/** Who sent a mail by hand; nothing for an automatic one. */
	function byHand(entry: Entry) {
		if (entry.trigger !== 'MANUAL') return undefined;
		return entry.sentBy ? m.emailLogByHandFrom({ name: nameOf(entry.sentBy) }) : m.emailLogByHand();
	}

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
						<td class="whitespace-nowrap">{when(entry)}</td>
						<td>
							{emailKindTexts(entry.kind).title}
							<span class="text-base-content/60 block text-xs">{byHand(entry)}</span>
						</td>
						<td>
							{entry.user ? nameOf(entry.user) : ''}
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
