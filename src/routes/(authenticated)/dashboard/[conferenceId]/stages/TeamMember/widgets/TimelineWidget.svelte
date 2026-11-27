<!--
	@component
	Where the conference is: its states as steps, the latest date passed and the next ones (its own
	deadlines and its surveys'), each with the number behind it where the caller may see one, and
	for project management a hint once the dates say the conference is due for its next state.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { createMinuteClock } from '#lib/components/calendar/minuteClock.svelte';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import { translateState } from '#lib/components/dashboard/conferenceHeader';
	import { canEditConference } from '#lib/helpers/teamAccess';
	import { m } from '#lib/paraglide/messages';
	import { mayOpen, type WidgetSize } from '../teamWidgets';
	import type { WaitingAccess } from '../teamWaiting';
	import MilestoneItem from './MilestoneItem.svelte';
	import TimelineStates from './TimelineStates.svelte';
	import { dueNextState, milestonesOf, visibleMilestones } from './timeline';

	let {
		conferenceId,
		size,
		access
	}: { conferenceId: string; size: WidgetSize; access: WaitingAccess } = $props();

	const clock = createMinuteClock();
	const seesPayments = $derived(mayOpen({ routeId: 'payments', access }));
	const seesSurveys = $derived(mayOpen({ routeId: 'survey', access }));

	const [conference, surveys, unpaid] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				state: true,
				applicationDeadline: true,
				registrationDeadlineGracePeriodMinutes: true,
				paymentDeadline: true,
				assignmentReleased: true,
				assignmentReleasedAt: true,
				startConference: true,
				endConference: true
			}),
			client.liveQuery.surveyQuestions({
				__args: {
					where: { conferenceId: { eq: conferenceId }, draft: { eq: false }, hidden: { eq: false } }
				},
				title: true,
				deadline: true,
				unansweredCount: true
			}),
			seesPayments
				? client.query
						.getConferenceStatistics({
							__args: { conferenceId },
							postalPaymentProgress: { paymentPending: true, paymentProblem: true }
						})
						.then(
							(stats) =>
								stats.postalPaymentProgress.paymentPending +
								stats.postalPaymentProgress.paymentProblem
						)
				: undefined
		])
	);

	const now = $derived(new Date(clock.time));
	const timelineConference = $derived({
		state: conference.state,
		applicationDeadline: conference.applicationDeadline,
		registrationDeadlineGracePeriodMinutes: conference.registrationDeadlineGracePeriodMinutes,
		paymentDeadline: conference.paymentDeadline,
		assignmentReleased: conference.assignmentReleased,
		assignmentReleasedAt: conference.assignmentReleasedAt,
		startConference: conference.startConference,
		endConference: conference.endConference
	});
	const surveyList = $derived(
		surveys.map((survey) => ({
			id: survey.id,
			title: survey.title,
			deadline: survey.deadline,
			unanswered: survey.unansweredCount
		}))
	);
	const shown = $derived(
		visibleMilestones({
			milestones: milestonesOf({ conference: timelineConference, surveys: surveyList, now }),
			upcoming: size === 'large' ? 3 : 2
		})
	);
	const nextState = $derived(
		canEditConference(access) ? dueNextState({ conference: timelineConference, now }) : undefined
	);

	const sight = $derived({ unpaid, seesPayments, seesSurveys });
</script>

<DashboardWidget
	icon="flag-checkered"
	title={m.teamWidgetTimelineTitle()}
	{size}
	testId="timeline"
	href={mayOpen({ routeId: 'settings', access })
		? resolve('/(authenticated)/dashboard/[conferenceId]/team/configuration', { conferenceId })
		: undefined}
	linkLabel={m.teamWidgetTimelineSettings()}
>
	<TimelineStates state={conference.state} compact={size === 'compact'} />

	{#if nextState}
		<div
			role="status"
			class="alert alert-info alert-soft text-sm"
			data-testid="timeline-next-state"
		>
			<i aria-hidden="true" class="ph-duotone ph-arrow-circle-right text-xl"></i>
			<span>{m.teamWidgetTimelineNextState({ state: translateState(nextState) })}</span>
			<a
				class="btn btn-sm"
				href={resolve(`dashboard/${conferenceId}/team/configuration?tab=status`)}
				>{m.teamWidgetTimelineChangeState()}</a
			>
		</div>
	{/if}

	<ul class="grid gap-3 {size === 'large' ? 'sm:grid-cols-2 xl:grid-cols-4' : ''}">
		{#each shown as milestone (milestone.key)}
			<MilestoneItem {conferenceId} {milestone} {sight} {now} />
		{/each}
	</ul>
</DashboardWidget>
