<!--
	@component
	The case file of a reported chat, beside the chat itself: what was reported and by whom,
	everybody of the chat by name and role (with the reports there were before, the switch that
	takes them out of the chats between participants, a way to write to them and their card), and
	the note that settles all of the chat's reports at once.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { liveSnapshot } from '#lib/api/liveSnapshot';
	import { CHAT_REPORT_NOTE_MAX_LENGTH } from '#lib/helpers/chat';
	import { getLocale } from '#lib/paraglide/runtime';
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

	const dateTime = (date: Date | string) =>
		new Date(date).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="flex flex-col gap-3" data-testid="chat-case-file">
	<section class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-box border p-4">
		<h2 class="font-semibold">{m.chatCaseReports()}</h2>
		<ul class="divide-base-300 flex flex-col divide-y">
			{#each reports as report (report.id)}
				<li class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0" data-testid="chat-case-report">
					<p class="text-sm whitespace-pre-wrap">{report.reason}</p>
					<p class="text-base-content/70 text-xs">
						{m.chatReportedBy({ name: report.reporterName ?? '–' })} · {dateTime(report.createdAt)}
					</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="border-base-300 bg-base-100 flex flex-col gap-3 rounded-box border p-4">
		<h2 class="font-semibold">{m.chatCasePeople()}</h2>
		<ul class="divide-base-300 flex flex-col divide-y" data-testid="chat-case-people">
			{#each people as person (person.participantId)}
				<ReportCasePerson {conferenceId} {person} />
			{/each}
		</ul>
	</section>

	<section class="border-base-300 bg-base-100 flex flex-col gap-2.5 rounded-box border p-4">
		<label class="font-semibold" for={noteId}>{m.chatCaseNote()}</label>
		<textarea
			id={noteId}
			class="textarea w-full"
			rows="3"
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
		<p class="text-base-content/70 text-xs">{m.chatCaseSettleHint()}</p>
	</section>
</div>
