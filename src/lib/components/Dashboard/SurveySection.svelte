<script lang="ts">
	import { graphql } from '$houdini';
	import DashboardSection from './DashboardSection.svelte';
	import SurveyCard from '$lib/components/Survey/SurveyCard.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		userId: string;
		conferenceTimezone: string;
	}

	let { conferenceId, userId, conferenceTimezone }: Props = $props();

	const surveyStore = graphql(`
		query DashboardSurveySectionQuery($conferenceId: String!, $userId: String!) {
			findManySurveyQuestions(
				where: {
					conferenceId: { equals: $conferenceId }
					draft: { equals: false }
					hidden: { equals: false }
				}
				orderBy: { createdAt: desc }
			) {
				id
				title
				description
				deadline
				showSelectionOnDashboard
				options {
					id
					title
					description
					upperLimit
					countSurveyAnswers
				}
			}
			findManySurveyAnswers(
				where: {
					question: { conferenceId: { equals: $conferenceId }, hidden: { equals: false } }
					userId: { equals: $userId }
				}
			) {
				id
				question {
					id
				}
				option {
					id
					title
				}
			}
		}
	`);

	$effect(() => {
		surveyStore.fetch({ variables: { conferenceId, userId } });
	});

	let questions = $derived($surveyStore.data?.findManySurveyQuestions ?? []);
	let answers = $derived($surveyStore.data?.findManySurveyAnswers ?? []);

	let allAnswered = $derived(
		questions.length > 0 && questions.every((q) => answers.some((a) => a.question.id === q.id))
	);

	let sectionCollapsed = $state(false);

	$effect(() => {
		sectionCollapsed = allAnswered;
	});

	let pinnedSelections = $derived(
		questions
			.filter((q) => q.showSelectionOnDashboard)
			.map((q) => {
				const answer = answers.find((a) => a.question.id === q.id);
				return answer ? { title: q.title, selection: answer.option.title } : null;
			})
			.filter((x): x is { title: string; selection: string } => x !== null)
	);

	const getAnswerForQuestion = (questionId: string) => {
		return answers.find((a) => a.question.id === questionId);
	};
</script>

{#if questions.length > 0}
	<DashboardSection
		icon="square-poll-horizontal"
		title={m.survey()}
		description={m.surveyDescription()}
		collapsible
		defaultCollapsed={allAnswered}
		bind:collapsed={sectionCollapsed}
	>
		<div class="flex flex-col gap-4">
			{#each questions as question (question.id)}
				{@const answer = getAnswerForQuestion(question.id)}
				<SurveyCard
					{question}
					answer={answer ? { option: answer.option } : undefined}
					{userId}
					{conferenceTimezone}
				/>
			{/each}
		</div>
	</DashboardSection>

	{#if sectionCollapsed && pinnedSelections.length > 0}
		<div class="flex flex-wrap gap-3 -mt-4 ml-6">
			{#each pinnedSelections as pinned (pinned.title)}
				<div
					class="bg-primary/10 border-primary/30 flex items-center gap-3 rounded-lg border px-5 py-3.5 shadow-sm"
				>
					<i class="fa-duotone fa-square-poll-horizontal text-primary text-lg"></i>
					<div class="flex flex-col">
						<span class="text-base-content/60 text-xs">{pinned.title}</span>
						<span class="text-primary font-semibold">{pinned.selection}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/if}
