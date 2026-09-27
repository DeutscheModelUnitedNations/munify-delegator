<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { openUserCard } from '../userCardState.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import codenmz from '$lib/helpers/codenamize';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		conferenceSupervisor: {
			id: string;
			plansOwnAttendenceAtConference: boolean;
			connectionCode: string;
		};
		onUpdate?: () => void;
	}

	let { userId, conferenceId, conferenceSupervisor, onUpdate }: Props = $props();

	const copyConnectionCode = async () => {
		await navigator.clipboard.writeText(conferenceSupervisor.connectionCode);
		toast.success(m.codeCopied());
	};

	const studentSelection = { id: true, givenName: true, familyName: true } as const;

	function fetchSupervisedStudents() {
		return client.query.conferenceSupervisors({
			__args: {
				where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } }
			},
			id: true,
			supervisedDelegationMembers: {
				id: true,
				isHeadDelegate: true,
				user: studentSelection,
				delegation: {
					id: true,
					school: true,
					entryCode: true,
					applied: true,
					members: { id: true },
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: { name: true, abbreviation: true, fontAwesomeIcon: true }
				},
				assignedCommittee: { id: true, abbreviation: true }
			},
			supervisedSingleParticipants: {
				id: true,
				applied: true,
				user: studentSelection,
				school: true,
				assignedRole: { id: true, name: true }
			}
		});
	}

	let loadedSupervisors = $state<Awaited<ReturnType<typeof fetchSupervisedStudents>>>();
	let studentsLoading = $state(false);

	$effect(() => {
		studentsLoading = true;
		void fetchSupervisedStudents()
			.then((result) => {
				loadedSupervisors = result;
			})
			.finally(() => {
				studentsLoading = false;
			});
	});

	const supervisor = $derived(loadedSupervisors?.[0]);
	const delegationMembers = $derived(supervisor?.supervisedDelegationMembers ?? []);
	const singleParticipants = $derived(supervisor?.supervisedSingleParticipants ?? []);

	// Group delegation members by their delegation
	const groupedDelegations = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- temporary grouping, not reactive state
		const map = new Map<
			string,
			{
				delegation: (typeof delegationMembers)[number]['delegation'];
				members: typeof delegationMembers;
			}
		>();
		for (const member of delegationMembers) {
			const existing = map.get(member.delegation.id);
			if (existing) {
				existing.members.push(member);
			} else {
				map.set(member.delegation.id, {
					delegation: member.delegation,
					members: [member]
				});
			}
		}
		// Sort members within each group by family name
		for (const group of map.values()) {
			group.members.sort((a, b) =>
				(a.user.familyName ?? '').localeCompare(b.user.familyName ?? '')
			);
		}
		return [...map.values()];
	});

	const changeAttendance = async (plansOwnAttendenceAtConference: boolean) => {
		const promise = client.mutate.updateConferenceSupervisor({
			__args: { id: conferenceSupervisor.id, plansOwnAttendenceAtConference },
			id: true,
			plansOwnAttendenceAtConference: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		onUpdate?.();
	};

	const rotateCode = async () => {
		if (!confirm(m.confirmRotateCode())) return;
		const promise = client.mutate.rotateSupervisorConnectionCode({
			__args: { id: conferenceSupervisor.id },
			id: true,
			connectionCode: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		onUpdate?.();
	};
</script>

<div class="flex flex-col gap-6">
	<!-- Supervisor Info Card -->
	<div class="bg-base-200 rounded-lg p-4">
		<div class="flex flex-col gap-1 text-sm">
			<div class="flex items-center gap-1">
				<span class="text-base-content/60">{m.connectionCode()}:</span>
				<button
					class="group cursor-pointer font-mono transition-colors"
					onclick={copyConnectionCode}
					title={m.copy()}
				>
					<code class="bg-base-300 rounded px-1 group-hover:bg-base-content/20"
						>{conferenceSupervisor.connectionCode}</code
					>
				</button>
			</div>
			<div class="flex items-center gap-1">
				<span class="text-base-content/60">{m.attendancePlan()}:</span>
				{#if conferenceSupervisor.plansOwnAttendenceAtConference}
					<span class="badge badge-sm badge-success">
						<i class="fa-solid fa-location-check"></i>
						{m.supervisorPlansOwnAttendance()}</span
					>
				{:else}
					<span class="badge badge-sm badge-info">
						<i class="fa-solid fa-cloud"></i>
						{m.supervisorDoesNotPlanOwnAttendance()}</span
					>
				{/if}
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex flex-wrap items-center gap-4">
		<button class="btn btn-sm" onclick={rotateCode}>
			<i class="fa-duotone fa-arrow-rotate-left"></i>
			{m.rotateCode()}
		</button>
		<label class="flex items-center gap-2 cursor-pointer">
			<input
				type="checkbox"
				class="toggle toggle-success"
				checked={conferenceSupervisor.plansOwnAttendenceAtConference}
				onchange={() => changeAttendance(!conferenceSupervisor.plansOwnAttendenceAtConference)}
			/>
			<span class="text-sm">{m.attendancePlan()}</span>
		</label>
	</div>

	<!-- Students list -->
	{#if studentsLoading}
		<div class="flex flex-col gap-3">
			<div class="skeleton h-24 w-full"></div>
			<div class="skeleton h-24 w-full"></div>
		</div>
	{:else if delegationMembers.length === 0 && singleParticipants.length === 0}
		<div class="alert alert-info">
			<i class="fa-duotone fa-graduation-cap"></i>
			<span>{m.userCardNoStudents()}</span>
		</div>
	{:else}
		{#if groupedDelegations.length > 0}
			<div>
				<div class="divider"></div>
				<h3 class="mb-2 text-lg font-bold">
					{m.delegations()}
				</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<tbody>
							{#each groupedDelegations as group}
								<!-- Delegation header row -->
								<tr class="bg-base-200/50">
									<td>
										{#if group.delegation.applied}
											<i class="fa-solid fa-circle-check text-success"></i>
										{:else}
											<i class="fa-solid fa-hourglass-half text-error"></i>
										{/if}
									</td>
									<td>
										<div class="flex items-center gap-2">
											{#if group.delegation.assignedNation}
												<Flag alpha2Code={group.delegation.assignedNation.alpha2Code} size="xs" />
											{:else if group.delegation.assignedNonStateActor}
												<Flag
													nsa
													icon={group.delegation.assignedNonStateActor.fontAwesomeIcon ??
														'fa-hand-point-up'}
													size="xs"
												/>
											{/if}
											<div class="flex flex-col">
												<div>
													<span class="font-bold">{codenmz(group.delegation.id)}</span>
													{#if group.delegation.assignedNation}
														<span class="text-base-content/60 text-xs"
															>({getFullTranslatedCountryNameFromISO3Code(
																group.delegation.assignedNation.alpha3Code
															)})</span
														>
													{:else if group.delegation.assignedNonStateActor}
														<span class="text-base-content/60 text-xs"
															>({group.delegation.assignedNonStateActor.name})</span
														>
													{/if}
												</div>
												{#if group.delegation.school}
													<span class="text-base-content/60 text-xs">{group.delegation.school}</span
													>
												{/if}
											</div>
										</div>
									</td>
									<td>
										<code class="bg-base-300 rounded px-1 text-xs font-mono"
											>{group.delegation.entryCode}</code
										>
									</td>
									<td>
										<span class="badge badge-sm"
											>{group.delegation.members.length}
											{m.delegationMembers()}</span
										>
									</td>
									<td></td>
								</tr>
								<!-- Nested member rows -->
								{#each group.members as member (member.id)}
									<tr class="text-sm">
										<td class="text-right">
											<i class="fa-duotone fa-arrow-turn-down-right text-base-content/40"></i>
										</td>
										<td colspan="2">
											<span class="capitalize">{member.user.givenName}</span>
											<span class="uppercase">{member.user.familyName}</span>
											{#if member.isHeadDelegate}
												<span class="badge badge-accent badge-xs ml-1"
													><i class="fa-solid fa-medal"></i>
													{m.headDelegate()}</span
												>
											{/if}
										</td>
										<td>
											{member.assignedCommittee?.abbreviation ?? ''}
										</td>
										<td>
											<button
												class="btn btn-ghost btn-xs btn-square"
												onclick={() => openUserCard(member.user.id, conferenceId)}
												title={formatNames(
													member.user.givenName ?? undefined,
													member.user.familyName ?? undefined,
													{
														givenNameFirst: true
													}
												)}
											>
												<i class="fa-duotone fa-id-card"></i>
											</button>
										</td>
									</tr>
								{/each}
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		{#if singleParticipants.length > 0}
			<div>
				<div class="divider"></div>
				<h3 class="mb-2 text-lg font-bold">
					{m.adminSingleParticipants()}
				</h3>
				<div class="overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th></th>
								<th>{m.name()}</th>
								<th>{m.schoolOrInstitution()}</th>
								<th>{m.assignedRole()}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each singleParticipants.toSorted( (a, b) => (a.user.familyName ?? '').localeCompare(b.user.familyName ?? '') ) as participant (participant.id)}
								<tr>
									<td>
										{#if participant.applied}
											<i class="fa-solid fa-circle-check text-success"></i>
										{:else}
											<i class="fa-solid fa-hourglass-half text-error"></i>
										{/if}
									</td>
									<td>
										<span class="capitalize">{participant.user.givenName}</span>
										<span class="uppercase">{participant.user.familyName}</span>
									</td>
									<td>{participant.school ?? 'N/A'}</td>
									<td>{participant.assignedRole?.name ?? 'N/A'}</td>
									<td>
										<button
											class="btn btn-ghost btn-xs btn-square"
											onclick={() => openUserCard(participant.user.id, conferenceId)}
											title={formatNames(
												participant.user.givenName ?? undefined,
												participant.user.familyName ?? undefined,
												{ givenNameFirst: true }
											)}
										>
											<i class="fa-duotone fa-id-card"></i>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
