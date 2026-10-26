<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import EmailLogTable from '#lib/components/EmailLogTable.svelte';

	/**
	 * The automatic mails the conference sent the person, or tried to: what answers "I never got
	 * the mail". Only participant care reads the log; for everyone else it stays empty.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const entries = $derived(
		await client.liveQuery.emailLogs({
			__args: {
				where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } },
				orderBy: { createdAt: 'desc' }
			},
			id: true,
			kind: true,
			status: true,
			email: true,
			error: true,
			createdAt: true,
			sentAt: true
		})
	);
</script>

<section class="flex flex-col gap-2">
	<h3 class="text-lg font-bold">{m.userCardEmails()}</h3>
	<EmailLogTable {entries} empty={m.userCardNoEmails()} />
</section>
