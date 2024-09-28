<script lang="ts">
	import Drawer from 'svelte-drawer-component';
	import { apiClient, checkForError } from '$api/client';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import type {
		Delegation,
		DelegationMember,
		ConferenceSupervisor,
		RoleApplication,
		Nation,
		NonStateActor
	} from '@prisma/client';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName';

	type DelegationDataWithCount = Delegation & {
		_count: {
			members: number;
			supervisors: number;
			appliedForRoles: number;
		};
	};

	interface Props {
		delegation: DelegationDataWithCount | null;
		onClose: () => void;
		data: PageData;
	}

	let { delegation, onClose, data }: Props = $props();

	let api = apiClient({ origin: data.url.origin });

	let roleApplications = $state<
		| (RoleApplication & {
				nation: Nation | null;
				nonStateActor: NonStateActor | null;
		  })[]
		| null
	>(null);

	let members = $state<
		| (DelegationMember & {
				user: {
					id: string;
					given_name: string;
					family_name: string;
				};
		  })[]
		| null
	>(null);

	let supervisors = $state<
		| (ConferenceSupervisor & {
				user: {
					id: string;
					given_name: string;
					family_name: string;
				};
		  })[]
		| null
	>(null);

	$effect(() => {
		roleApplications = null;
		if (delegation) {
			checkForError(api.roleApplication.get({ query: { delegationId: delegation.id } })).then(
				(res) => {
					roleApplications = res;
				}
			);
		}
	});

	$effect(() => {
		members = null;
		if (delegation) {
			checkForError(api.delegationMember.get({ query: { delegationId: delegation.id } })).then(
				(res) => {
					members = res;
				}
			);
		}
	});

	$effect(() => {
		supervisors = null;
		if (delegation) {
			checkForError(api.conferenceSupervisor.get({ query: { delegationId: delegation.id } })).then(
				(res) => {
					supervisors = res;
				}
			);
		}
	});
</script>

<Drawer open={delegation != null} size="600px" placement="right" on:clickAway={onClose}>
	<div class="flex flex-col p-10 bg-base-100 min-h-full gap-8">
		<div class="flex flex-col gap-2">
			<h3 class="text-xl uppercase font-thin">{m.delegation()}</h3>
			<h2 class="text-3xl font-bold p-2 bg-base-300 rounded-md">
				{delegation?.entryCode}
			</h2>
			<h3 class="text-sm font-thin">{delegation?.id}</h3>
		</div>

		{#if delegation?.applied}
			<div class="alert alert-success">
				<i class="fas fa-check"></i>
				{m.registrationCompleted()}
			</div>
		{:else}
			<div class="alert alert-warning">
				<i class="fas fa-hourglass-half"></i>
				{m.registrationNotCompleted()}
			</div>
		{/if}

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
						<td class="text-center"><i class="fa-duotone fa-qrcode text-lg"></i></td>
						<td class="font-mono">
							{delegation?.entryCode}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
						<td>
							{delegation?.school}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
						<td>
							{delegation?.motivation}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
						<td>
							{delegation?.experience}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-flag text-lg"></i></td>
						<td>
							<span class="bg-base-300 py-[2px] px-3 mr-1 rounded-md"
								>{delegation?._count.appliedForRoles}</span
							>
							{#if roleApplications}
								{roleApplications
									.map((x) => {
										if (x.nation) return countryCodeToLocalName(x.nation.alpha3Code);
										if (x.nonStateActor) return x.nonStateActor.name;
										return 'N/A';
									})
									.join(', ')}
							{:else}
								<div class="loading loading-dots loading-xs"></div>
							{/if}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="flex flex-col gap-2">
			<h3 class="text-xl font-bold">{m.delegationMembers()}</h3>
			{#if !members}
				<div class="skeleton h-12"></div>
			{:else if members.length === 0}
				<div class="alert alert-warning">
					<i class="fa-solid fa-info-circle"></i>
					{m.noMembersFound()}
				</div>
			{:else}
				<table class="table">
					<thead>
						<tr>
							<th></th>
							<th class="w-full"></th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each members as member}
							<tr>
								<td>
									{#if member.isHeadDelegate}
										<i class="fa-duotone fa-medal text-lg"></i>
									{/if}
								</td>
								<td>
									<span class="capitalize">{member.user.given_name}</span>
									<span class="uppercase">{member.user.family_name}</span>
								</td>
								<td>
									<a
										class="btn btn-sm"
										href="/management/{data.conferenceData.id}/participants?id={member.user.id}"
										aria-label="Details"
									>
										<i class="fa-duotone fa-arrow-up-right-from-square"></i>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<div class="flex flex-col gap-2">
			<h3 class="text-xl font-bold">{m.supervisors()}</h3>

			{#if !supervisors}
				<div class="skeleton h-12"></div>
			{:else if supervisors.length === 0}
				<div class="alert alert-info">
					<i class="fa-solid fa-user-slash"></i>
					{m.noSupervisors()}
				</div>
			{:else}
				<table class="table">
					<thead>
						<tr>
							<th></th>
							<th class="w-full"></th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each supervisors! as supervisor}
							<tr>
								<td>
									{#if supervisor.plansOwnAttendenceAtConference}
										<i class="fa-duotone fa-location-check text-lg"></i>
									{:else}
										<i class="fa-duotone fa-cloud text-lg"></i>
									{/if}
								</td>
								<td>
									<span class="capitalize">{supervisor.user.given_name}</span>
									<span class="uppercase">{supervisor.user.family_name}</span>
								</td>
								<td>
									<a
										class="btn btn-sm"
										href="/management/{data.conferenceData.id}/supervisors?id={supervisor.id}"
										aria-label="Details"
									>
										<i class="fa-duotone fa-arrow-up-right-from-square"></i>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<div class="flex flex-col gap-2">
			<h3 class="text-xl font-bold">{m.adminActions()}</h3>
			<button
				class="btn"
				onclick={async () => {
					if (!confirm('Willst du wirklich den Einladecode rotieren?')) return;
					await checkForError(api.delegation({ id: delegation!.id }).resetEntryCode.patch());
					// TODO: Fix this, so that the page does not need to be reloaded. invalidateAll() does not work.
					alert('Neuladen der Seite erforderlich, um die Änderungen zu sehen.');
				}}
			>
				<i class="fa-duotone fa-arrow-rotate-left"></i>
				{m.rotateCode()}
			</button>
			{#if delegation?.applied}
				<button
					class="btn"
					onclick={async () => {
						if (!confirm('Willst du wirklich den Bewerbungsstatus zurücksetzen?')) return;
						await checkForError(api.delegation({ id: delegation!.id }).revokeApplication.patch());
						// TODO: Fix this, so that the page does not need to be reloaded. invalidateAll() does not work.
						alert('Neuladen der Seite erforderlich, um die Änderungen zu sehen.');
					}}
				>
					<i class="fa-duotone fa-file-slash"></i>
					{m.revokeApplication()}
				</button>
			{/if}
		</div>

		<button class="btn absolute top-4 right-4" onclick={onClose} aria-label="Close">
			<i class="fa-duotone fa-xmark"></i>
		</button>
	</div>
</Drawer>
