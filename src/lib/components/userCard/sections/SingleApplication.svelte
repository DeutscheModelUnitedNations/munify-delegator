<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import Section from '../ui/Section.svelte';
	import ApplicationReview from './ApplicationReview.svelte';
	import ApplicationTexts from './ApplicationTexts.svelte';
	import AppliedBadge from './AppliedBadge.svelte';
	import WishList from './WishList.svelte';

	/** What a single participant applied with: the roles they wished for and what they wrote, and what the team made of it. */
	interface Props {
		singleParticipantId: string;
		conferenceId: string;
	}

	let { singleParticipantId, conferenceId }: Props = $props();

	async function fetchApplication({
		singleParticipantId,
		conferenceId
	}: {
		singleParticipantId: string;
		conferenceId: string;
	}) {
		const [participant, conference] = await Promise.all([
			client.liveQuery.singleParticipant({
				__args: { id: singleParticipantId },
				id: true,
				applied: true,
				appliedForRoles: { id: true, name: true, icon: true }
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, id: true, state: true })
		]);
		return { participant, conference };
	}

	const data = $derived(await fetchApplication({ singleParticipantId, conferenceId }));
	const participant = $derived(data.participant);
	const conferenceState = $derived(data.conference.state);

	const revokeApplication = async () => {
		if (!(await confirmDialog({ text: m.confirmRevokeApplication(), danger: true }))) return;
		const promise = client.mutate.updateSingleParticipant({
			__args: { id: singleParticipantId, applied: false },
			id: true,
			applied: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

<Section icon="note-pencil" title={m.userCardTabRegistration()} columns>
	{#snippet actions()}
		<AppliedBadge applied={participant.applied} />
		{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
			<button
				class="btn btn-ghost btn-sm text-error"
				disabled={!participant.applied}
				onclick={revokeApplication}
			>
				<i aria-hidden="true" class="ph-duotone ph-file-x text-lg"></i>
				{m.revokeApplication()}
			</button>
		{/if}
	{/snippet}
	<div class="min-w-0">
		<WishList
			wishes={participant.appliedForRoles.map((role) => ({
				id: role.id,
				label: role.name ?? 'N/A',
				icon: role.icon
			}))}
		/>
		<ApplicationReview
			{conferenceId}
			applicationId={singleParticipantId}
			kind="singleParticipant"
		/>
	</div>
	<ApplicationTexts {singleParticipantId} />
</Section>
