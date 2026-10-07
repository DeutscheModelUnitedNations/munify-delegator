<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import DashboardSection from './DashboardSection.svelte';
	import SurveyCard from '$lib/components/survey/SurveyCard.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		userId: string;
		conferenceTimezone: string;
	}

	let { conferenceId, userId, conferenceTimezone }: Props = $props();

	/** The published questions plus this person's answers to them. */
	async function fetchSurveys() {
		const [questions, answers] = await Promise.all([
			client.liveQuery.surveyQuestions({
				__args: {
					where: {
						conferenceId: { eq: conferenceId },
						draft: { eq: false },
						hidden: { eq: false }
					},
					orderBy: { createdAt: 'desc' }
				},
				id: true,
				title: true,
				description: true,
				deadline: true,
				showSelectionOnDashboard: true,
				options: {
					id: true,
					title: true,
					description: true,
					upperLimit: true,
					countSurveyAnswers: true
				}
			}),
			client.liveQuery.surveyAnswers({
				__args: {
					where: {
						question: { conferenceId: { eq: conferenceId }, hidden: { eq: false } },
						userId: { eq: userId }
					}
				},
				id: true,
				question: { id: true },
				option: { id: true, title: true }
			})
		]);

		return { questions, answers };
	}

	let surveys = $state<Awaited<ReturnType<typeof fetchSurveys>>>();

	$effect(() => {
		void fetchSurveys().then((result) => {
			surveys = result;
		});
	});

	let questions = $derived(surveys?.questions ?? []);
	let answers = $derived(surveys?.answers ?? []);

	let allAnswered = $derived(
		questions.length > 0 && questions.every((q) => answers.some((a) => a.question.id === q.id))
	);

	let sectionCollapsed = $derived(allAnswered);

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
					class="bg-primary/10 border-primary/30 flex items-center gap-3 rounded-box border px-5 py-3.5 shadow-sm"
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
