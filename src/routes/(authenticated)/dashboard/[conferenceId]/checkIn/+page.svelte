<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import DataMatrixDisplay from '$lib/components/registrationMode/DataMatrixDisplay.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { scanIssues, type ScanIssue } from '../management/attendance/scanCheck';
	import type { PageProps } from './$types';

	// Reached by the QR code at the entrance, so it is not linked from anywhere else
	let { params: routeParams }: PageProps = $props();
	const conferenceId = $derived(routeParams.conferenceId);
	const locale = getLocale();

	const currentUser = $derived(await getCurrentUser());
	const participation = $derived(await fetchMyParticipation(conferenceId));
	const table = $derived(
		await client.liveQuery.ownNametagTable({
			__args: { conferenceId, locale },
			index: true,
			fromLetter: true,
			toLetter: true,
			others: true
		})
	);

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
</script>

<div class="flex min-h-[70vh] w-full items-center justify-center p-4">
	<div class="card bg-base-200 w-full max-w-lg items-center gap-4 p-8 text-center">
		<h1 class="text-base-content/70 flex items-center gap-2 text-lg font-bold">
			<i class="fa-sharp-duotone fa-solid fa-id-badge"></i>
			{m.checkInGuideTitle()}
		</h1>

		{#if table && issues.length === 0}
			<p class="text-xl">{m.checkInGuideTable()}</p>
			<span class="badge badge-primary badge-xl text-3xl font-bold">{table.index + 1}</span>
			{#if range}
				<p class="text-base-content/70">{m.checkInGuideLetters()}</p>
				<p class="text-primary text-7xl font-bold">{range}</p>
			{:else}
				<p class="text-base-content/70">{m.checkInGuideOthersHint()}</p>
			{/if}
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-hand-holding-heart text-primary text-6xl"></i>
			<p class="text-2xl font-bold">{m.checkInGuideCare()}</p>
			{#if issues.length > 0}
				<p class="text-base-content/70">{m.checkInGuideCareHint()}</p>
				<ul class="flex flex-col items-center gap-1">
					{#each issues as issue (issue)}
						<li class="badge badge-warning badge-lg">{issueMessages[issue]()}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-base-content/70">{m.checkInGuideNoSeat()}</p>
			{/if}
		{/if}

		<!-- the code the team scans to see who this is, which participant care needs most -->
		<div class="mt-4 flex w-full flex-col items-center gap-2">
			<p class="text-lg font-bold">{currentUser.given_name} {currentUser.family_name}</p>
			<div class="w-full max-w-[10rem]">
				<DataMatrixDisplay data={currentUser.sub} />
			</div>
			<p class="text-base-content/40 font-mono text-xs">{currentUser.sub}</p>
		</div>
	</div>
</div>
