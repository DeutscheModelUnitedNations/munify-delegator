<!--
	@component
	The reports already settled, folded away: what was reported and by whom, the messages participant
	care hid under it (with their text, who hid them and why), what it noted and who settled it, for
	the record.
-->
<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import HiddenMessagesRecord from './HiddenMessagesRecord.svelte';

	interface Props {
		reports: readonly {
			id: string;
			reason: string;
			createdAt: Date | string;
			reporterName?: string | null;
			resolvedAt?: Date | string | null;
			resolutionNote?: string | null;
			resolvedByName?: string | null;
			hiddenMessages?: readonly {
				id: string;
				body: string;
				createdAt: Date | string;
				authorName?: string | null;
				hiddenAt: Date | string;
				hiddenReason: string;
				hiddenByName?: string | null;
			}[];
		}[];
	}

	let { reports }: Props = $props();

	const dateTime = (date: Date | string) =>
		new Date(date).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

{#if reports.length > 0}
	<details class="text-sm">
		<summary class="text-base-content/70 cursor-pointer">
			{m.chatSettledReports({ count: reports.length })}
		</summary>
		<ul class="mt-2 flex flex-col gap-2">
			{#each reports as report (report.id)}
				<li class="bg-base-200 rounded-box p-3">
					<p class="whitespace-pre-wrap">{report.reason}</p>
					<p class="text-base-content/60 mt-1 text-xs">
						{m.chatReportedBy({ name: report.reporterName ?? '–' })} · {dateTime(report.createdAt)}
					</p>
					{#if report.hiddenMessages?.length}
						<HiddenMessagesRecord messages={report.hiddenMessages} />
					{/if}
					{#if report.resolutionNote}
						<p class="bg-base-100 mt-2 rounded-field p-2 whitespace-pre-wrap">
							<span class="font-medium">{m.chatCaseNote()}:</span>
							{report.resolutionNote}
						</p>
					{/if}
					{#if report.resolvedAt}
						<p class="text-base-content/60 mt-1 text-xs">
							{m.chatSettledBy({
								name: report.resolvedByName ?? '–',
								time: dateTime(report.resolvedAt)
							})}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	</details>
{/if}
