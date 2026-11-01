<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import Modal from '#lib/components/Modal.svelte';
	import OwedEmailRow from './OwedEmailRow.svelte';
	import { ensureSent, owedEmailKey, owedEmailTitle, type OwedEmail } from './owedEmails';

	/**
	 * The mails the person is owed right now, switched on or not, each with a button to send it by
	 * hand: after a change while its kind is off, again when one went missing, or a reminder early.
	 * Participant care's, like the log below it.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		/** Changes whenever what the person is owed may have: asks again then. */
		revision: string;
	}

	let { userId, conferenceId, revision }: Props = $props();

	const emails = $derived(
		await client.query.personEmails({
			__args: { conferenceId, userId, revision },
			kind: true,
			subjectKey: true,
			detail: true,
			automatic: true,
			lastStatus: true,
			lastAt: true
		})
	);

	/** The mail waiting for the team to confirm sending it. */
	let confirming = $state<OwedEmail>();
	let sending = $state<string>();

	async function send(email: OwedEmail) {
		confirming = undefined;
		sending = owedEmailKey(email);
		const promise = client.mutate
			.sendPersonEmail({
				__args: { conferenceId, userId, kind: email.kind, subjectKey: email.subjectKey },
				sent: true,
				error: true
			})
			.then(ensureSent);
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.emailSendSuccess(),
			error: (error) => (error instanceof Error ? error.message : m.genericToastError())
		});
		await promise.catch(() => undefined);
		sending = undefined;
	}
</script>

<section class="flex flex-col gap-2">
	<h3 class="text-lg font-bold">{m.userCardOwedEmails()}</h3>
	<p class="text-base-content/70 text-sm">{m.userCardOwedEmailsDescription()}</p>
	{#if emails.length === 0}
		<p class="text-base-content/60 text-sm italic">{m.userCardNoOwedEmails()}</p>
	{:else}
		<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
			{#each emails as email (owedEmailKey(email))}
				<OwedEmailRow
					{email}
					sending={sending === owedEmailKey(email)}
					disabled={sending !== undefined}
					onsend={() => (confirming = email)}
				/>
			{/each}
		</div>
	{/if}
</section>

<Modal
	open={!!confirming}
	title={m.emailSendConfirmTitle()}
	onclose={() => (confirming = undefined)}
>
	<p>{confirming ? m.emailSendConfirmText({ title: owedEmailTitle(confirming) }) : ''}</p>
	{#snippet action()}
		<button class="btn" onclick={() => (confirming = undefined)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={() => confirming && send(confirming)}>
			<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
			{m.emailSendNow()}
		</button>
	{/snippet}
</Modal>
