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
		MIN_DELEGATION_MEMBERS,
		MIN_ROLE_APPLICATIONS
	} from '#lib/helpers/applicationReadiness.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import type { ApplicationTexts } from '../../applicationForm';
	import ApplicationQuestionnaire from '../Common/ApplicationQuestionnaire.svelte';
	import MySchool from '../Common/MySchool.svelte';
	import ApplicationProgress from '../Common/ApplicationProgress.svelte';
	import RegistrationDangerZone from '../Common/RegistrationDangerZone.svelte';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import DelegationPreferencesSection from './DelegationPreferencesSection.svelte';
	import DelegationRegistrationMembers from './DelegationRegistrationMembers.svelte';

	interface Props {
		conferenceId: string;
		delegationMemberId: string;
	}

	let { conferenceId, delegationMemberId }: Props = $props();

	const delegationMember = $derived(
		await client.liveQuery.delegationMember({
			__args: { id: delegationMemberId },
			id: true,
			isHeadDelegate: true,
			delegation: {
				id: true,
				experience: true,
				motivation: true,
				applied: true,
				members: { id: true },
				appliedForRoles: { id: true }
			}
		})
	);

	let userIsHeadDelegate = $derived(delegationMember.isHeadDelegate);
	// A primitive, so the child components' queries keyed by it only run again when it changes,
	// not on every live update of the membership.
	const delegationId = $derived(delegationMember.delegation.id);
	const applied = $derived(delegationMember.delegation.applied);

	// Creating the delegation is done by being here; the button completing the application is the
	// last step, so neither is listed.
	let steps = $derived([
		{
			task: m.todoInvitePeople(),
			done: delegationMember.delegation.members.length >= MIN_DELEGATION_MEMBERS,
			hint: m.todoInvitePeopleHelp(),
			href: '#application-members'
		},
		{
			task: m.todoEnterDelegationPreferences(),
			done: delegationMember.delegation.appliedForRoles.length >= MIN_ROLE_APPLICATIONS.delegation,
			hint: m.todoEnterDelegationPreferencesHelp(),
			href: '#application-preferences'
		},
		{
			task: m.todoAnswerQuestionnaire(),
			done: applicationTextsComplete(delegationMember.delegation),
			hint: m.todoAnswerQuestionnaireHelp(),
			href: '#application-texts'
		}
	]);

	const leaveDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}

		if (!(await confirmDialog({ text: m.leaveDelegationConfirmation(), danger: true }))) return;

		const promise = Promise.resolve(
			client.mutate.deleteDelegationMember({ __args: { id: delegationMember.id } })
		);

		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		goto(resolve('dashboard'));
	};

	const deleteDelegation = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}

		if (!(await confirmDialog({ text: m.deleteDelegationConfirmation(), danger: true }))) return;

		const promise = Promise.resolve(
			client.mutate.deleteDelegation({ __args: { id: delegationId } })
		);

		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		goto(resolve('dashboard'));
	};

	const saveApplication = (answers: ApplicationTexts) =>
		client.mutate.updateDelegation({ __args: { id: delegationId, ...answers }, id: true });

	const completeRegistration = async () => {
		if (!delegationMember.delegation) {
			console.error('Error: Delegation Data not found');
			return;
		}

		if (!(await confirmDialog({ text: m.completeSignupConfirmation() }))) return;

		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, applied: true },
			id: true
		});

		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

<ApplicationProgress
	{conferenceId}
	{applied}
	pendingText={m.completeSignupWarningText()}
	{steps}
	onComplete={userIsHeadDelegate ? completeRegistration : undefined}
/>

<DelegationRegistrationMembers
	{conferenceId}
	{delegationId}
	{userIsHeadDelegate}
	id="application-members"
/>

<DelegationPreferencesSection
	{conferenceId}
	{delegationId}
	{userIsHeadDelegate}
	{applied}
	empty={delegationMember.delegation.appliedForRoles.length === 0}
/>

<DashboardSection
	id="application-texts"
	icon="file-lines"
	title={m.informationAndMotivation()}
	description={userIsHeadDelegate
		? m.informationAndMotivationDescriptionHeadDelegate()
		: m.informationAndMotivationDescriptionMember()}
>
	<!-- Seeded once from the row as it was on mount. The dashboard keys this component by
	registration, so a different one gets a fresh form. -->
	<div class="bg-base-200 rounded-box mb-4">
		<MySchool {conferenceId} hint={m.ownSchoolDescription()} />
	</div>
	<ApplicationQuestionnaire
		initial={delegationMember.delegation}
		save={saveApplication}
		disabled={applied || !userIsHeadDelegate}
		showSubmitButton={!applied && userIsHeadDelegate}
		motivationLabel={m.whyDoYouWantToJoinTheConference()}
		experienceLabel={m.howMuchExperienceDoesYourDelegationHave()}
	/>
</DashboardSection>

<SupervisorTable delegationMemberId={delegationMember.id} {conferenceId} />

<RegistrationDangerZone
	{applied}
	appliedText={m.noDangerZoneOptions()}
	supportIdHtml={m.delegationIdForSupport()}
	id={delegationId}
>
	{#if delegationMember.delegation.members.length > 1}
		<button class="btn btn-outline btn-error" onclick={leaveDelegation}>
			{m.leaveDelegation()}
		</button>
	{/if}
	{#if userIsHeadDelegate}
		<button class="btn btn-outline btn-error" onclick={deleteDelegation}>
			{m.deleteDelegation()}
		</button>
	{/if}
</RegistrationDangerZone>
