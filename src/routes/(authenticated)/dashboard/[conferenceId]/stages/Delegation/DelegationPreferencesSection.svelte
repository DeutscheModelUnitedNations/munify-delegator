<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import RoleApplicationTable from './RoleApplicationTable.svelte';
	import SelectDelegationPreferencesModal from './SelectDelegationPreferencesModal.svelte';

	/**
	 * The roles a registering delegation wishes for, which its head delegate sets until the
	 * application is complete; the others are pointed at the conference's seats.
	 */
	interface Props {
		conferenceId: string;
		delegationId: string;
		userIsHeadDelegate: boolean;
		applied: boolean;
		/** No wishes yet. */
		empty: boolean;
	}

	let { conferenceId, delegationId, userIsHeadDelegate, applied, empty }: Props = $props();

	let delegationPreferencesModalOpen = $state(false);
</script>

<DashboardSection
	id="application-preferences"
	icon="flag"
	title={m.delegationPreferences()}
	description={userIsHeadDelegate
		? m.delegationPreferencesDescriptionHeadDelegate()
		: m.delegationPreferencesDescriptionMember()}
>
	{#if empty}
		<div class="alert alert-warning alert-soft text-sm">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
			{m.noRoleApplications()}
		</div>
	{:else}
		<RoleApplicationTable {delegationId} {conferenceId} />
	{/if}
	{#if !applied}
		<div class="mt-4 flex flex-wrap gap-2">
			{#if userIsHeadDelegate}
				<button
					class="btn btn-primary"
					onclick={() => {
						delegationPreferencesModalOpen = true;
					}}
				>
					<i class="fa-sharp-duotone fa-solid fa-pen"></i>
					{m.setDelegationPreferences()}
				</button>
			{/if}
			<a
				class="btn {userIsHeadDelegate ? 'btn-ghost' : 'btn-primary'}"
				href={resolve(`dashboard/${conferenceId}/seats`)}
			>
				<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
				{m.conferenceSeats()}
			</a>
		</div>
	{/if}
</DashboardSection>

{#if delegationPreferencesModalOpen}
	<SelectDelegationPreferencesModal
		onClose={() => {
			delegationPreferencesModalOpen = false;
		}}
		{conferenceId}
		{delegationId}
	/>
{/if}
