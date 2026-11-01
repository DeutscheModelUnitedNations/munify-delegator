<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import codenamize from '#lib/helpers/codenamize';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import CountryStats from '#lib/components/countryStats/CountryStats.svelte';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import DelegationMembersStatusSection from './DelegationMembersStatusSection.svelte';
	import { splitRole } from '#lib/helpers/conferenceRole';

	interface Props {
		conferenceId: string;
		delegationMember: NonNullable<MyConferenceParticipation['delegationMember']>;
	}

	let { conferenceId, delegationMember }: Props = $props();

	const assignedRole = $derived(splitRole(delegationMember.delegation.assignedRole));
	const assignedNation = $derived(assignedRole.nation);
	const assignedRoleId = $derived(delegationMember.delegation.assignedRole?.id);
	// A primitive, so the queries below only run again when the delegation actually changes rather
	// than on every live update of the membership they were handed.
	const delegationId = $derived(delegationMember.delegation.id);

	const [delegation, conference] = $derived(
		await Promise.all([
			client.liveQuery.delegation({
				__args: { id: delegationId },
				members: { id: true, assignedCommittee: { id: true } }
			}),
			client.liveQuery.conference({
				__args: { id: conferenceId },
				committees: {
					id: true,
					name: true,
					numOfSeatsPerDelegation: true,
					roles: { id: true }
				}
			})
		])
	);

	const nonStateActor = $derived(assignedRole.nonStateActor);
	const roleName = $derived(
		nonStateActor?.name ??
			(assignedNation
				? getFullTranslatedCountryNameFromISO3Code(assignedNation.alpha3Code)
				: undefined)
	);
	const committees = $derived(
		assignedNation
			? conference.committees.filter((c) => c.roles.some((role) => role.id === assignedRoleId))
			: []
	);
</script>

<DashboardSection
	icon="chart-line"
	title={m.delegationStatus()}
	description={m.delegationStatusDescription()}
>
	<div class="card bg-base-200 shadow">
		<div class="card-body gap-6 lg:flex-row lg:items-center">
			<div class="flex flex-1 flex-col items-start gap-6 sm:flex-row sm:items-center">
				{#if assignedNation || nonStateActor}
					<Flag
						alpha2Code={assignedNation?.alpha2Code}
						nsa={!!nonStateActor}
						icon={nonStateActor?.fontAwesomeIcon ?? 'globe'}
						size="lg"
					/>
				{/if}
				<div class="flex min-w-0 flex-col gap-2">
					<span class="text-base-content/60 text-sm">{m.youWillRepresent()}</span>
					<h3 class="text-3xl font-bold break-words sm:text-4xl">{roleName ?? '–'}</h3>
					<div class="flex flex-wrap gap-2">
						{#each committees as committee (committee.id)}
							<span class="badge badge-primary badge-soft">
								{committee.name}{committee.numOfSeatsPerDelegation !== 1
									? ` × ${committee.numOfSeatsPerDelegation}`
									: ''}
							</span>
						{/each}
						{#if nonStateActor}
							<span class="badge badge-primary badge-soft">
								{nonStateActor.seatAmount}
								{m.seats()}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<dl
				class="border-base-300 grid grid-cols-2 gap-4 border-t pt-4 lg:w-80 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
			>
				<div class="flex items-center gap-3">
					<i class="fa-sharp-duotone fa-solid fa-users text-base-content/50 text-xl"></i>
					<div class="flex flex-col">
						<dt class="text-base-content/60 text-xs">{m.members()}</dt>
						<dd class="font-semibold">{delegation.members.length}</dd>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<i class="fa-sharp-duotone fa-solid fa-signature text-base-content/50 text-xl"></i>
					<div class="flex min-w-0 flex-col">
						<dt class="text-base-content/60 text-xs">{m.delegationName()}</dt>
						<dd class="font-semibold break-words" title={m.delegationNameExplanation()}>
							{codenamize(delegationId)}
						</dd>
					</div>
				</div>
			</dl>
		</div>
	</div>
</DashboardSection>

<DelegationMembersStatusSection {conferenceId} {delegationId} />

<SupervisorTable delegationMemberId={delegationMember.id} {conferenceId} />

{#if assignedNation}
	<DashboardSection
		icon="globe"
		title={m.informationOnYourCountry()}
		description={m.informationOnYourCountryDescription()}
	>
		<CountryStats countryCode={assignedNation.alpha3Code} />
	</DashboardSection>
{:else if assignedRole.nonStateActor}
	{@const nsa = assignedRole.nonStateActor}
	<DashboardSection
		icon="building-ngo"
		title={m.informationOnYourNSA()}
		description={m.informationOnYourNSADescription()}
	>
		<div class="prose">
			<h3 class="font-bold">{nsa.name}</h3>
			<p>{nsa.description}</p>
		</div>
	</DashboardSection>
{/if}
