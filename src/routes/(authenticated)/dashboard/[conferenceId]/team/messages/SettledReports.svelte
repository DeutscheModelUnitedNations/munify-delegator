<!--
	@component
	The reports already settled, folded away: what was reported and by whom, for the record.
-->
<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		reports: readonly {
			id: string;
			reason: string;
			createdAt: Date | string;
			reporterName?: string | null;
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
				<li class="border-base-300 rounded-lg border p-3">
					<p class="whitespace-pre-wrap">{report.reason}</p>
					<p class="text-base-content/60 mt-1 text-xs">
						{m.chatReportedBy({ name: report.reporterName ?? '–' })} · {dateTime(report.createdAt)}
					</p>
				</li>
			{/each}
		</ul>
	</details>
{/if}
