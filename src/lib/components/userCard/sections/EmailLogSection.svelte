<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import EmailLogTable from '#lib/components/EmailLogTable.svelte';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { canManageEmails } from '#lib/helpers/teamAccess';
	import OwedEmails from './OwedEmails.svelte';

	/**
	 * The mails the conference sent the person, or tried to: what answers "I never got the mail".
	 * Above it, for participant care, what the person is owed and can be sent by hand. Only
	 * participant care reads the log; for everyone else it stays empty.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		/** Changes with the person's statuses, which decide what they are owed. */
		statusRevision: string;
	}

	let { userId, conferenceId, statusRevision }: Props = $props();

	const mayManage = $derived(canManageEmails(await fetchTeamAccess(conferenceId)));

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
			sentAt: true,
			trigger: true,
			sentBy: { givenName: true, familyName: true }
		})
	);
	const logRevision = $derived(`${entries.length}:${entries[0]?.id}:${entries[0]?.status}`);
</script>

<div class="flex flex-col gap-6">
	{#if mayManage}
		<OwedEmails {userId} {conferenceId} revision={`${statusRevision}|${logRevision}`} />
	{/if}

	<section class="flex flex-col gap-2">
		<h3 class="text-lg font-bold">{m.userCardEmails()}</h3>
		<EmailLogTable {entries} empty={m.userCardNoEmails()} />
	</section>
</div>
