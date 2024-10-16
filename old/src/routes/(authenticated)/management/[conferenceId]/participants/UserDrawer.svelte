<script lang="ts">
	import Drawer from '$lib/components/DataTable/DrawerWrapper.svelte';
	import type { ConferenceSupervisor, SingleParticipant, DelegationMember } from '@prisma/client';
	import { apiClient, checkForError } from '$api/client';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import type { UserData } from './+page';

	interface Props {
		user: UserData | null;
		onClose: () => void;
		data: PageData;
	}

	let { user, onClose, data }: Props = $props();

	let api = apiClient({ origin: data.url.origin });
</script>

<Drawer open={user != null} {onClose}>
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-thin uppercase">{m.adminUserCard()}</h3>
		<h2 class="rounded-md bg-base-300 p-2 text-3xl font-bold">
			<span class="capitalize">{user?.given_name}</span>
			<span class="uppercase">{user?.family_name}</span>
			{#if user?.pronouns}
				<span class="text-sm font-normal">({user?.pronouns})</span>
			{/if}
		</h2>
		<h3 class="text-sm font-thin">{user?.id}</h3>
	</div>

	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.adminUserCardDetails()}</h3>
		<table class="table">
			<thead>
				<tr>
					<th></th>
					<th class="w-full"></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><i class="fa-duotone fa-phone text-lg"></i></td>
					{#if user?.phone}
						<td class="font-mono">
							<a
								class="cursor-pointer rounded-md bg-base-300 px-2 py-1 hover:underline"
								href={`tel:${user.phone}`}>{user.phone}</a
							>
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td><i class="fa-duotone fa-envelope text-lg"></i></td>
					<td class="font-mono">
						<a
							class="cursor-pointer rounded-md bg-base-300 px-2 py-1 hover:underline"
							href={`mailto:${user?.email}`}
						>
							{user?.email}
						</a>
					</td>
				</tr>
				<tr>
					<td><i class="fa-duotone fa-house text-lg"></i></td>
					{#if user?.street}
						<td>
							{user?.street}
							<br />
							{#if user?.apartment}
								{user?.apartment}
								<br />
							{/if}
							{user?.zip}
							{user?.city}
							<br />
							<span class="uppercase"
								>{user?.country && user?.country !== '' ? user.country : 'N/A'}</span
							>
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td><i class="fa-duotone fa-birthday-cake text-lg"></i></td>
					{#if user?.birthday}
						<td>
							{new Date(user?.birthday!).toLocaleDateString('de', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					{#if user?.foodPreference === 'OMNIVORE'}
						<td><i class="fa-duotone fa-meat text-lg"></i></td>
						<td>{m.omnivore()}</td>
					{:else if user?.foodPreference === 'VEGETARIAN'}
						<td><i class="fa-duotone fa-cheese-swiss text-lg"></i></td>
						<td>{m.vegetarian()}</td>
					{:else if user?.foodPreference === 'VEGAN'}
						<td><i class="fa-duotone fa-leaf text-lg"></i></td>
						<td>{m.vegan()}</td>
					{:else}
						<td><i class="fa-duotone fa-meat text-lg"></i></td>
						<td>N/A</td>
					{/if}
				</tr>
			</tbody>
		</table>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminUserCardStatus()}</h3>
		<!-- TODO -->
		<div class="alert alert-info">
			<i class="fas fa-excavator"></i>
			Bald verfügbar
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<div class="card flex flex-col">
			<div class="flex flex-col gap-2">
				{#if user?.singleParticipant && user?.singleParticipant.length > 0 && user?.singleParticipant[0]}
					<a
						class="btn"
						href="/management/{data.conferenceData.id}/individuals?id={user.singleParticipant[0]
							.id}"
					>
						{m.individualApplication()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if user?.delegationMemberships && user?.delegationMemberships.length > 0 && user?.delegationMemberships[0]}
					<a
						class="btn"
						href="/management/{data.conferenceData.id}/delegations?id={user.delegationMemberships[0]
							.delegationId}"
					>
						{m.delegation()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if user?.conferenceSupervisor && user?.conferenceSupervisor.length > 0 && user?.conferenceSupervisor[0].id}
					<a
						class="btn"
						href="/management/{data.conferenceData.id}/supervisors?id={user.conferenceSupervisor[0]
							.id}"
					>
						{m.supervisor()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{/if}
			</div>
		</div>
	</div>
</Drawer>
