<script lang="ts">
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages';
	import Modal from './Modal.svelte';
	import Section from './Section.svelte';
	import type { ModalData } from './types';

	let { data } = $props();

	let modalData = $state<ModalData>();

	const cleanupDelegationMembers = graphql(`
		mutation CleanupDelegationMembers($conferenceId: ID!) {
			deleteDeadDelegationMembers(conferenceId: $conferenceId) {
				id
				user {
					given_name
					family_name
				}
			}
		}
	`);

	const cleanupIndividualParticipants = graphql(`
		mutation CleanupIndividualParticipants($conferenceId: ID!) {
			deleteDeadSingleParticipants(conferenceId: $conferenceId) {
				id
				user {
					given_name
					family_name
				}
			}
		}
	`);

	const cleanupDelegations = graphql(`
		mutation CleanupDelegations($conferenceId: ID!) {
			deleteEmptyDelegations(conferenceId: $conferenceId) {
				id
			}
		}
	`);

	const cleanupSupervisors = graphql(`
		mutation CleanupSupervisors($conferenceId: ID!) {
			deleteDeadSupervisors(conferenceId: $conferenceId) {
				id
				user {
					given_name
					family_name
				}
			}
		}
	`);

	function createModalData(
		message: string,
		result: { user?: { given_name: string; family_name: string }; id?: string }[] | undefined
	) {
		if (!result) return { message: 'Error - No result', count: 0, detailArray: [] };
		return {
			message,
			count: result.length,
			detailArray:
				result
					.map((item) => (item.user ? `${item.user.given_name} ${item.user.family_name}` : item.id))
					.filter((item) => item !== undefined) ?? []
		};
	}
</script>

<div class="flex w-full flex-col flex-wrap gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.cleanup()}</h2>
		<p>{@html m.cleanupDescription()}</p>
	</div>
	<Section
		title={m.cleanupDelegationMembers()}
		description={m.cleanupDelegationMembersDescription()}
		btnText={m.cleanupDelegationMembersButton()}
		action={async () => {
			modalData = createModalData(
				m.cleanupDelegationMembersSuccess(),
				(await cleanupDelegationMembers.mutate({ conferenceId: data.conferenceId }))?.data
					?.deleteDeadDelegationMembers
			);
		}}
	/>
	<Section
		title={m.cleanupIndividualParticipants()}
		description={m.cleanupIndividualParticipantsDescription()}
		btnText={m.cleanupIndividualParticipantsButton()}
		action={async () => {
			modalData = createModalData(
				m.cleanupIndividualParticipantsSuccess(),
				(await cleanupIndividualParticipants.mutate({ conferenceId: data.conferenceId }))?.data
					?.deleteDeadSingleParticipants
			);
		}}
	/>
	<Section
		title={m.cleanupDelegations()}
		description={m.cleanupDelegationsDescription()}
		btnText={m.cleanupDelegationsButton()}
		action={async () => {
			modalData = createModalData(
				m.cleanupDelegationsSuccess(),
				(await cleanupDelegations.mutate({ conferenceId: data.conferenceId }))?.data
					?.deleteEmptyDelegations
			);
		}}
	/>
	<Section
		title={m.cleanupSupervisors()}
		description={m.cleanupSupervisorsDescription()}
		btnText={m.cleanupSupervisorsButton()}
		action={async () => {
			modalData = createModalData(
				m.cleanupSupervisorsSuccess(),
				(await cleanupSupervisors.mutate({ conferenceId: data.conferenceId }))?.data
					?.deleteDeadSupervisors
			);
		}}
	/>
</div>

<Modal {modalData} open={!!modalData} closeModal={() => (modalData = undefined)} />
