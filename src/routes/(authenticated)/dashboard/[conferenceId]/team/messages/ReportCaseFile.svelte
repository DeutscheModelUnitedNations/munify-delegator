<!--
	@component
	The case file of a reported chat, beside the chat itself (which shows the reports where they
	were filed): everybody of the chat by name and role (with the reports there were before, the switch that
	takes them out of the chats between participants, a way to write to them and their card), and
	the note that settles all of the chat's reports at once.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { liveSnapshot } from '#lib/api/liveSnapshot';
	import { CHAT_REPORT_NOTE_MAX_LENGTH } from '#lib/helpers/chat';
	import { m } from '#lib/paraglide/messages';
	import ReportCasePerson from './ReportCasePerson.svelte';
	import type { CaseReport } from './reportCases';

	interface Props {
		conferenceId: string;
		chatId: string;
		/** The chat's open reports, the oldest first */
		reports: readonly CaseReport[];
		onSettled: () => void;
	}

	let { conferenceId, chatId, reports, onSettled }: Props = $props();
	const noteId = $props.id();

	const liveChat = $derived(
		await client.liveQuery.chats({
			__args: { where: { id: { eq: chatId } } },
			contacts: {
				participantId: true,
				roleKind: true,
				nationAlpha3Code: true,
				nationAlpha2Code: true,
				roleName: true,
				roleAbbreviation: true,
				roleIcon: true,
				committeeAbbreviation: true,
				ordinal: true,
				suspended: true
			},
			people: { participantId: true, userId: true, name: true, earlierReports: true }
		})
	);
	const snapshot = liveSnapshot<(typeof liveChat)[number]>();
	const chat = $derived(snapshot(liveChat).at(0));
	const people = $derived(
		(chat?.people ?? []).map((person) => ({
			...person,
			contact: chat?.contacts.find((contact) => contact.participantId === person.participantId),
			reported: reports.some((report) => report.reporterParticipantId === person.participantId)
		}))
	);

	let note = $state('');
	let settling = $state(false);

	async function settle() {
		settling = true;
		const promise = Promise.resolve(
			client.mutate.resolveChatReports({ __args: { chatId, note: note.trim() || null } })
		);
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: m.chatReportResolved(),
			error: m.chatSaveFailed()
		});
		try {
			await promise;
			onSettled();
		} finally {
			settling = false;
		}
	}
</script>

{#snippet heading(text: string)}
	<h2 class="text-base-content/60 px-1 text-xs font-semibold tracking-wide uppercase">{text}</h2>
{/snippet}

<!-- the note and the button that settles the case stay in reach while the file scrolls -->
<div class="flex h-full min-h-0 flex-col" data-testid="chat-case-file">
	<div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
		<section class="flex flex-col gap-2">
			{@render heading(m.chatCasePeople())}
			<ul
				class="bg-base-100 divide-base-content/10 flex flex-col divide-y rounded-box px-3"
				data-testid="chat-case-people"
			>
				{#each people as person (person.participantId)}
					<ReportCasePerson {conferenceId} {chatId} {person} />
				{/each}
			</ul>
		</section>
	</div>

	<section class="border-base-content/10 flex flex-col gap-2 border-t p-4">
		<label class="text-sm font-semibold" for={noteId}>{m.chatCaseNote()}</label>
		<textarea
			id={noteId}
			class="textarea bg-base-100 w-full"
			rows="2"
			maxlength={CHAT_REPORT_NOTE_MAX_LENGTH}
			placeholder={m.chatCaseNotePlaceholder()}
			bind:value={note}
			data-testid="chat-case-note"></textarea>
		<button
			type="button"
			class="btn btn-success"
			disabled={settling}
			onclick={settle}
			data-testid="chat-report-resolve"
		>
			<i aria-hidden="true" class="ph-duotone ph-check"></i>
			{m.chatCaseSettle({ count: reports.length })}
		</button>
		<p class="text-base-content/60 text-xs">{m.chatCaseSettleHint()}</p>
	</section>
</div>
