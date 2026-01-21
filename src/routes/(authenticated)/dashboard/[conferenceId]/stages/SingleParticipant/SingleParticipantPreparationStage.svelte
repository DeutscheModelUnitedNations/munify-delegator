<script lang="ts">
	import type { PageData } from '../../$houdini';
	import { m } from '$lib/paraglide/messages';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import DashboardLinksGrid from '$lib/components/Dashboard/DashboardLinksGrid.svelte';
	import DashboardLinkCard from '$lib/components/Dashboard/DashboardLinkCard.svelte';
	import { getLinksForUserType, type DashboardLinkContext } from '$lib/config/dashboardLinks';
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import SupervisorTable from '../Common/SupervisorTable.svelte';

	interface Props {
		surveyQuestions: NonNullable<MyConferenceparticipationQuery$result['findManySurveyQuestions']>;
		surveyAnswers: NonNullable<MyConferenceparticipationQuery$result['findManySurveyAnswers']>;
		conference: NonNullable<MyConferenceparticipationQuery$result['findUniqueConference']>;
		singleParticipant: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueSingleParticipant']
		>;
		user: PageData['user'];
	}

	let { surveyQuestions, surveyAnswers, conference, singleParticipant, user }: Props = $props();

	const linkContext = $derived<DashboardLinkContext>({
		conferenceId: conference.id,
		userType: 'singleParticipant',
		conferenceState: conference.state,
		unlockPayments: conference.unlockPayments,
		unlockPostals: conference.unlockPostals,
		hasConferenceInfo: !!conference.info,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		isOpenPaperSubmission: conference.isOpenPaperSubmission,
		linkToPaperInbox: conference.linkToPaperInbox,
		surveyQuestionCount: surveyQuestions?.length ?? 0,
		surveyAnswerCount: surveyAnswers?.length ?? 0,
		user
	});

	const visibleLinks = $derived(getLinksForUserType('singleParticipant', linkContext));
</script>

<DashboardSection icon="link" title={m.quickLinks()} description={m.quickLinksDescription()}>
	<DashboardLinksGrid>
		{#each visibleLinks as link (link.id)}
			{@const badge = link.getBadge?.(linkContext)}
			<DashboardLinkCard
				href={link.getHref(linkContext)}
				icon={link.icon}
				title={link.getTitle()}
				description={link.getDescription()}
				external={link.external}
				disabled={link.isDisabled(linkContext)}
				badge={badge?.value}
				badgeType={badge?.type}
			/>
		{/each}
	</DashboardLinksGrid>
</DashboardSection>

<DashboardSection icon="masks-theater" title={m.role()} description={m.roleDescription()}>
	<div class="stats bg-base-200 shadow">
		<RoleWidget customConferenceRole={singleParticipant?.assignedRole} />
	</div>
</DashboardSection>

<SupervisorTable supervisors={singleParticipant.supervisors} conferenceId={conference.id} />
