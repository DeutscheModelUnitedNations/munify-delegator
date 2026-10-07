<script lang="ts">
	import {
		distinctSupervisors,
		memberSummary,
		type delegationApplication
	} from '$lib/assignment/sighting';
	import { resolve } from '$app/paths';
	import Flag from '$lib/components/Flag.svelte';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import ApplicationText from './ApplicationText.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import PersonLine from './PersonLine.svelte';

	/** Who applied in a first row (members, school and supervisors linking to their management pages, wishes), what they wrote below. */
	interface Props {
		conferenceId: string;
		application: ReturnType<typeof delegationApplication>;
		startConference: Date | string;
	}

	let { conferenceId, application, startConference }: Props = $props();

	const supervisors = $derived(distinctSupervisors(application.supervisors, formatNames));

	const summary = $derived(memberSummary(application.people, startConference));

	const managementPage = (page: 'supervisors' | 'delegations') =>
		page === 'supervisors'
			? resolve('/(authenticated)/dashboard/[conferenceId]/management/supervisors', {
					conferenceId
				})
			: resolve('/(authenticated)/dashboard/[conferenceId]/management/delegations', {
					conferenceId
				});

	/** The delegations table, searched for the school. */
	const schoolHref = $derived(
		`${managementPage('delegations')}?${new URLSearchParams({ filter: application.school ?? '' })}`
	);
</script>

<div class="grid gap-x-8 gap-y-6 lg:grid-cols-3">
	<table class="table table-sm">
		<thead>
			<tr>
				<th>{m.members()} <span class="badge badge-xs">{application.people.length}</span></th>
				<th class="text-right">{m.assignmentAge()}</th>
				<th class="text-center"><i class="fa-duotone fa-venus-mars"></i></th>
				<th class="text-right" title={m.assignmentPreviousParticipations()}>
					<i class="fa-duotone fa-rotate-left"></i>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each application.people as person (person.id)}
				<PersonLine {person} {startConference} />
			{/each}
		</tbody>
		<tfoot>
			<tr class="text-base-content/70">
				<th></th>
				<td class="text-right tabular-nums" title={m.assignmentAverageAge()}>
					<span class="mr-1 opacity-60" aria-hidden="true">Ø</span>{summary.averageAge === undefined
						? '?'
						: Math.round(summary.averageAge * 10) / 10}
				</td>
				<td></td>
				<td class="text-right tabular-nums" title={m.assignmentPreviousParticipations()}>
					{summary.participations}
				</td>
			</tr>
		</tfoot>
	</table>

	<div class="flex flex-col gap-4">
		<section class="flex flex-col gap-1">
			<h4 class="text-base-content/70 flex items-center gap-2 text-sm font-semibold">
				<i class="fa-duotone fa-school"></i>
				{m.schoolOrInstitution()}
			</h4>
			{#if application.school}
				<a class="link link-hover cursor-pointer font-medium" href={schoolHref}>
					{application.school}
				</a>
			{:else}
				<p class="text-base-content/60">{m.assignmentNoSchool()}</p>
			{/if}
		</section>

		{#if supervisors.length > 0}
			<section class="flex flex-col gap-1">
				<h4 class="text-base-content/70 flex items-center gap-2 text-sm font-semibold">
					<i class="fa-duotone fa-chalkboard-user"></i>
					{m.supervisors()}
				</h4>
				<ul class="flex flex-col gap-0.5">
					{#each supervisors as supervisor (supervisor.id)}
						<li>
							<button
								type="button"
								class="link link-hover cursor-pointer font-medium"
								onclick={() => openUserCard(supervisor.userId)}
							>
								{supervisor.name}
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<section class="flex flex-col gap-2">
		<h4 class="text-base-content/70 flex items-center gap-2 text-sm font-semibold">
			<i class="fa-duotone fa-flag"></i>
			{m.assignmentWishes()}
		</h4>
		{#if application.wishes.length > 0}
			<ol class="flex flex-col gap-1">
				{#each application.wishes as wish, index (index)}
					<li class="flex items-center gap-3">
						<span class="text-base-content/50 w-4 text-right font-bold tabular-nums">
							{index + 1}
						</span>
						{#if wish.alpha2Code}
							<Flag size="xs" alpha2Code={wish.alpha2Code} />
						{:else}
							<Flag size="xs" nsa icon={wish.icon} />
						{/if}
						<span class="font-medium">{wish.name}</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="text-base-content/60">{m.assignmentNoWishes()}</p>
		{/if}
	</section>

	<div class="grid gap-x-8 gap-y-5 lg:col-span-3 lg:grid-cols-2">
		<ApplicationText
			icon="fire-flame-curved"
			label={m.motivation()}
			text={application.motivation}
		/>
		<ApplicationText icon="compass" label={m.experience()} text={application.experience} />
	</div>
</div>
