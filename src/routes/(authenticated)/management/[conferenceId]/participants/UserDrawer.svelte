<script lang="ts">
	import Drawer from 'svelte-drawer-component';
	import type {
		User,
		ConferenceSupervisor,
		SingleParticipant,
		DelegationMember
	} from '@prisma/client';
	import { apiClient, checkForError } from '$api/client';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		user: User | null;
		onClose: () => void;
		data: PageData;
	}

	let { user, onClose, data }: Props = $props();

	let api = apiClient({ origin: data.url.origin });

	type userDetails = User & {
		conferenceSupervisor: ConferenceSupervisor[];
		delegationMemberships: DelegationMember[];
		singleParticipant: SingleParticipant[];
	};

	let userDetails = $state<userDetails | null>(null);

	$effect(() => {
		userDetails = null;
		if (user) {
			checkForError(api.user({ id: user.id }).get()).then((res) => {
				userDetails = res;
			});
		}
	});
</script>

<Drawer open={user != null} size="600px" placement="right" on:clickAway={onClose}>
	<div class="flex flex-col p-10 bg-base-100 h-full gap-8">
		<div class="flex flex-col gap-2">
			<h3 class="text-xl uppercase font-thin">{m.adminUserCard()}</h3>
			<h2 class="text-3xl font-bold p-2 bg-base-300 rounded-md">
				{user?.given_name}
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
									class="py-1 px-2 bg-base-300 rounded-md hover:underline cursor-pointer"
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
								class="py-1 px-2 bg-base-300 rounded-md hover:underline cursor-pointer"
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
								(<span class="uppercase">{user?.country}</span>)
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
			<div class="alert alert-info">Bald verfügbar</div>
		</div>

		<div class="flex flex-col gap-2">
			<h3 class="text-xl font-bold">{m.adminUserCardRole()}</h3>
			<div class="card flex flex-col">
				{#if userDetails}
					<div class="flex flex-col gap-2">
						{#if userDetails.singleParticipant.length > 0 && userDetails.singleParticipant.find((x) => x.conferenceId === data.conferenceData.id)}
							<a
								class="btn"
								href="/management/{data.conferenceData
									.id}/individuals?id={userDetails.singleParticipant.find(
									(x) => x.conferenceId === data.conferenceData.id
								)!.id}"
							>
								{m.individualApplication()}
								<i class="fa-duotone fa-arrow-up-right-from-square"></i>
							</a>
						{:else if userDetails.delegationMemberships.length > 0 && userDetails.delegationMemberships.find((x) => x.conferenceId === data.conferenceData.id)}
							<a
								class="btn"
								href="/management/{data.conferenceData
									.id}/delegations?id={userDetails.delegationMemberships.find(
									(x) => x.conferenceId === data.conferenceData.id
								)!.delegationId}"
							>
								{m.delegation()}
								<i class="fa-duotone fa-arrow-up-right-from-square"></i>
							</a>
						{:else if userDetails.conferenceSupervisor.length > 0 && userDetails.conferenceSupervisor.find((x) => x.conferenceId === data.conferenceData.id)}
							<a
								class="btn"
								href="/management/{data.conferenceData
									.id}/supervisors?id={userDetails.conferenceSupervisor.find(
									(x) => x.conferenceId === data.conferenceData.id
								)!.id}"
							>
								{m.supervisor()}
								<i class="fa-duotone fa-arrow-up-right-from-square"></i>
							</a>
						{/if}
					</div>
				{:else}
					<div class="skeleton h-12"></div>
				{/if}
			</div>
		</div>

		<button class="btn absolute top-4 right-4" onclick={onClose} aria-label="Close">
			<i class="fa-duotone fa-xmark"></i>
		</button>
	</div>
</Drawer>
