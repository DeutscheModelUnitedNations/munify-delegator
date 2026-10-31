<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { schoolSummary } from './schoolMetrics';

	/** How many people from the school took part in each conference, and how it went for them. */
	interface Props {
		schoolId: string;
		/** The conference the page belongs to, highlighted in the table */
		conferenceId: string;
	}

	let { schoolId, conferenceId }: Props = $props();

	const metrics = $derived(
		await client.query.schoolMetrics({
			__args: { schoolId },
			conferenceId: true,
			conferenceTitle: true,
			startConference: true,
			delegations: true,
			participants: true,
			applied: true,
			seated: true,
			attended: true,
			supervisors: true,
			waitingList: true,
			fromWaitingList: true
		})
	);
	// one plain copy, read once
	const rows = $derived(metrics.slice());

	// The school's page in another conference is participant care's there, so only those link
	const user = await getCurrentUser();
	const careRows = await client.query.teamMembers({
		__args: {
			// `role` is a plain enum in the filter, so each alternative repeats the scope
			where: { OR: PARTICIPANT_CARE_ROLES.map((role) => ({ role, userId: { eq: user.sub } })) }
		},
		conferenceId: true
	});
	const caredFor = new Set(careRows.map((member) => member.conferenceId));
	const canOpen = (id: string) => user.isAdmin || caredFor.has(id);
	const summary = $derived(schoolSummary(rows));

	const percent = new Intl.NumberFormat(getLocale(), {
		style: 'percent',
		maximumFractionDigits: 0
	});
	const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' });
	const rate = (value: number | undefined) => (value === undefined ? '—' : percent.format(value));

	const tiles = $derived([
		{ title: m.schoolMetricsConferences(), value: String(summary.conferences), icon: 'calendar' },
		{ title: m.schoolMetricsParticipants(), value: String(summary.participants), icon: 'users' },
		{
			title: m.schoolMetricsAcceptanceRate(),
			value: rate(summary.acceptanceRate),
			description: m.schoolMetricsAcceptanceRateHint({
				seated: summary.seated,
				applied: summary.applied
			}),
			icon: 'circle-check'
		},
		{
			title: m.schoolMetricsAttendanceRate(),
			value: rate(summary.attendanceRate),
			description: m.schoolMetricsAttendanceRateHint(),
			icon: 'person-walking-arrow-right'
		},
		{
			title: m.schoolMetricsFromWaitingList(),
			value: String(summary.fromWaitingList),
			icon: 'user-clock'
		}
	]);
</script>

<section class="flex flex-col gap-4" aria-label={m.schoolMetrics()}>
	<h3 class="text-lg font-bold">{m.schoolMetrics()}</h3>
	<div
		class="stats stats-vertical bg-base-100 border-base-200 border shadow-sm lg:stats-horizontal"
	>
		{#each tiles as tile (tile.title)}
			<div class="stat">
				<div class="stat-figure text-primary">
					<i class="fa-sharp-duotone fa-solid fa-{tile.icon} text-2xl"></i>
				</div>
				<div class="stat-title">{tile.title}</div>
				<div class="stat-value text-2xl">{tile.value}</div>
				{#if tile.description}
					<div class="stat-desc">{tile.description}</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if rows.length === 0}
		<p class="text-base-content/60">{m.schoolMetricsEmpty()}</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="table-zebra table">
				<thead>
					<tr>
						<th>{m.conference()}</th>
						<th class="text-center">{m.delegations()}</th>
						<th class="text-center">{m.schoolsParticipants()}</th>
						<th class="text-center">{m.schoolsApplied()}</th>
						<th class="text-center">{m.schoolsSeated()}</th>
						<th class="text-center">{m.schoolMetricsAttended()}</th>
						<th class="text-center">{m.supervisors()}</th>
						<th class="text-center">{m.waitingList()}</th>
						<th class="text-center">{m.schoolMetricsFromWaitingList()}</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.conferenceId)}
						<tr class={row.conferenceId === conferenceId ? 'bg-primary/10 font-semibold' : ''}>
							<td>
								{#if row.conferenceId !== conferenceId && canOpen(row.conferenceId)}
									<a
										class="link link-hover"
										href={resolve(`dashboard/${row.conferenceId}/team/schools/${schoolId}`)}
									>
										{row.conferenceTitle}
									</a>
								{:else}
									<div>{row.conferenceTitle}</div>
								{/if}
								<div class="text-base-content/60 text-xs">
									{date.format(new Date(row.startConference))}
								</div>
							</td>
							<td class="text-center tabular-nums">{row.delegations}</td>
							<td class="text-center tabular-nums">{row.participants}</td>
							<td class="text-center tabular-nums">{row.applied}</td>
							<td class="text-center tabular-nums">{row.seated}</td>
							<td class="text-center tabular-nums">{row.attended}</td>
							<td class="text-center tabular-nums">{row.supervisors}</td>
							<td class="text-center tabular-nums">{row.waitingList}</td>
							<td class="text-center tabular-nums">{row.fromWaitingList}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
