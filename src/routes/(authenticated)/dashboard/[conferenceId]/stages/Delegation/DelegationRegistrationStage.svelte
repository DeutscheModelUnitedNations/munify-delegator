<script lang="ts">
	import { confirmDialog } from '$lib/state/dialogs.svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import codenmz from '$lib/helpers/codenamize';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import type { ApplicationAnswers } from '../../applicationForm';
	import ApplicationQuestionnaire from '../Common/ApplicationQuestionnaire.svelte';
	import CompleteSignupCard from '../Common/CompleteSignupCard.svelte';
	import RegistrationDangerZone from '../Common/RegistrationDangerZone.svelte';
	import RegistrationStatusAlert from '../Common/RegistrationStatusAlert.svelte';
	import RoleApplicationTable from './RoleApplicationTable.svelte';
	import SelectDelegationPreferencesModal from './SelectDelegationPreferencesModal.svelte';
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
				school: true,
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

	let delegationPreferencesModalOpen = $state(false);

	let invitePeopleCompleted = $derived(
		delegationMember.delegation?.members?.length
			? delegationMember.delegation?.members?.length > 1
			: undefined
	);

	let answerQuestionaireCompleted = $derived(
		!!delegationMember.delegation?.school &&
			!!delegationMember.delegation?.motivation &&
			!!delegationMember.delegation?.experience
	);

	let enterDelegationPreferencesCompleted = $derived(
		(delegationMember.delegation.appliedForRoles?.length ?? 0) >= 3
	);

	let todos = $derived([
		{
			title: m.todoCreateDelegation(),
			completed: true
		},
		{
			title: m.todoInvitePeople(),
			completed: invitePeopleCompleted,
			help: m.todoInvitePeopleHelp()
		},
		{
			title: m.todoAnswerQuestionaire(),
			completed: answerQuestionaireCompleted,
			help: m.todoAnswerQuestionaireHelp()
		},
		{
			title: m.todoEnterDelegationPreferences(),
			completed: enterDelegationPreferencesCompleted,
			help: m.todoEnterDelegationPreferencesHelp()
		},
		{
			title: m.todoCompleteSignup(),
			completed: delegationMember.delegation?.applied,
			help: m.todoCompleteSignupHelp(),
			arrowDown:
				invitePeopleCompleted && answerQuestionaireCompleted && enterDelegationPreferencesCompleted
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
		goto(resolve('/dashboard'));
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
		goto(resolve('/dashboard'));
	};

	const saveApplication = (answers: ApplicationAnswers) =>
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

{#snippet preferences()}
	<DashboardSection
		icon="flag"
		title={m.delegationPreferences()}
		description={userIsHeadDelegate
			? m.delegationPreferencesDescriptionHeadDelegate()
			: m.delegationPreferencesDescriptionMember()}
	>
		{#if delegationMember.delegation.appliedForRoles.length === 0}
			<div class="alert alert-warning alert-soft text-sm">
				<i class="fas fa-exclamation-triangle"></i>
				{m.noRoleApplications()}
			</div>
		{:else}
			<RoleApplicationTable {delegationId} {conferenceId} />
		{/if}
		{#if !applied}
			{#if userIsHeadDelegate}
				<button
					class="btn btn-primary mt-4"
					onclick={() => {
						delegationPreferencesModalOpen = true;
					}}
				>
					{m.setDelegationPreferences()}</button
				>
			{:else}
				<a class="btn btn-primary mt-4" href={resolve(`/dashboard/${conferenceId}/seats`)}>
					<i class="fas fa-arrow-right"></i>
					{m.conferenceSeats()}
				</a>
			{/if}
		{/if}
	</DashboardSection>
{/snippet}

<div class="flex flex-col gap-6">
	<RegistrationStatusAlert {applied} pendingText={m.completeSignupWarningText()} />

	<div class="bg-base-100 border-base-200 rounded-box border px-4 py-3 sm:px-6 sm:py-4 shadow-sm">
		<p class="text-base-content/60 text-sm">
			{m.delegationName()} · {m.delegationNameExplaination()}
		</p>
		<p class="text-xl font-semibold">{codenmz(delegationId)}</p>
	</div>

	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
		<div class="flex flex-col gap-6">
			<DelegationRegistrationMembers
				{conferenceId}
				{delegationId}
				delegationMemberId={delegationMember.id}
				{userIsHeadDelegate}
			/>
			<DashboardSection
				icon="file-lines"
				title={m.informationAndMotivation()}
				description={userIsHeadDelegate
					? m.informationAndMotivationDescriptionHeadDelegate()
					: m.informationAndMotivationDescriptionMember()}
			>
				<!-- Seeded once from the row as it was on mount. The dashboard keys this component by
				registration, so a different one gets a fresh form. -->
				<ApplicationQuestionnaire
					initial={delegationMember.delegation}
					save={saveApplication}
					disabled={applied || !userIsHeadDelegate}
					showSubmitButton={!applied && userIsHeadDelegate}
					motivationLabel={m.whyDoYouWantToJoinTheConference()}
					experienceLabel={m.howMuchExperienceDoesYourDelegationHave()}
				/>
			</DashboardSection>
		</div>

		<div class="flex flex-col gap-6">
			{@render preferences()}
			{#if !applied}
				<CompleteSignupCard
					description={userIsHeadDelegate
						? m.completeSignupDescriptionHeadDelegate()
						: m.completeSignupDescription()}
					{todos}
					forbidden={!userIsHeadDelegate}
					onComplete={completeRegistration}
				/>
			{/if}
		</div>
	</div>

	<RegistrationDangerZone
		{applied}
		appliedText={m.noDangerZoneOptions()}
		supportIdHtml={m.delegationIdForSupport()}
		id={delegationId}
	>
		{#if delegationMember.delegation.members.length > 1}
			<button class="btn btn-outline btn-error" onclick={leaveDelegation}
				>{m.leaveDelegation()}</button
			>
		{/if}
		{#if userIsHeadDelegate}
			<button class="btn btn-outline btn-error" onclick={deleteDelegation}>
				{m.deleteDelegation()}
			</button>
		{/if}
	</RegistrationDangerZone>
</div>

{#if delegationPreferencesModalOpen}
	<SelectDelegationPreferencesModal
		onClose={() => {
			delegationPreferencesModalOpen = false;
		}}
		{conferenceId}
		{delegationId}
	/>
{/if}
