<!--
	@component
	Where participant care works through the reports: the open cases on the left, the reported
	chat in the middle (read only, with a line where it was reported), its case file on the right.
	On a narrow screen the list and an open case take turns.
-->
<script lang="ts">
	import type { ChatSummary } from '#lib/api/chats';
	import ChatThreadBoundary from '#lib/components/chat/ChatThreadBoundary.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
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
	const openSince = $derived(open?.since ?? null);
	const openReports = $derived(open?.reports ?? []);
</script>

{#if cases.length === 0}
	<p class="text-base-content/70 flex items-center gap-2" data-testid="chat-no-reports">
		<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-xl"></i>
		{m.chatNoOpenReports()}
	</p>
{:else}
	<div class="report-desk grid gap-4" data-testid="chat-report-desk">
		<nav
			class={['min-h-0 lg:overflow-y-auto', openChatId && 'max-lg:hidden']}
			aria-label={m.chatReports()}
		>
			<ReportQueue {cases} {chats} {selectedId} {onSelect} />
		</nav>

		{#if openChatId}
			{#key openChatId}
				<div
					class="report-thread border-base-300 bg-base-100 min-h-0 min-w-0 overflow-hidden rounded-box border shadow-sm"
				>
					<ChatThreadBoundary
						chatId={openChatId}
						onBack={() => onSelect(null)}
						reportedAt={openSince}
					/>
				</div>
				<aside class="min-h-0 lg:overflow-y-auto" aria-label={m.chatCaseFile()}>
					<svelte:boundary>
						<ReportCaseFile
							{conferenceId}
							chatId={openChatId}
							reports={openReports}
							onSettled={() => onSelect(null)}
						/>
						{#snippet pending()}
							<div class="flex justify-center p-8">
								<span class="loading loading-spinner" aria-label={m.genericToastLoading()}></span>
							</div>
						{/snippet}
						{#snippet failed(_error, reset)}
							<LoadError onretry={reset} />
						{/snippet}
					</svelte:boundary>
				</aside>
			{/key}
		{:else}
			<div
				class="border-base-300 text-base-content/70 flex flex-col items-center justify-center gap-3 rounded-box border border-dashed p-8 text-center max-lg:hidden lg:col-span-2"
			>
				<i aria-hidden="true" class="ph-duotone ph-flag text-5xl"></i>
				<p class="max-w-xs">{m.chatCaseSelectPrompt()}</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* The chat needs a height of its own to scroll in; on a wide screen the three columns share
	   the window below the page's header. */
	.report-thread {
		height: max(24rem, calc(100dvh - var(--header-height, 4rem) - 12rem));
	}

	@media (width >= 64rem) {
		.report-desk {
			grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr) minmax(17rem, 21rem);
			height: max(30rem, calc(100dvh - var(--header-height, 4rem) - 18rem));
		}

		.report-thread {
			height: auto;
		}
	}
</style>
