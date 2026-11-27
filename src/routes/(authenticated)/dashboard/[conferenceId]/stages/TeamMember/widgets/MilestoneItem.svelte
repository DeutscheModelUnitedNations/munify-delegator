<!--
	@component
	One date of the timeline widget: when it is, what it is (linking to where it is worked on, where
	the caller may open that), and the number behind it.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import {
		detailOf,
		linkOf,
		whenOf,
		type Milestone,
		type MilestoneKind,
		type MilestoneSight,
		type MilestoneWhen
	} from './timeline';

	let {
		conferenceId,
		milestone,
		sight,
		now
	}: { conferenceId: string; milestone: Milestone; sight: MilestoneSight; now: Date } = $props();

	const TITLES: Record<MilestoneKind, (milestone: Milestone) => string> = {
		applicationDeadline: () => m.teamWidgetTimelineApplicationDeadline(),
		paymentDeadline: () => m.teamWidgetTimelinePaymentDeadline(),
		assignmentReleased: () => m.teamWidgetTimelineAssignmentReleased(),
		surveyDeadline: (entry) =>
			m.teamWidgetTimelineSurveyDeadline({ title: entry.survey?.title ?? '' }),
		conferenceStart: () => m.teamWidgetTimelineConferenceStart(),
		conferenceEnd: () => m.teamWidgetTimelineConferenceEnd()
	};

	const WHEN: Record<MilestoneWhen['kind'], (when: MilestoneWhen, date: string) => string> = {
		done: (_when, date) => m.teamWidgetTimelineDone({ date }),
		today: (_when, date) => m.teamWidgetTimelineToday({ date }),
		tomorrow: (_when, date) => m.teamWidgetTimelineTomorrow({ date }),
		inDays: (when, date) =>
			m.teamWidgetTimelineInDays({ days: when.kind === 'inDays' ? when.days : 0, date })
	};

	const date = $derived(
		milestone.at.toLocaleDateString(getLocale(), { day: 'numeric', month: 'numeric' })
	);
	const when = $derived(whenOf({ milestone, now }));
	const detail = $derived(detailOf({ milestone, sight }));
	const link = $derived(linkOf({ milestone, sight }));
	const href = $derived(
		link?.page === 'payments'
			? resolve('/(authenticated)/dashboard/[conferenceId]/team/payments', { conferenceId })
			: link?.page === 'survey'
				? resolve('/(authenticated)/dashboard/[conferenceId]/team/survey/[surveyId]', {
						conferenceId,
						surveyId: link.surveyId
					})
				: undefined
	);
</script>

<li class="bg-base-200 rounded-box flex flex-col gap-0.5 px-4 py-3" data-testid="milestone">
	<span
		class="text-xs font-semibold tracking-wide uppercase {milestone.done
			? 'text-base-content/60'
			: 'text-base-content/80'}">{WHEN[when.kind](when, date)}</span
	>
	{#if href}
		<a class="link link-hover font-semibold" {href}>{TITLES[milestone.kind](milestone)}</a>
	{:else}
		<span class="font-semibold">{TITLES[milestone.kind](milestone)}</span>
	{/if}
	{#if detail}
		<span class="text-base-content/70 text-sm">
			{detail.kind === 'unpaid'
				? m.teamWidgetTimelineUnpaid({ count: detail.count })
				: m.teamWidgetTimelineUnanswered({ count: detail.count })}
		</span>
	{/if}
</li>
