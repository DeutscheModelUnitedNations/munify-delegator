<script lang="ts">
	import { onMount } from 'svelte';
	import FinalSupervisor from './Flow/FinalSupervisor.svelte';
	import FinalSupervisorAnswerWait from './Flow/FinalSupervisorAnswerWait.svelte';
	import ParticipantOrSupervisor from './Flow/ParticipantOrSupervisor.svelte';
	import SupervisorUsersAlreadyRegistered from './Flow/SupervisorUsersAlreadyRegistered.svelte';
	import Role from './Flow/Role.svelte';

	import QuestionFlowState from './flowEnum';
	import FinalIndividual from './Flow/FinalIndividual.svelte';
	import DelegateHavePartners from './Flow/DelegateHavePartners.svelte';
	import FinalIndividualDelegate from './Flow/FinalIndividualDelegate.svelte';
	import PartnersCreatedDelegation from './Flow/PartnersCreatedDelegation.svelte';
	import FinalCreateDelegation from './Flow/FinalCreateDelegation.svelte';
	import FinalJoinDelegation from './Flow/FinalJoinDelegation.svelte';

	interface Props {
		conferenceId: string;
		onClose: () => void;
	}

	let { onClose, conferenceId }: Props = $props();

	const isActive = (q: QuestionFlowState) => {
		return components.includes(q);
	};

	const add = (q: QuestionFlowState) => components.push(q);

	let components = $state<QuestionFlowState[]>([]);

	onMount(() => {
		components.push(QuestionFlowState.Q_PARTICIPANT_OR_SUPERVISOR);
	});
</script>

<dialog id="assistent_modal" class="modal modal-open modal-bottom h-screen sm:modal-middle">
	<div class="modal-box h-full overflow-y-auto overflow-x-hidden">
		<h3 class="text-lg font-bold">
			<i class="fa-duotone fa-message-question mr-2"></i>
			Anmeldeassistent
		</h3>
		<div class="my-8 flex flex-col gap-4">
			{#if isActive(QuestionFlowState.Q_PARTICIPANT_OR_SUPERVISOR)}
				<ParticipantOrSupervisor advance={add}></ParticipantOrSupervisor>
			{/if}
			{#if isActive(QuestionFlowState.Q_SUPERVISOR_USERS_ALREADY_REGISTERED)}
				<SupervisorUsersAlreadyRegistered advance={add}></SupervisorUsersAlreadyRegistered>
			{/if}
			{#if isActive(QuestionFlowState.FINAL_SUPERVISOR_ANSWER_WAIT)}
				<FinalSupervisorAnswerWait></FinalSupervisorAnswerWait>
			{/if}
			{#if isActive(QuestionFlowState.FINAL_SUPERVISOR)}
				<FinalSupervisor {conferenceId}></FinalSupervisor>
			{/if}
			{#if isActive(QuestionFlowState.Q_ROLE)}
				<Role advance={add}></Role>
			{/if}
			{#if isActive(QuestionFlowState.FINAL_INDIVIDUAL)}
				<FinalIndividual {conferenceId}></FinalIndividual>
			{/if}
			{#if isActive(QuestionFlowState.Q_DELEGATE_HAVE_PARTNERS)}
				<DelegateHavePartners advance={add}></DelegateHavePartners>
			{/if}
			{#if isActive(QuestionFlowState.FINAL_INDIVIDUAL_DELEGATE)}
				<FinalIndividualDelegate {conferenceId}></FinalIndividualDelegate>
			{/if}
			{#if isActive(QuestionFlowState.Q_PARTNERS_CREATED_DELEGATION)}
				<PartnersCreatedDelegation advance={add}></PartnersCreatedDelegation>
			{/if}
			{#if isActive(QuestionFlowState.FINAL_CREATE_DELEGATION)}
				<FinalCreateDelegation {conferenceId}></FinalCreateDelegation>
			{/if}
			{#if isActive(QuestionFlowState.FINAL_JOIN_DELEGATION)}
				<FinalJoinDelegation {conferenceId}></FinalJoinDelegation>
			{/if}
		</div>
		<div class="fixed right-6 top-6">
			<form method="dialog">
				<button class="btn btn-circle btn-sm" onclick={onClose} aria-label="Close">
					<i class="fas fa-xmark"></i>
				</button>
			</form>
		</div>
	</div>
	<button class="modal-backdrop hover:cursor-not-allowed" onclick={onClose} aria-label="Close"
	></button>
</dialog>
