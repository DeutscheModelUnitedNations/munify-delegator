<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import type { PageData } from '../$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';

	let {
		data
	}: {
		data: NonNullable<StoresValues<PageData['MyConferenceparticipationQuery']>['data']> &
			Pick<PageData, 'user'>;
	} = $props();

	const user = $derived(data.findUniqueSingleParticipant?.user);
</script>

<section class="flex w-full flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.role()}</h2>
	<div class="stats bg-base-200 shadow">
		<RoleWidget customConferenceRole={data.findUniqueSingleParticipant?.assignedRole} />
	</div>
</section>

<section class="flex w-full flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.status()}</h2>
	<!-- <DelegationStatusTableWrapper withCommittee withMailStatus withPaymentStatus> -->
	<DelegationStatusTableWrapper>
		<DelegationStatusTableEntry
			name={`${user?.given_name} ${user?.family_name}`}
			pronouns={user?.pronouns ?? ''}
		/>
	</DelegationStatusTableWrapper>
</section>
