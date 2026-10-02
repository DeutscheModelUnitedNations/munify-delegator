<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client, type AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import getSimplifiedPostalStatus from '$lib/helpers/getSimplifiedPostalStatus';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';

	interface Props {
		conferenceId: string;
		supervisorId: string;
	}

	let { conferenceId, supervisorId }: Props = $props();

	const [supervisor, conference] = $derived(
		await Promise.all([
			client.liveQuery.conferenceSupervisor({
				__args: { id: supervisorId },
				supervisedDelegationMembers: {
					id: true,
					user: {
						birthday: true,
						conferenceParticipantStatus: {
							termsAndConditions: true,
							guardianConsent: true,
							mediaConsent: true,
							paymentStatus: true,
							conference: { id: true }
						}
					},
					delegation: {
						id: true,
						assignedNation: { alpha3Code: true },
						assignedNonStateActor: { id: true },
						papers: { id: true, status: true }
					}
				}
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, startConference: true })
		])
	);
	const conferenceStartDate = $derived(conference.startConference);

	/** Only students who got a role count: the charts are about preparing for the conference. */
	const members = $derived(
		supervisor.supervisedDelegationMembers.filter(
			(x) => x.delegation.assignedNation || x.delegation.assignedNonStateActor
		)
	);

	/** Each delegation's papers once, however many of its members this supervisor supervises. */
	const papers = $derived(
		[...new Map(members.map((x) => [x.delegation.id, x.delegation])).values()].flatMap(
			(delegation) => delegation.papers
		)
	);

	/** How many students' payment or postal status is done, pending, or has a problem. */
	const countStatuses = (
		statusOf: (member: (typeof members)[number]) => AdministrativestatusEnum
	) => {
		const counts = { DONE: 0, PENDING: 0, PROBLEM: 0 };
		members.forEach((member) => counts[statusOf(member)]++);
		return counts;
	};

	const participantStatusOf = (member: (typeof members)[number]) =>
		member.user.conferenceParticipantStatus?.find((s) => s.conference.id === conferenceId);

	// Calculate payment status counts
	let paymentStats = $derived(
		countStatuses((member) => participantStatusOf(member)?.paymentStatus ?? 'PENDING')
	);

	// Calculate postal status counts (using simplified status)
	let postalStats = $derived(
		countStatuses((member) => {
			const isOfAge = conferenceStartDate
				? ofAgeAtConference(conferenceStartDate, member.user.birthday)
				: true;
			return getSimplifiedPostalStatus(participantStatusOf(member), isOfAge) ?? 'PENDING';
		})
	);

	// Calculate paper status counts
	let paperStats = $derived.by(() => {
		const counts = { SUBMITTED: 0, REVISED: 0, CHANGES_REQUESTED: 0, ACCEPTED: 0 };
		papers.forEach((paper) => {
			if (paper.status !== 'DRAFT' && paper.status in counts) {
				counts[paper.status as keyof typeof counts]++;
			}
		});
		return counts;
	});

	const total = (stats: Record<string, number>) => Object.values(stats).reduce((a, b) => a + b, 0);
</script>

<div class="flex flex-wrap gap-4">
	<!-- Payment Status -->
	<div class="bg-base-100 rounded-lg p-3 flex-1 min-w-[200px]">
		<div class="flex items-center gap-2 mb-2">
			<i class="fa-duotone fa-money-bill-transfer text-primary"></i>
			<span class="text-sm font-medium">{m.payment()}</span>
		</div>
		<div class="flex h-2 rounded-full overflow-hidden">
			{#if total(paymentStats) > 0}
				<div
					class="tooltip bg-success"
					style="width: {(paymentStats.DONE / total(paymentStats)) * 100}%"
					data-tip="{paymentStats.DONE} {m.done()}"
				></div>
				<div
					class="tooltip bg-warning"
					style="width: {(paymentStats.PENDING / total(paymentStats)) * 100}%"
					data-tip="{paymentStats.PENDING} {m.statusPending()}"
				></div>
				<div
					class="tooltip bg-error"
					style="width: {(paymentStats.PROBLEM / total(paymentStats)) * 100}%"
					data-tip="{paymentStats.PROBLEM} {m.statusProblem()}"
				></div>
			{:else}
				<div class="bg-base-300 w-full"></div>
			{/if}
		</div>
		<div class="text-xs text-base-content/70 mt-1">
			{paymentStats.DONE}/{total(paymentStats)}
			{m.done()}
		</div>
	</div>

	<!-- Postal Status -->
	<div class="bg-base-100 rounded-lg p-3 flex-1 min-w-[200px]">
		<div class="flex items-center gap-2 mb-2">
			<i class="fa-duotone fa-envelopes-bulk text-primary"></i>
			<span class="text-sm font-medium">{m.postalRegistration()}</span>
		</div>
		<div class="flex h-2 rounded-full overflow-hidden">
			{#if total(postalStats) > 0}
				<div
					class="tooltip bg-success"
					style="width: {(postalStats.DONE / total(postalStats)) * 100}%"
					data-tip="{postalStats.DONE} {m.done()}"
				></div>
				<div
					class="tooltip bg-warning"
					style="width: {(postalStats.PENDING / total(postalStats)) * 100}%"
					data-tip="{postalStats.PENDING} {m.statusPending()}"
				></div>
				<div
					class="tooltip bg-error"
					style="width: {(postalStats.PROBLEM / total(postalStats)) * 100}%"
					data-tip="{postalStats.PROBLEM} {m.statusProblem()}"
				></div>
			{:else}
				<div class="bg-base-300 w-full"></div>
			{/if}
		</div>
		<div class="text-xs text-base-content/70 mt-1">
			{postalStats.DONE}/{total(postalStats)}
			{m.done()}
		</div>
	</div>

	<!-- Paper Status -->
	<div class="bg-base-100 rounded-lg p-3 flex-1 min-w-[200px]">
		<div class="flex items-center gap-2 mb-2">
			<i class="fa-duotone fa-file-lines text-primary"></i>
			<span class="text-sm font-medium">{m.papers()}</span>
		</div>
		<div class="flex h-2 rounded-full overflow-hidden">
			{#if total(paperStats) > 0}
				<div
					class="tooltip bg-warning"
					style="width: {(paperStats.SUBMITTED / total(paperStats)) * 100}%"
					data-tip="{paperStats.SUBMITTED} {m.paperStatusSubmitted()}"
				></div>
				<div
					class="tooltip bg-info"
					style="width: {(paperStats.REVISED / total(paperStats)) * 100}%"
					data-tip="{paperStats.REVISED} {m.paperStatusRevised()}"
				></div>
				<div
					class="tooltip bg-error"
					style="width: {(paperStats.CHANGES_REQUESTED / total(paperStats)) * 100}%"
					data-tip="{paperStats.CHANGES_REQUESTED} {m.paperStatusChangesRequested()}"
				></div>
				<div
					class="tooltip bg-success"
					style="width: {(paperStats.ACCEPTED / total(paperStats)) * 100}%"
					data-tip="{paperStats.ACCEPTED} {m.paperStatusAccepted()}"
				></div>
			{:else}
				<div class="bg-base-300 w-full"></div>
			{/if}
		</div>
		<div class="text-xs text-base-content/70 mt-1">
			{#if total(paperStats) > 0}
				{paperStats.ACCEPTED}/{total(paperStats)} {m.paperStatusAccepted()}
			{:else}
				{m.noPapersSubmittedYet()}
			{/if}
		</div>
	</div>
</div>
