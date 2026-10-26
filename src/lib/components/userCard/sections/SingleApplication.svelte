<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { toast } from 'svelte-sonner';
	import QuotedText from '../QuotedText.svelte';
	import AppliedBadge from './AppliedBadge.svelte';
	import SchoolLine from './SchoolLine.svelte';
	import WishList from './WishList.svelte';

	/** What a single participant applied with: their school, texts and the roles they wished for. */
	interface Props {
		singleParticipantId: string;
		conferenceId: string;
	}

	let { singleParticipantId, conferenceId }: Props = $props();

	async function fetchApplication(singleParticipantId: string, conferenceId: string) {
		const [participant, conference] = await Promise.all([
			client.liveQuery.singleParticipant({
				__args: { id: singleParticipantId },
				id: true,
				applied: true,
				school: { id: true, name: true },
				motivation: true,
				experience: true,
				appliedForRoles: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, id: true, state: true })
		]);
		return { participant, conference };
	}

	const data = $derived(await fetchApplication(singleParticipantId, conferenceId));
	const participant = $derived(data.participant);
	const conferenceState = $derived(data.conference.state);

	const saveSchool = (choice: { schoolId?: string | null; schoolName?: string | null }) =>
		Promise.resolve(
			client.mutate.updateSingleParticipant({
				__args: {
					id: singleParticipantId,
					schoolId: choice.schoolId ?? null,
					schoolName: choice.schoolName ?? null
				},
				id: true
			})
		);

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

<section class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-3">
		<h3 class="text-lg font-bold">{m.singleParticipant()}</h3>
		<AppliedBadge applied={participant.applied} />
		{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
			<button
				class="btn btn-ghost btn-sm text-error ml-auto"
				disabled={!participant.applied}
				onclick={revokeApplication}
			>
				<i class="fa-sharp-duotone fa-solid fa-file-slash"></i>
				{m.revokeApplication()}
			</button>
		{/if}
	</div>

	<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		<SchoolLine school={participant.school} save={saveSchool} />
		<WishList
			wishes={participant.appliedForRoles.map((role) => ({
				id: role.id,
				label: role.name ?? 'N/A',
				icon: role.fontAwesomeIcon
			}))}
		/>
	</div>

	{#if participant.motivation || participant.experience}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			{#if participant.motivation}
				<QuotedText title={m.motivation()} text={participant.motivation} />
			{/if}
			{#if participant.experience}
				<QuotedText title={m.experience()} text={participant.experience} />
			{/if}
		</div>
	{/if}
</section>
