<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import codenmz from '#lib/helpers/codenamize';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { splitRole } from '#lib/helpers/conferenceRole';
	import { toast } from 'svelte-sonner';
	import Flag from '#lib/components/Flag.svelte';
	import Row from '../ui/Row.svelte';
	import Section from '../ui/Section.svelte';
	import DelegationCode from './DelegationCode.svelte';
	import DelegationMembers from './DelegationMembers.svelte';
	import { fetchDelegationSeat } from './delegationSeat';
	import MakeSupervisorNotice from './MakeSupervisorNotice.svelte';

	/** The person's delegation and its role, its members with their committees. */
	interface Props {
		delegationId: string;
		conferenceId: string;
		userId: string;
	}

	let { delegationId, conferenceId, userId }: Props = $props();

	const delegation = $derived(await fetchDelegationSeat(delegationId));
	const currentMember = $derived(delegation.members.find((member) => member.user.id === userId));
	const role = $derived(splitRole(delegation.assignedRole));
	const nation = $derived(role.nation);
	const nonStateActor = $derived(role.nonStateActor);

	/** Takes the delegation out of the conference, its members' registrations with it. */
	async function deleteDelegation() {
		if (!(await confirmDialog({ text: m.confirmDeleteDelegation(), danger: true }))) return;
		const promise = Promise.resolve(
			client.mutate.deleteDelegation({ __args: { id: delegationId } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}
</script>

<Section icon="users-three" title={codenmz(delegationId)} columns>
	{#snippet actions()}
		<button
			class="btn btn-ghost btn-sm btn-square hover:text-error"
			onclick={deleteDelegation}
			aria-label={m.deleteDelegation()}
			title={m.deleteDelegation()}
		>
			<i aria-hidden="true" class="ph-duotone ph-trash text-lg"></i>
		</button>
	{/snippet}
	<div class="min-w-0">
		{#if currentMember}
			<MakeSupervisorNotice {conferenceId} member={currentMember} />
		{/if}
		<Row icon="flag" title={m.assignedRole()}>
			<span class="flex items-center gap-2">
				{#if nation}
					<Flag alpha2Code={nation.alpha2Code} size="xs" />
					{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
				{:else if nonStateActor}
					<Flag nsa icon={nonStateActor.icon} size="xs" />
					{nonStateActor.name} ({nonStateActor.abbreviation})
				{:else}
					<span class="text-base-content/60">{m.noAssignment()}</span>
				{/if}
			</span>
		</Row>
		<DelegationCode {delegationId} />
	</div>
	<!-- The rest of the line where the section has three columns -->
	<div class="min-w-0 group-data-wide/card:min-[1760px]:col-span-2">
		<DelegationMembers {delegationId} {conferenceId} {userId} />
	</div>
</Section>
