<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime';
	import { client } from '$lib/api/rumbleClient/client';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import { describeParticipant } from '../registration-mode/participantInfo';
	import IdentityCode from '$lib/components/IdentityCode.svelte';
	import { m } from '$lib/paraglide/messages';
	import { scanIssues, type ScanIssue } from '../team/attendance/scanCheck';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	// Reached by the QR code at the entrance, so it is not linked from anywhere else
	let { params: routeParams }: PageProps = $props();
	const conferenceId = $derived(routeParams.conferenceId);

	const currentUser = $derived(await getCurrentUser());
	const participation = $derived(await fetchMyParticipation(conferenceId));
	const table = $derived(
		await client.liveQuery.ownNametagTable({
			__args: { conferenceId },
			index: true,
			fromLetter: true,
			toLetter: true,
			others: true
		})
	);

	// A scan at the entrance makes the ticket used for an hour. The scan happens on somebody else's
	// device and is announced to this one by the live query, so the ticket flips at once.
	const USED_FOR_MS = 60 * 60 * 1000;
	const userId = $derived(currentUser.sub);
	const entries = $derived(
		await client.liveQuery.attendanceEntries({
			__args: {
				where: {
					conferenceParticipantStatus: {
						conferenceId: { eq: conferenceId },
						userId: { eq: userId }
					}
				},
				orderBy: { timestamp: 'desc' },
				limit: 1
			},
			timestamp: true
		})
	);
	const lastScan = $derived(entries.at(0)?.timestamp ?? null);

	// the hour runs out on its own, with nobody scanning, so the clock is part of the state
	let now = $state(Date.now());
	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});
	const scannedAt = $derived(
		lastScan && now - new Date(lastScan).getTime() < USED_FOR_MS ? new Date(lastScan) : null
	);

	// who the person is here: nation or role with its flag or icon, and the committee
	const seat = $derived(participation ? describeParticipant(participation) : null);

	const issueMessages: Record<ScanIssue, () => string> = {
		notInConference: m.notInConference,
		paymentOpen: m.scanIssuePaymentOpen,
		termsOpen: m.scanIssueTermsOpen,
		guardianConsentOpen: m.scanIssueGuardianConsentOpen,
		alreadyScanned: m.duplicateScan
	};

	// Only an unsettled person has to see participant care first; everyone else just needs a table
	const issues = $derived.by(() => {
		if (!participation) return [];
		const inConference = !!(
			participation.delegationMember ||
			participation.singleParticipant ||
			participation.supervisor
		);
		return scanIssues({
			inConference,
			status: participation.participantStatus,
			birthday: participation.user.birthday,
			alreadyScanned: false
		});
	});

	const range = $derived(
		table?.fromLetter && table.toLetter
			? table.fromLetter === table.toLetter
				? table.fromLetter
				: `${table.fromLetter} – ${table.toLetter}`
			: null
	);

	/** A ragged edge along the top or bottom as a clip-path: where a ticket was torn along its perforation. */
	function tornEdge(edge: 'top' | 'bottom') {
		const depths = [5, 9, 6, 11, 4, 8, 7, 10];
		const teeth = 24;
		const along = Array.from({ length: teeth + 1 }, (_, i) => {
			const inset = i % 2 === 0 ? 0 : depths[(i >> 1) % depths.length];
			const y = edge === 'bottom' ? `calc(100% - ${inset}px)` : `${inset}px`;
			return `${(i / teeth) * 100}% ${y}`;
		});
		return edge === 'bottom'
			? `polygon(0 0, 100% 0, ${along.reverse().join(', ')})`
			: `polygon(${along.join(', ')}, 100% 100%, 0 100%)`;
	}
</script>

{#snippet used()}
	<div
		class="bg-success text-success-content flex items-center gap-2 px-6 py-2 text-sm font-semibold"
	>
		<i class="fa-sharp-duotone fa-solid fa-circle-check text-2xl"></i>
		<div class="flex flex-col leading-tight">
			<span>{m.checkInGuideUsed()}</span>
			<span class="text-xs font-normal opacity-80">
				{#if scannedAt}
					{m.checkInGuideUsedAt({
						time: scannedAt.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })
					})}
				{/if}
			</span>
		</div>
	</div>
{/snippet}

