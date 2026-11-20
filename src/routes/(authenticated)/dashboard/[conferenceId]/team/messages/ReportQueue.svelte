<!--
	@component
	The open cases, the one waiting longest first: which chat was reported, since when, why, and
	how often. Picking one opens it beside the list.
-->
<script lang="ts">
	import type { ChatSummary } from '#lib/api/chats';
	import ChatAvatar from '#lib/components/chat/ChatAvatar.svelte';
	import { chatAvatar, chatTitle } from '#lib/components/chat/chatLabels';
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

<ul class="flex flex-col gap-0.5" data-testid="chat-reports">
	{#each cases as entry (entry.chatId)}
		{@const chat = chatOf(entry.chatId)}
		{@const selected = entry.chatId === selectedId}
		<li>
			<button
				type="button"
				class={[
					'flex w-full items-start gap-3 rounded-box px-3 py-2.5 text-left transition-colors',
					selected ? 'bg-primary/15' : 'hover:bg-base-content/5'
				]}
				aria-current={selected ? 'true' : undefined}
				onclick={() => onSelect(entry.chatId)}
				data-testid="chat-report-open"
			>
				<ChatAvatar avatar={chat ? chatAvatar(chat) : { icon: 'flag' }} />
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span class="flex items-baseline gap-2">
						<span class="min-w-0 flex-1 truncate font-semibold">
							{chat ? chatTitle(chat) : m.chatReportedChat()}
						</span>
						<span class="text-base-content/60 shrink-0 text-xs">
							{waitingSince({ since: entry.since, now, locale: getLocale() })}
						</span>
					</span>
					<span class="text-base-content/70 line-clamp-2 text-sm">
						{entry.reports.at(-1)?.reason}
					</span>
					<span class="mt-1 flex flex-wrap gap-1.5 empty:hidden">
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
				</span>
			</button>
		</li>
	{/each}
</ul>
