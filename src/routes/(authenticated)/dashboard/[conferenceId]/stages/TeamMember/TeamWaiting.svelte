<!--
	@component
	The team's overview of a conference: what waits for the caller in the
	parts of the team they may open (inboxes, reports, possible duplicates, school merges, the waiting
	list, mails due or failed, announcement drafts, papers to review, agenda items asking for review
	help), one tile each, linking to where it is done. Only what the caller may open is asked
	for. Live, apart from the mails, which the API works out on asking.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client, type EmailkindEnum } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { fetchChats } from '#lib/api/chats';
	import { fetchOpenEmails } from '#lib/api/openEmails';
	import { sideOf } from '#lib/components/chat/chatLabels';
	import DashboardLinkCard from '#lib/components/dashboard/DashboardLinkCard.svelte';
	import { EMAIL_GROUPS, isAlwaysSent } from '#lib/helpers/emailKinds';
	import { m } from '#lib/paraglide/messages';
	import { asCount } from '#lib/api/queryHelpers';
	import { fetchCanOpenPaperHub } from '../../paperhub/myPaperHubRoles';
	import { duplicatesOfConference } from '../../team/plausibility/possibleDuplicatesWhere';
	import { mayAskFor, waitingItems, type WaitingCounts } from './teamWaiting';

	let { conferenceId }: { conferenceId: string } = $props();

	/** Every kind the team sends, apart from those that go out where they happen */
	const SENT_KINDS: EmailkindEnum[] = EMAIL_GROUPS.flatMap((group) => group.kinds).filter(
		(kind) => !isAlwaysSent(kind)
	);

	const access = $derived({
		...(await fetchTeamAccess(conferenceId)),
		// A snapshot of a boolean, decided the same way as the team navigation's paper hub entry
		canSeePaperHub: await fetchCanOpenPaperHub(conferenceId)
	});

	const papersWith = (status: 'SUBMITTED' | 'REVISED') =>
		client.liveQuery.papersCount({
			__args: { where: { conference: { id: { eq: conferenceId } }, status } }
		});

	const [
		chats,
		duplicates,
		suggestions,
		drafts,
		emails,
		submitted,
		revised,
		helpNeeded,
		waiting,
		failed
	] = $derived(
		await Promise.all([
			fetchChats({ conferenceId }),
			mayAskFor({ id: 'openDuplicates', access })
				? client.liveQuery.possibleDuplicates({
						__args: { where: { ...duplicatesOfConference(conferenceId), status: 'OPEN' } },
						id: true
					})
				: [],
			mayAskFor({ id: 'schoolSuggestions', access })
				? client.liveQuery.schoolSuggestions({
						__args: { where: { conferenceId: { eq: conferenceId }, dismissed: { eq: false } } },
						id: true
					})
				: [],
			mayAskFor({ id: 'draftAnnouncements', access })
				? client.liveQuery.announcements({
						__args: { where: { conferenceId: { eq: conferenceId }, status: 'DRAFT' } },
						id: true
					})
				: [],
			// empty for whoever may not send the conference's mails
			fetchOpenEmails({ conferenceId, kinds: SENT_KINDS }),
			// A first review and one after a revision; zero for whoever does not review
			mayAskFor({ id: 'papersAwaitingReview', access }) ? papersWith('SUBMITTED') : 0,
			mayAskFor({ id: 'papersAwaitingReview', access }) ? papersWith('REVISED') : 0,
			mayAskFor({ id: 'reviewHelpNeeded', access })
				? client.liveQuery.committeeAgendaItems({
						__args: {
							where: {
								committee: { conferenceId: { eq: conferenceId } },
								reviewHelpStatus: 'HELP_NEEDED'
							}
						},
						id: true
					})
				: [],
			mayAskFor({ id: 'waitingList', access })
				? client.liveQuery.waitingListEntries({
						__args: {
							where: {
								conferenceId: { eq: conferenceId },
								assignedAt: { isNull: true },
								hidden: { eq: false }
							}
						},
						id: true
					})
				: [],
			mayAskFor({ id: 'failedEmails', access })
				? client.liveQuery.emailLogs({
						__args: { where: { conferenceId: { eq: conferenceId }, status: 'FAILED' } },
						id: true
					})
				: []
		])
	);

	const counts = $derived<WaitingCounts>({
		unreadMessages: chats
			.filter((chat) => sideOf(chat) === 'TEAM')
			.reduce((total, chat) => total + chat.unreadCount, 0),
		reportedChats: chats.filter((chat) => sideOf(chat) === 'REVIEW').length,
		openDuplicates: duplicates.length,
		schoolSuggestions: suggestions.length,
		// the job sends the kinds switched to automatic on its own
		openEmails: emails
			.filter((open) => !open.automatic)
			.reduce((total, open) => total + open.open, 0),
		draftAnnouncements: drafts.length,
		papersAwaitingReview: asCount(submitted) + asCount(revised),
		reviewHelpNeeded: helpNeeded.length,
		waitingList: waiting.length,
		failedEmails: failed.length
	});
	const items = $derived(waitingItems({ counts, access }));
</script>

{#if items.length === 0}
	<p
		class="text-base-content/70 col-span-full flex items-center gap-2"
		data-testid="team-waiting-nothing"
	>
		<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-xl"></i>
		{m.teamWaitingNothing()}
	</p>
{:else}
	<!-- the tiles sit in the grid of the link cards that follow -->
	<div class="contents" data-testid="team-waiting">
		{#each items as item (item.id)}
			<DashboardLinkCard
				href={resolve(
					`dashboard/${conferenceId}/${item.route.path}${item.query ? `?${item.query}` : ''}`
				)}
				icon={item.route.icon}
				title={item.route.title()}
				description={item.label}
				badge={item.count}
				badgeType={item.id === 'failedEmails' ? 'error' : 'warning'}
			/>
		{/each}
	</div>
{/if}
