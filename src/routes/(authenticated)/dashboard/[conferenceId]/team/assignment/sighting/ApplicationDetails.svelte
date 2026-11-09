<script lang="ts">
	import {
		distinctSupervisors,
		memberSummary,
		type delegationApplication,
		type SightingReview
	} from './sighting';
	import Flag from '#lib/components/Flag.svelte';
	import formatNames from '#lib/helpers/formatNames';
	import { m } from '#lib/paraglide/messages';
	import ApplicationText from './ApplicationText.svelte';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import PersonLine from './PersonLine.svelte';
	import { resolve } from '$app/paths';

	/** Who applied in a first row (members, school, supervisors, wishes), what they wrote below. */
	interface Props {
		application: ReturnType<typeof delegationApplication>;
		startConference: Date | string;
		kind: 'delegation' | 'single';
		review: SightingReview | undefined;
		/** Changes the review; shown at once */
		onReview: (change: Partial<SightingReview>) => void;
		/** For the links to the schools' pages */
		conferenceId: string;
	}

	let { application, startConference, kind, review, onReview, conferenceId }: Props = $props();

	/** Prioritizes a wish, or takes the priority back from the one that has it. */
	const togglePriority = (roleId: string) =>
		onReview({ prioritizedRoleId: review?.prioritizedRoleId === roleId ? null : roleId });

	const supervisors = $derived(
		distinctSupervisors({ supervisors: application.supervisors, format: formatNames })
	);

	const summary = $derived(memberSummary({ people: application.people, startConference }));
</script>

<div class="grid gap-x-8 gap-y-6 {kind === 'delegation' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}">
	{#if kind === 'delegation'}
		<table class="table table-sm">
			<thead>
				<tr>
					<th>{m.members()} <span class="badge badge-xs">{application.people.length}</span></th>
					<th class="text-right">{m.assignmentAge()}</th>
					<th class="text-center"><i class="ph-duotone ph-gender-intersex"></i></th>
					<th class="text-right" title={m.assignmentPreviousParticipations()}>
						<i class="ph-duotone ph-arrow-counter-clockwise"></i>
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
						<span class="mr-1 opacity-60" aria-hidden="true">Ø</span>{summary.averageAge ===
						undefined
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
	{/if}

	<div class="flex flex-col gap-4">
		<section class="flex flex-col gap-1">
			<h4 class="text-base-content/70 flex items-center gap-2 text-sm font-semibold">
				<i class="ph-duotone ph-graduation-cap"></i>
				{m.schoolOrInstitution()}
			</h4>
			{#if application.schools.length > 0}
				<ul class="flex flex-col gap-0.5">
					{#each application.schools as school (school.id)}
						<li>
							<a
								class="link link-hover font-medium"
								href={resolve(`dashboard/${conferenceId}/team/schools/${school.id}`)}
							>
								{school.name}
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-base-content/60">{m.assignmentNoSchool()}</p>
			{/if}
		</section>

		{#if supervisors.length > 0}
			<section class="flex flex-col gap-1">
				<h4 class="text-base-content/70 flex items-center gap-2 text-sm font-semibold">
					<i class="ph-duotone ph-chalkboard-teacher"></i>
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
			<i class="ph-duotone ph-flag"></i>
			{m.assignmentWishes()}
		</h4>
		{#if application.wishes.length > 0}
			<!-- A delegation ranks its wishes; a single application does not, so no numbers there. -->
			<ol class="flex flex-col gap-1">
				{#each application.wishes as wish, index (index)}
					{@const prioritized = review?.prioritizedRoleId === wish.roleId}
					<li class="group flex items-center gap-3">
						{#if kind === 'delegation'}
							<span class="text-base-content/50 w-4 text-right font-bold tabular-nums">
								{index + 1}
							</span>
						{/if}
						{#if wish.alpha2Code}
							<Flag size="xs" alpha2Code={wish.alpha2Code} />
						{:else}
							<Flag size="xs" nsa icon={wish.icon} />
						{/if}
						<span class="font-medium">{wish.name}</span>
						<button
							type="button"
							class="btn btn-ghost btn-xs btn-square {prioritized
								? 'text-primary'
								: 'opacity-30 group-hover:opacity-100 focus-visible:opacity-100'}"
							aria-pressed={prioritized}
							aria-label={prioritized ? m.assignmentPrioritized() : m.assignmentPrioritize()}
							title={prioritized ? m.assignmentPrioritized() : m.assignmentPrioritize()}
							onclick={() => togglePriority(wish.roleId)}
						>
							<i class="ph-duotone ph-target"></i>
						</button>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="text-base-content/60">{m.assignmentNoWishes()}</p>
		{/if}
	</section>

	<div
		class="grid gap-x-8 gap-y-5 {kind === 'delegation'
			? 'lg:col-span-3'
			: 'lg:col-span-2'} lg:grid-cols-2"
	>
		<ApplicationText icon="fire" label={m.motivation()} text={application.motivation} />
		<ApplicationText icon="compass" label={m.experience()} text={application.experience} />
	</div>
</div>
