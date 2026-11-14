<!--
	@component
	The reports participant care has to look at: what was reported, by whom and why, with the way
	to read the chat and to settle the report. Settling the last report of a chat makes it private
	again.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';

	interface Report {
		id: string;
		chatId: string;
		reason: string;
		createdAt: Date | string;
		reporterName?: string | null;
	}

	interface Props {
		reports: readonly Report[];
		/** What the reported chat is called, while it can still be read */
		titleOf: (chatId: string) => string | undefined;
		onRead: (chatId: string) => void;
	}

	let { reports, titleOf, onRead }: Props = $props();

	async function resolveReport(id: string) {
		const promise = client.mutate.resolveChatReport({ __args: { id }, status: true });
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: m.chatReportResolved(),
			error: m.chatSaveFailed()
		});
		await promise;
	}

	const dateTime = (date: Date | string) =>
		new Date(date).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

{#if reports.length === 0}
	<p class="text-base-content/60 flex items-center gap-2" data-testid="chat-no-reports">
		<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-xl"></i>
		{m.chatNoOpenReports()}
	</p>
{:else}
	<ul class="grid grid-cols-1 gap-3 xl:grid-cols-2" data-testid="chat-reports">
		{#each reports as report (report.id)}
			<li class="border-warning/40 bg-warning/5 flex flex-col gap-2 rounded-xl border p-4">
				<div class="flex flex-wrap items-baseline justify-between gap-x-4">
					<span class="font-semibold">{titleOf(report.chatId) ?? m.chatReportedChat()}</span>
					<span class="text-base-content/60 text-xs">{dateTime(report.createdAt)}</span>
				</div>
				<p class="text-sm whitespace-pre-wrap">{report.reason}</p>
				<p class="text-base-content/60 text-xs">
					{m.chatReportedBy({ name: report.reporterName ?? '–' })}
				</p>
				<div class="mt-1 flex flex-wrap gap-2">
					<button
						type="button"
						class="btn btn-sm"
						onclick={() => onRead(report.chatId)}
						data-testid="chat-report-open"
					>
						<i aria-hidden="true" class="ph-duotone ph-eye"></i>
						{m.chatReportRead()}
					</button>
					<button
						type="button"
						class="btn btn-sm btn-success"
						onclick={() => resolveReport(report.id)}
						data-testid="chat-report-resolve"
					>
						<i aria-hidden="true" class="ph-duotone ph-check"></i>
						{m.chatReportResolve()}
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}