<!-- the stub, at a table: where to go -->
{#snippet tableStub(table: { index: number })}
	<section
		class="bg-base-200 flex items-center gap-4 border-t-4 px-6 py-4 {scannedAt
			? 'border-base-content/30'
			: 'border-primary'}"
	>
		<div
			class="{scannedAt
				? 'bg-base-content/20 text-base-content/70'
				: 'bg-primary text-primary-content'} rounded-box flex size-20 shrink-0 flex-col items-center justify-center"
		>
			<span class="text-xs leading-none font-semibold uppercase">{m.nametagBinTable()}</span>
			<span class="text-5xl leading-none font-black">{table.index + 1}</span>
		</div>
		{#if range}
			<div class="flex min-w-0 flex-col">
				<span class="text-base-content/60 text-xs">{m.checkInGuideLetters()}</span>
				<span
					class="text-5xl leading-tight font-black {scannedAt
						? 'text-base-content/50'
						: 'text-primary'}">{range}</span
				>
			</div>
		{:else}
			<p class="text-base-content/70 text-sm">{m.checkInGuideOthersHint()}</p>
		{/if}
	</section>
{/snippet}

<!-- the stub, without a table: who to see -->
{#snippet careStub()}
	<section
		class="bg-base-200 flex items-center gap-4 border-t-4 px-6 py-4 {scannedAt
			? 'border-base-content/30'
			: 'border-warning'}"
	>
		<span
			class="{scannedAt
				? 'bg-base-content/20 text-base-content/70'
				: 'bg-warning text-warning-content'} rounded-box flex size-20 shrink-0 items-center justify-center"
		>
			<i class="fa-sharp-duotone fa-solid fa-hand-holding-heart text-4xl"></i>
		</span>
		<div class="flex min-w-0 flex-col gap-2">
			<p class="text-lg leading-tight font-bold">{m.checkInGuideCare()}</p>
			{#if issues.length > 0}
				<ul class="flex flex-wrap gap-1.5">
					{#each issues as issue (issue)}
						<li class="badge badge-warning badge-soft">{issueMessages[issue]()}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-base-content/70 text-sm">{m.checkInGuideNoSeat()}</p>
			{/if}
		</div>
	</section>
{/snippet}

<!-- the stub: where to go -->
{#snippet stub()}
	{#if scannedAt}{@render used()}{/if}
	{#if table && issues.length === 0}
		{@render tableStub(table)}
	{:else}
		{@render careStub()}
	{/if}
{/snippet}

<!-- the part that stays: who you are, and the code the team scans -->
{#snippet body(torn: boolean)}
	<section
		class="rounded-b-box bg-base-200 flex flex-col items-center gap-5 px-6 pb-7 {torn
			? 'pt-10'
			: 'pt-7'}"
		style:clip-path={torn ? tornEdge('top') : undefined}
	>
		<p class="w-full text-center text-2xl leading-tight font-bold">
			{currentUser.given_name}
			{currentUser.family_name}
		</p>

		{#if seat?.roleDisplay}
			<div class="flex w-full items-center justify-center gap-4">
				{#if seat.alpha2Code}
					<Flag size="sm" alpha2Code={seat.alpha2Code} />
				{:else if seat.isNSA}
					<Flag size="sm" nsa icon={seat.nsaIcon} />
				{/if}
				<div class="flex min-w-0 flex-col items-center text-center">
					<p class="text-lg leading-tight font-semibold">{seat.roleDisplay}</p>
					{#if seat.committeeAbbreviation}
						<span class="badge badge-primary badge-sm mt-1">{seat.committeeAbbreviation}</span>
					{/if}
				</div>
			</div>
		{/if}

		<div class="w-full max-w-[17rem]">
			<IdentityCode {conferenceId} calm={torn} />
		</div>
		<p class="text-base-content/40 font-mono text-xs break-all">{currentUser.sub}</p>
	</section>
{/snippet}

<div class="mx-auto flex w-full max-w-md flex-col p-4 sm:py-8">
	{#if scannedAt}
		<!-- used: the stub is torn off along the perforation and lies beside what is left -->
		<div class="flex flex-col gap-3">
			<div class="origin-bottom-left -translate-x-1 -rotate-2 drop-shadow-lg">
				<div
					class="rounded-t-box bg-base-200 overflow-hidden pb-3"
					style:clip-path={tornEdge('bottom')}
				>
					{@render stub()}
				</div>
			</div>
			<div class="drop-shadow-lg">{@render body(true)}</div>
		</div>
	{:else}
		<div class="rounded-t-box overflow-hidden shadow-lg">{@render stub()}</div>

		<!-- the perforation of the ticket -->
		<div class="relative h-0">
			<div class="border-base-content/20 absolute inset-x-5 top-0 border-t-2 border-dashed"></div>
			<div class="bg-base-100 absolute -top-3 -left-3 size-6 rounded-full"></div>
			<div class="bg-base-100 absolute -top-3 -right-3 size-6 rounded-full"></div>
		</div>

		<div class="shadow-lg rounded-b-box">{@render body(false)}</div>
	{/if}
</div>
