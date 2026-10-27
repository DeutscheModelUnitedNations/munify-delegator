<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import {
		applicationTextsComplete,
		MIN_ROLE_APPLICATIONS
	} from '#lib/helpers/applicationReadiness.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import type { ApplicationAnswers } from '../../applicationForm';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import ApplicationQuestionnaire from '../Common/ApplicationQuestionnaire.svelte';
	import ApplicationProgress from '../Common/ApplicationProgress.svelte';
	import RegistrationDangerZone from '../Common/RegistrationDangerZone.svelte';
	import SingleParticipantRoleApplications from './SingleParticipantRoleApplications.svelte';

	interface Props {
		conferenceId: string;
		singleParticipantId: string;
	}

	let { conferenceId, singleParticipantId }: Props = $props();

	const singleParticipant = $derived(
		await client.liveQuery.singleParticipant({
			__args: { id: singleParticipantId },
			id: true,
			school: { id: true, name: true },
			motivation: true,
			experience: true,
			applied: true,
			appliedForRoles: { id: true, name: true, description: true, fontAwesomeIcon: true }
		})
	);

	const applied = $derived(singleParticipant.applied);

	const saveApplication = (answers: ApplicationAnswers) =>
		client.mutate.updateSingleParticipant({
			__args: { id: singleParticipantId, ...answers },
			id: true
		});

	const completeRegistration = async () => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}
		if (!(await confirmDialog({ text: m.completeSignupConfirmation() }))) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id: singleParticipant.id, applied: true },
			id: true,
			applied: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};

	const deleteAllApplications = async () => {
		if (!singleParticipant) {
			console.error('Error: singleParticipant not found');
			return;
		}

		if (!(await confirmDialog({ text: m.deleteAllApplicationsConfirmation(), danger: true })))
			return;

		const promise = Promise.resolve(
			client.mutate.deleteSingleParticipant({ __args: { id: singleParticipant.id } })
		);

		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		goto(resolve('dashboard'));
	};

	// The button completing the application is the last step, so it is not listed.
	const steps = $derived([
		{
			task: m.todoApplyForRole(),
			done: singleParticipant.appliedForRoles.length >= MIN_ROLE_APPLICATIONS.singleParticipant,
			hint: m.todoApplyForRoleHelp(),
			href: '#application-roles'
		},
		{
			task: m.todoAnswerQuestionaire(),
			done: applicationTextsComplete(singleParticipant),
			hint: m.todoAnswerQuestionaireHelp(),
			href: '#application-texts'
		}
	]);
</script>

<ApplicationProgress
	{conferenceId}
	{applied}
	pendingText={m.completeSignupWarningTextSingleParticipant()}
	{steps}
	onComplete={completeRegistration}
/>

<SingleParticipantRoleApplications
	{conferenceId}
	{singleParticipantId}
	{applied}
	answers={{
		schoolId: singleParticipant.school?.id ?? null,
		motivation: singleParticipant.motivation,
		experience: singleParticipant.experience
	}}
	roles={singleParticipant.appliedForRoles}
/>

<DashboardSection
	id="application-texts"
	icon="file-lines"
	title={m.informationAndMotivation()}
	description={m.informationAndMotivationDescriptionHeadDelegate()}
>
	<!-- Seeded once from the row as it was on mount. The dashboard keys this component by
	registration, so a different one gets a fresh form. -->
	<ApplicationQuestionnaire
		initial={singleParticipant}
		save={saveApplication}
		disabled={applied}
		showSubmitButton={!applied}
		schoolLabel={m.whichSchoolAreYouFrom()}
		motivationLabel={m.whyDoYouWantToJoinTheConferenceSingleParticipant()}
		experienceLabel={m.howMuchExperienceDoesYourDelegationHaveSingleParticipant()}
	/>
</DashboardSection>

<SupervisorTable singleParticipantId={singleParticipant.id} {conferenceId} />

<RegistrationDangerZone
	{applied}
	appliedText={m.noDangerZoneOptionsSingleParticipants()}
	supportIdHtml={m.singleParticipantsIdForSupport()}
	id={singleParticipant.id}
>
	<button class="btn btn-outline btn-error" onclick={deleteAllApplications}>
		{m.deleteAllApplications()}
	</button>
</RegistrationDangerZone>
