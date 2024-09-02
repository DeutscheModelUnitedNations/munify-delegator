<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/Header.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName';
	import CountryStats from '$lib/components/countryStats/CountryStats.svelte';
	import PreConferenceStage from './DelegationPreConferenceStage.svelte';
	import RegistrationStage from './DelegationRegistrationStage.svelte';
	import type { Delegation } from '@prisma/client';
	import { apiClient, checkForError } from '$api/client';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();
	let api = apiClient({ origin: data.url.origin });

	const delegationMembership = data.userData.delegationMemberships?.find(
		(x) => x.conference.id === data.conferenceId
	)
	const delegationId = delegationMembership?.delegation.id;
	const userIsHeadDelegate = !!delegationMembership?.isHeadDelegate;

	let delegationData = $state<any | null>(null);

	onMount(async () => {
		delegationData = await checkForError(api.delegation({ id: delegationId }).get());
	});

	const stats = $derived([
		{
			icon: 'users',
			title: 'Mitglieder',
			value: delegationData?.members?.length,
			desc: 'in der Delegation'
		},
		{
			icon: 'list-check',
			title: 'Aufgaben',
			value: '80%',
			desc: 'erledigt'
		},
		{
			icon: 'chart-pie',
			title: 'Statistik',
			value: '1,200',
			desc: 'ohne Aussagekraft'
		}
	]);

	let testData = {
		munbw25: {
			application: {
				countries: ['de', 'gb', 'fi', 'cz', 'ie', 'cl', 'co'],
				todo: [
					{
						title: 'Delegation erstellen',
						completed: true
					},
					{
						title: 'Mitglieder einladen',
						completed: true
					},
					{
						title: 'Bewerbungsfragen beantworten',
						completed: false
					},
					{
						title: 'Vertretungswünsche auswählen',
						completed: true
					}
				]
			}
		},
		munsh25: {
			stats: [
				{
					icon: 'users',
					title: 'Mitglieder',
					value: '3',
					desc: 'in der Delegation'
				},
				{
					icon: 'flag',
					title: 'Zahl',
					value: '7',
					desc: 'ohne Bedeutung'
				},
				{
					icon: 'chart-pie',
					title: 'Statistik',
					value: '1,200',
					desc: 'ohne Aussagekraft'
				}
			]
		}
	};
</script>

<section role="alert" class="alert alert-warning w-full">
	<i class="fas fa-exclamation-triangle text-3xl"></i>
	<div class="flex flex-col">
		<p class="font-bold">Wichtig: Online-Anmeldung abschließen</p>
		<p class="mt-2">
			Du hast zwar bereits eine Delegation erstellt bzw. bist einer Delegation beigetreten, aber die
			Anmeldung ist noch nicht abgeschlossen. Bitte schließe die Anmeldung rechtzeitig vor
			Anmeldeschluss ab, sodass wir die Anmeldung deiner Delegation berücksichtigen können.
		</p>
	</div>
</section>
<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">Delegationsstatus</h2>
	<GenericWidget content={stats} />
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">Delegationsmitglieder</h2>
	{#if delegationData?.members}
		<DelegationStatusTableWrapper>
			{#each delegationData.members as member}
				<DelegationStatusTableEntry
					name={`${member.user.given_name} ${member.user.family_name}`}
					headDelegate={member.isHeadDelegate}
				/>
			{/each}
		</DelegationStatusTableWrapper>
	{:else}
		<div class="skeleton w-full h-60"></div>
	{/if}
</section>

<section>
	<h2 class="text-2xl font-bold mb-2">Bewerbung</h2>
	<div class="flex flex-col md:flex-row gap-4">
		<div class="flex-1 card bg-base-100 shadow-md p-4">
			<h3 class="text-xl">Informationen und Motivation</h3>
		</div>
		<div class="flex-1 card bg-base-100 shadow-md p-4">
			<h3 class="text-xl">Vertretungswünsche</h3>
			<table class="table">
				<thead>
					<tr>
						<th class="text-center"><i class="fa-duotone fa-hashtag"></i></th>
						<th class="text-center"><i class="fa-duotone fa-flag"></i></th>
						<th><i class="fa-duotone fa-text"></i></th>
						<th class="text-center"><i class="fa-duotone fa-users"></i></th>
					</tr>
				</thead>
				<tbody>
					{#each testData.munbw25.application.countries as country, index}
						<tr>
							<td class="text-center">{index + 1}</td>
							<td class="text-center"><Flag countryCode={country} size="xs" /></td>
							<td class="w-full">{countryCodeToLocalName(country, 'de')}</td>
							<td class="center">3</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<button class="btn btn-primary mt-4">Wünsche anpassen</button>
		</div>
	</div>
	<div class="card bg-base-100 shadow-md p-4 mt-4">
		<h3 class="text-xl">Anmeldung abschließen</h3>
		<p>Bitte schließe alle Aufgaben ab und bestätige dann deine Anmeldung zur Delegation.</p>
		<table class="table">
			<thead>
				<tr>
					<th class="text-center"></th>
					<th class="w-full"></th>
					<th class="text-right"></th>
				</tr></thead
			>
			<tbody>
				{#each testData.munbw25.application.todo as todo}
					<tr>
						<td>
							{#if todo.completed}
								<i class="fas fa-square-check text-2xl text-primary"></i>
							{:else}
								<i class="fas fa-square text-2xl text-error"></i>
							{/if}
						</td>
						<td>{todo.title}</td>
						<td>
							<button class="btn btn-circle btn-sm"><i class="fad fa-question"></i></button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<button class="btn btn-warning mt-4" disabled>Anmeldung abschließen</button>
	</div>
</section>
<section>
	<h2 class="text-2xl font-bold mb-4">{m.dangerZone()}</h2>
	<div class="flex flex-col gap-2">
		<button class="btn btn-warning">{m.leaveDelegation()}</button>
		{#if userIsHeadDelegate}
			<button class="btn btn-error">{m.transferHeadDelegateship()}</button>
			<button class="btn btn-error">{m.deleteDelegation()}</button>
		{/if}
	</div>
</section>
