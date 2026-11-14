<!--
	@component
	The open cases, the one waiting longest first: which chat was reported, since when, why, and
	how often. Picking one opens it beside the list.
-->
<script lang="ts">
	import type { ChatSummary } from '#lib/api/chats';
	import { chatTitle } from '#lib/components/chat/chatLabels';
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { waitingSince, type CaseReport, type ReportCase } from './reportCases';

	interface Props {
		cases: readonly ReportCase<CaseReport>[];
		chats: readonly ChatSummary[];
		selectedId: string | null;
		onSelect: (chatId: string) => void;
	}

	let { cases, chats, selectedId, onSelect }: Props = $props();

	const now = new Date();
	const chatOf = (chatId: string) => chats.find((chat) => chat.id === chatId);
</script>

<ul class="flex flex-col gap-2" data-testid="chat-reports">
	{#each cases as entry (entry.chatId)}
		{@const chat = chatOf(entry.chatId)}
		{@const selected = entry.chatId === selectedId}
		<li>
			<button
				type="button"
				class={[
					'bg-base-100 flex w-full flex-col gap-1.5 rounded-box border p-3.5 text-left transition-colors',
					selected ? 'border-primary ring-primary ring-1' : 'border-base-300 hover:bg-base-200'
				]}
				aria-current={selected ? 'true' : undefined}
				onclick={() => onSelect(entry.chatId)}
				data-testid="chat-report-open"
			>
				<span class="flex items-baseline justify-between gap-2">
					<span class="min-w-0 font-semibold">
						{chat ? chatTitle(chat) : m.chatReportedChat()}
					</span>
					<span class="text-base-content/70 shrink-0 text-xs">
						{waitingSince({ since: entry.since, now, locale: getLocale() })}
					</span>
				</span>
				<span class="text-base-content/70 line-clamp-2 text-sm">
					{entry.reports.at(-1)?.reason}
				</span>
				<span class="flex flex-wrap gap-1.5 empty:hidden">
					{#if entry.reports.length > 1}
						<span class="badge badge-error badge-soft badge-sm">
							{m.chatReportCount({ count: entry.reports.length })}
						</span>
					{/if}
					{#if chat?.kind === 'DELEGATION'}
						<span class="badge badge-info badge-soft badge-sm">
							{m.chatReportGroup({ count: chat.people.length })}
						</span>
					{/if}
				</span>
			</button>
		</li>
	{/each}
</ul>
