<script lang="ts">
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import StatusChecklist, {
		type ChecklistStatus
	} from '#lib/components/dashboard/StatusChecklist.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	interface Props {
		conferenceId: string;
		status?: MyConferenceParticipation['participantStatus'];
		ofAgeAtConference: boolean;
		/** The participant whose survey answers count as steps; supervisors answer no surveys. */
		surveyUserId?: string;
	}

	let { conferenceId, status, ofAgeAtConference, surveyUserId }: Props = $props();

	const [conference, surveys, answers] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				unlockPayments: true,
				unlockPostals: true,
				timezone: true
			}),
			surveyUserId
				? client.liveQuery.surveyQuestions({
						__args: {
							where: {
								conferenceId: { eq: conferenceId },
								draft: { eq: false },
								hidden: { eq: false }
							},
							orderBy: { deadline: 'asc' }
						},
						id: true,
						title: true,
						deadline: true
					})
				: [],
			surveyUserId
				? client.liveQuery.surveyAnswers({
						__args: {
							where: {
								question: { conferenceId: { eq: conferenceId }, hidden: { eq: false } },
								user: { id: { eq: surveyUserId } }
							}
						},
						question: { id: true }
					})
				: []
		])
	);
	const unlockPayment = $derived(conference.unlockPayments);
	const unlockPostals = $derived(conference.unlockPostals);

	/** A step that cannot be taken before the conference unlocks it, and is pending until it is. */
	const stepStatus = (unlocked: boolean, value: ChecklistStatus | undefined): ChecklistStatus =>
		unlocked ? (value ?? 'PENDING') : 'NOT_YET_POSSIBLE';

	const answeredIds = $derived(new Set(answers.map((answer) => answer.question.id)));
	const now = new Date();
	// A survey that closed unanswered drops out: there is nothing left to do about it, the team
	// assigns an option
	let surveySteps = $derived(
		surveys
			.filter((survey) => answeredIds.has(survey.id) || new Date(survey.deadline) > now)
			.map((survey) => ({
				task: m.surveyStep({ title: survey.title }),
				status: answeredIds.has(survey.id) ? ('DONE' as const) : ('PENDING' as const),
				hint: m.untilDate({
					date: new Date(survey.deadline).toLocaleDateString(getLocale(), {
						timeZone: conference.timezone,
						day: 'numeric',
						month: 'short'
					})
				})
			}))
	);

	let steps = $derived([
		{ task: m.registration(), status: 'DONE' as const },
		{
			task: m.payment(),
			status: stepStatus(unlockPayment, status?.paymentStatus)
		},
		{
			task: m.userAgreement(),
			status: stepStatus(unlockPostals, status?.termsAndConditions)
		},
		// Only minors need their guardian's consent
		...(ofAgeAtConference
			? []
			: [
					{
						task: m.guardianAgreement(),
						status: stepStatus(unlockPostals, status?.guardianConsent)
					}
				]),
		{
			task: m.mediaAgreement(),
			status: stepStatus(unlockPostals, status?.mediaConsent)
		},
		...surveySteps
	]);
</script>

<DashboardSection
	icon="clipboard-check"
	title={m.personalStatus()}
	description={m.personalStatusDescription()}
>
	<StatusChecklist {steps} />
</DashboardSection>
