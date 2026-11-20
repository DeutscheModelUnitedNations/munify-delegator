<!--
	@component
	The messages of a thread, by day: the caller's side on the right, the other on the left, what
	one author writes in a row in one bubble, with the author's name where a side has more than one
	voice (`threadMessages.ts`), a line above the first message the reader had not read yet and,
	for participant care, each report where in the conversation it was filed. Participant care
	reviewing a chat between participants may hide what participants wrote (`HideMessagesModal`).
-->
<script lang="ts">
	import type { ChatSide } from '#lib/helpers/chat';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import ChatBubble from './ChatBubble.svelte';
	import HideMessagesModal from './HideMessagesModal.svelte';
	import type { HideTarget } from './hiddenMessages';
	import { dayLabel, groupByDay } from './chatTime';
	import {
		bubblesOf,
		placeReports,
		runsOf,
		type ThreadChat,
		type ThreadReport,
		type ThreadMessage
	} from './threadMessages';

	type Message = ThreadMessage & {
		body: string | null;
		createdAt: Date | string;
		paperId?: string | null;
		hiddenAt?: Date | string | null;
		hiddenByName?: string | null;
		hiddenReason?: string | null;
	};

	interface Props {
		messages: readonly Message[];
		chat: ThreadChat;
		side: ChatSide;
		conferenceId: string;
		/** The first message the reader had not read when they opened the chat: a line marks it */
		unreadFromId?: string;
		/** A reported chat's open reports, for participant care: each shows where it was filed */
		reports?: readonly ThreadReport[];
		/** Participant care reviewing the chat may hide what participants wrote */
		canHide?: boolean;
	}

	let {
		messages,
		chat,
		side,
		conferenceId,
		unreadFromId,
		reports = [],
		canHide = false
	}: Props = $props();

	let hideOpen = $state(false);
	let hideTarget = $state<HideTarget>({ kind: 'message', messageId: '' });
	/** What hides a message of a run, where the reader may: what a participant wrote. */
	function hideOf(run: { messages: readonly Message[] }) {
		if (!canHide || run.messages.some((message) => message.fromTeam)) return undefined;
		return (messageId: string) => {
			hideTarget = { kind: 'message', messageId };
			hideOpen = true;
		};
	}

	const placed = $derived(placeReports({ messages, reports }));
	const now = new Date();
	const days = $derived(
		groupByDay(messages).map((day) => ({
			day: day.day,
			runs: runsOf({
				bubbles: bubblesOf({ messages: day.messages, side, chat }),
				breaksBefore: [unreadFromId, ...placed.above.keys()]
			})
		}))
	);

	const dateTime = (date: Date | string) =>
		new Date(date).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

{#snippet reportNotes(filed: readonly ThreadReport[])}
	{#each filed as report (report.id)}
		<div class="my-3 flex items-center gap-3" role="note" data-testid="chat-case-report">
			<span class="bg-error/40 h-px flex-1"></span>
			<div class="bg-error/10 border-error/40 max-w-md rounded-box border px-4 py-2.5 text-sm">
				<p class="text-error flex items-center gap-1.5 text-xs font-semibold">
					<i aria-hidden="true" class="ph-duotone ph-flag"></i>
					{m.chatReportedBy({ name: report.reporterName ?? '–' })} · {dateTime(report.createdAt)}
				</p>
				<p class="mt-1 whitespace-pre-wrap">{report.reason}</p>
			</div>
			<span class="bg-error/40 h-px flex-1"></span>
		</div>
	{/each}
{/snippet}

{#each days as day (day.day.getTime())}
	{@const firstKey = day.runs[0]?.key}
	{#if firstKey}{@render reportNotes(placed.above.get(firstKey)?.beforeDay ?? [])}{/if}
	<div class="text-base-content/60 my-3 flex items-center gap-3 text-xs" role="separator">
		<span class="bg-base-content/10 h-px flex-1"></span>
		{dayLabel({ date: day.day, now, locale: getLocale() })}
		<span class="bg-base-content/10 h-px flex-1"></span>
	</div>
	{#each day.runs as run (run.key)}
		{#if run.key === unreadFromId}
			<div
				class="text-primary my-3 flex items-center gap-3 text-xs font-semibold"
				role="separator"
				data-unread-divider
				data-testid="chat-unread-divider"
			>
				<span class="bg-primary/50 h-px flex-1"></span>
				{m.chatUnreadDivider()}
				<span class="bg-primary/50 h-px flex-1"></span>
			</div>
		{/if}
		{@render reportNotes(placed.above.get(run.key)?.inDay ?? [])}
		<ChatBubble
			messages={run.messages}
			own={run.own}
			author={run.author}
			continues={run.continues}
			{conferenceId}
			onHide={hideOf(run)}
		/>
	{/each}
{/each}
{@render reportNotes(placed.after)}

<HideMessagesModal bind:open={hideOpen} target={hideTarget} />
