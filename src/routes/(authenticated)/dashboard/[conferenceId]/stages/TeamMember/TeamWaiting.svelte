<!--
	@component
	The team's overview of a conference: the caller's team roles and what waits for them in the
	parts of the team they may open (inboxes, reports, possible duplicates, school merges, mails due,
	announcement drafts, papers to review), each linking to where it is done. Only what the caller may open is asked
	for. Live, apart from the mails, which the API works out on asking.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client, type EmailkindEnum } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { fetchChats } from '#lib/api/chats';
	import { fetchOpenEmails } from '#lib/api/openEmails';
	import { sideOf } from '#lib/components/chat/chatLabels';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { EMAIL_GROUPS, isAlwaysSent } from '#lib/helpers/emailKinds';
	import { translateTeamRole } from '#lib/utils/enumTranslations';
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
	const roleLabels = $derived(access.roles.map((role) => translateTeamRole(role)));

	const papersWith = (status: 'SUBMITTED' | 'REVISED') =>
		client.liveQuery.papersCount({
			__args: { where: { conference: { id: { eq: conferenceId } }, status } }
		});

	const [chats, duplicates, suggestions, drafts, emails, submitted, revised] = $derived(
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
			mayAskFor({ id: 'papersAwaitingReview', access }) ? papersWith('REVISED') : 0
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
		papersAwaitingReview: asCount(submitted) + asCount(revised)
	});
	const items = $derived(waitingItems({ counts, access }));
</script>

<DashboardSection
	icon="tray"
	title={m.teamWaitingTitle()}
	description={m.teamWaitingDescription()}
	tourAnchor="dashboard.team-waiting"
>
	{#if roleLabels.length > 0}
		<ul class="mb-4 flex flex-wrap gap-1.5" aria-label={m.teamYourRoles()}>
			{#each roleLabels as label (label)}
				<li class="badge badge-primary badge-soft gap-1.5">
					<i class="ph-duotone ph-shield-star text-xs" aria-hidden="true"></i>
					{label}
				</li>
			{/each}
		</ul>
	{/if}

	{#if items.length === 0}
		<p class="text-base-content/70 flex items-center gap-2" data-testid="team-waiting-nothing">
			<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-xl"></i>
			{m.teamWaitingNothing()}
		</p>
	{:else}
		<ul class="flex flex-col gap-2" data-testid="team-waiting">
			{#each items as item (item.id)}
				<li>
					<a
						href={resolve(
							`dashboard/${conferenceId}/${item.route.path}${item.query ? `?${item.query}` : ''}`
						)}
						class="bg-base-200 hover:bg-base-300 rounded-field flex items-center gap-3 px-4 py-3 transition-colors"
					>
						<i aria-hidden="true" class="ph-duotone {item.route.icon} text-primary text-xl"></i>
						<span class="flex min-w-0 flex-1 flex-col">
							<span class="font-semibold">{item.route.title()}</span>
							<span class="text-base-content/70 text-sm">{item.label}</span>
						</span>
						<span class="badge badge-warning">{item.count}</span>
						<i aria-hidden="true" class="ph-duotone ph-caret-right text-base-content/40"></i>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</DashboardSection>
