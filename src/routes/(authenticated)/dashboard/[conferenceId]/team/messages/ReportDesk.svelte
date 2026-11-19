<!--
	@component
	Where participant care works through the reports: the open cases on the left, the reported
	chat in the middle (read only, each report where it was filed), its case file on the right.
	On a narrow screen the list and an open case take turns.
-->
<script lang="ts">
	import type { ChatSummary } from '#lib/api/chats';
	import ChatThreadBoundary from '#lib/components/chat/ChatThreadBoundary.svelte';
	import LoadBoundary from '#lib/components/LoadBoundary.svelte';
	import { m } from '#lib/paraglide/messages';
	import ReportCaseFile from './ReportCaseFile.svelte';
	import ReportQueue from './ReportQueue.svelte';
	import { reportCases, type CaseReport } from './reportCases';

	interface Props {
		conferenceId: string;
		/** The open reports */
		reports: readonly CaseReport[];
		/** The chats participant care reads because of them */
		chats: readonly ChatSummary[];
		selectedId: string | null;
		onSelect: (chatId: string | null) => void;
	}

	let { conferenceId, reports, chats, selectedId, onSelect }: Props = $props();

	const cases = $derived(reportCases(reports));
	const open = $derived(cases.find((entry) => entry.chatId === selectedId));
	// handed on as values of their own: a child reading `open.chatId` while the case closes
	// (settled, or another one picked) would read through a case that is gone
	const openChatId = $derived(open?.chatId ?? null);
	const openReports = $derived(open?.reports ?? []);
</script>

{#if cases.length === 0}
	<p class="text-base-content/70 flex items-center gap-2" data-testid="chat-no-reports">
		<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-xl"></i>
		{m.chatNoOpenReports()}
	</p>
{:else}
	<!-- one surface like the messenger: tinted columns beside the plain chat, no frame lines -->
	<div
		class="report-desk bg-base-100 ring-base-content/10 grid overflow-hidden rounded-box ring-1"
		data-testid="chat-report-desk"
	>
		<nav
			class={['bg-base-200 flex min-h-0 flex-col', openChatId && 'max-lg:hidden']}
			aria-label={m.chatReports()}
		>
			<h2 class="flex items-center gap-2 px-4 pt-3 pb-1 font-semibold">
				{m.chatReports()}
				<span class="badge badge-error badge-sm">{cases.length}</span>
			</h2>
			<div class="min-h-0 flex-1 overflow-y-auto p-2">
				<ReportQueue {cases} {chats} {selectedId} {onSelect} />
			</div>
		</nav>

		{#if openChatId}
			{#key openChatId}
				<div class="report-thread min-h-0 min-w-0">
					<ChatThreadBoundary
						chatId={openChatId}
						onBack={() => onSelect(null)}
						reports={openReports}
					/>
				</div>
				<aside
					class="border-base-content/10 bg-base-200 min-h-0 max-lg:border-t"
					aria-label={m.chatCaseFile()}
				>
					<LoadBoundary>
						<ReportCaseFile
							{conferenceId}
							chatId={openChatId}
							reports={openReports}
							onSettled={() => onSelect(null)}
						/>
					</LoadBoundary>
				</aside>
			{/key}
		{:else}
			<div
				class="text-base-content/60 flex flex-col items-center justify-center gap-3 p-8 text-center max-lg:hidden lg:col-span-2"
			>
				<i aria-hidden="true" class="ph-duotone ph-flag text-primary text-5xl"></i>
				<p class="max-w-xs">{m.chatCaseSelectPrompt()}</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* The chat needs a height of its own to scroll in; on a wide screen the three columns share
	   the window below the page's header. */
	.report-thread {
		height: max(24rem, calc(100dvh - var(--header-height, 4rem) - 10rem));
	}

	@media (width >= 64rem) {
		.report-desk {
			grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr) minmax(18rem, 22rem);
			height: max(30rem, calc(100dvh - var(--header-height, 4rem) - 12rem));
		}

		.report-thread {
			height: auto;
		}
	}
</style>
