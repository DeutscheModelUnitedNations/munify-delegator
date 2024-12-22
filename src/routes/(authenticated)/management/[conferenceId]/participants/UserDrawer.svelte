<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { UserRowData } from './types';
	import Drawer from '$lib/components/Drawer.svelte';
	import { graphql } from '$houdini';
	import type { UserDrawerQueryVariables } from './$houdini';
	import { find } from 'lodash';

	interface Props {
		user: UserRowData;
		conferenceId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { user, conferenceId, open = $bindable(false), onClose }: Props = $props();

	export const _UserDrawerQueryVariables: UserDrawerQueryVariables = () => {
		return {
			userId: user.id,
			conferenceId
		};
	};

	//TODO the types are broken here?
	const userQuery: any = graphql(`
		query UserDrawerQuery($userId: String!, $conferenceId: String!) @load {
			findUniqueUser(where: { id: $userId }) {
				id
				given_name
				family_name
				pronouns
				phone
				email
				street
				apartment
				zip
				country
				foodPreference
				gender
			}
			findManyDelegationMembers(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				delegation {
					id
				}
			}
			findManyConferenceSupervisors(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
			}
			findManySingleParticipants(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				id
			}
		}
	`);
</script>

<Drawer bind:open {onClose}>
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-thin uppercase">{m.adminUserCard()}</h3>
		<h2 class="rounded-md bg-base-300 p-2 text-3xl font-bold">
			<span class="capitalize">{$userQuery.data?.findUniqueUser?.given_name}</span>
			<span class="uppercase">{$userQuery.data?.findUniqueUser?.family_name}</span>
			{#if $userQuery.data?.findUniqueUser?.pronouns}
				<span class="text-sm font-normal">({$userQuery.data?.findUniqueUser?.pronouns})</span>
			{/if}
		</h2>
		<h3 class="text-sm font-thin">{user.id}</h3>
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
					<td class="text-center"><i class="fa-duotone fa-phone text-lg"></i></td>
					{#if $userQuery.data?.findUniqueUser?.phone}
						<td class="font-mono">
							<a
								class="cursor-pointer rounded-md bg-base-300 px-2 py-1 hover:underline"
								href={`tel:${$userQuery.data?.findUniqueUser?.phone}`}
								>{$userQuery.data?.findUniqueUser?.phone}</a
							>
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-envelope text-lg"></i></td>
					<td class="font-mono">
						<a
							class="cursor-pointer rounded-md bg-base-300 px-2 py-1 hover:underline"
							href={`mailto:${$userQuery.data?.findUniqueUser?.email}`}
						>
							{$userQuery.data?.findUniqueUser?.email}
						</a>
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-house text-lg"></i></td>
					{#if $userQuery.data?.findUniqueUser?.street}
						<td>
							{$userQuery.data?.findUniqueUser?.street}
							<br />
							{#if $userQuery.data?.findUniqueUser?.apartment}
								{$userQuery.data?.findUniqueUser?.apartment}
								<br />
							{/if}
							{$userQuery.data?.findUniqueUser?.zip}
							{user?.city}
							<br />
							<span class="uppercase"
								>{$userQuery.data?.findUniqueUser?.country &&
								$userQuery.data?.findUniqueUser?.country !== ''
									? $userQuery.data?.findUniqueUser?.country
									: 'N/A'}</span
							>
						</td>
					{:else}
						<td>N/A</td>
					{/if}
				</tr>
				<tr>
					<td class="text-center text-lg">
						{#if $userQuery.data?.findUniqueUser?.gender === 'f'}
							<i class="fa-duotone fa-venus"></i>
						{:else if $userQuery.data?.findUniqueUser?.gender === 'm'}
							<i class="fa-duotone fa-mars"></i>
						{:else if $userQuery.data?.findUniqueUser?.gender === 'd'}
							<i class="fa-duotone fa-question"></i>
						{:else}
							<i class="fa-duotone fa-dash"></i>
						{/if}
					</td>
					<td>
						{$userQuery.data?.findUniqueUser?.pronouns}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-birthday-cake text-lg"></i></td>
					{#if user?.birthday}
						<td>
							{new Date(user!.birthday!).toLocaleDateString('de', {
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
					{#if $userQuery.data?.findUniqueUser?.foodPreference === 'OMNIVORE'}
						<td><i class="fa-duotone fa-meat text-lg"></i></td>
						<td>{m.omnivore()}</td>
					{:else if $userQuery.data?.findUniqueUser?.foodPreference === 'VEGETARIAN'}
						<td><i class="fa-duotone fa-cheese-swiss text-lg"></i></td>
						<td>{m.vegetarian()}</td>
					{:else if $userQuery.data?.findUniqueUser?.foodPreference === 'VEGAN'}
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
		<div class="alert alert-info">
			<i class="fas fa-excavator"></i>
			{m.comingSoon()}
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<div class="card flex flex-col">
			<div class="flex flex-col gap-2">
				{#if $userQuery.data?.findManySingleParticipants && $userQuery.data?.findManySingleParticipants.length > 0 && $userQuery.data?.findManySingleParticipants[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/individuals?filter={$userQuery.data
							?.findManySingleParticipants[0].id}"
					>
						{m.individualApplication()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if $userQuery.data?.findManyDelegationMembers && $userQuery.data?.findManyDelegationMembers.length > 0 && $userQuery.data?.findManyDelegationMembers[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/delegations?filter={$userQuery.data
							?.findManyDelegationMembers[0].delegation.id}"
					>
						{m.delegation()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{:else if $userQuery.data?.findManyConferenceSupervisors && $userQuery.data?.findManyConferenceSupervisors.length > 0 && $userQuery.data?.findManyConferenceSupervisors[0]}
					<a
						class="btn"
						href="/management/{conferenceId}/supervisors?filter={$userQuery.data
							?.findManyConferenceSupervisors[0].id}"
					>
						{m.supervisor()}
						<i class="fa-duotone fa-arrow-up-right-from-square"></i>
					</a>
				{/if}
			</div>
		</div>
	</div>
</Drawer>
