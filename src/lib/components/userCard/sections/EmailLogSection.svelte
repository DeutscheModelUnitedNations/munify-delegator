<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import EmailLogTable from '#lib/components/EmailLogTable.svelte';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { canManageEmails } from '#lib/helpers/teamAccess';
	import { fetchParticipantStatus } from '../tabs/participantStatus';
	import OwedEmails from './OwedEmails.svelte';

	/**
	 * In the grid of the history tab, the mails the conference sent the person, or tried to: what answers "I never got the mail".
	 * Across it above, for participant care, what the person is owed and can be sent by hand. Only
	 * participant care reads the log; for everyone else it stays empty.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const statuses = $derived(await fetchParticipantStatus({ userId, conferenceId }));
	const status = $derived(statuses.at(0));
	/** The person's statuses, which decide what mails they are owed, as one value. */
	const statusRevision = $derived(
		[
			status?.paymentStatus,
			status?.termsAndConditions,
			status?.guardianConsent,
			status?.mediaConsent,
			status?.didAttend
		].join()
	);

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

{#if mayManage}
	<div class="col-span-full min-w-0">
		<OwedEmails {userId} {conferenceId} revision={`${statusRevision}|${logRevision}`} />
	</div>
{/if}

<section class="flex min-w-0 flex-col gap-2">
	<h3 class="text-lg font-bold">{m.userCardEmails()}</h3>
	<EmailLogTable {entries} empty={m.userCardNoEmails()} />
</section>
