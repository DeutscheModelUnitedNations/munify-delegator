<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { planApply, planIsEmpty } from '#lib/assignment/applyPlan';
	import { boardState, describeRole, mergedRoles } from '../boardState';
	import { seatedRoles, seatsByKey } from '#lib/assignment/capacity';
	import { targetKey, type Target } from '#lib/assignment/state';
	import ActionModal from '#lib/components/ActionModal.svelte';
	import ConfirmDeleteModal from '#lib/components/ConfirmDeleteModal.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { toast } from 'svelte-sonner';
	import {
		fetchAssignmentDraft,
		fetchAssignmentRoles,
		fetchSeatedApplications,
		seatedSnapshot
	} from '../board';
	import SchoolRuleWarnings from '../SchoolRuleWarnings.svelte';
	import { toastError } from '../toastError';
	import {
		prioritizedApplicationOf,
		prioritizedElsewhere,
		requiredApplicationOf,
		requiredWithoutSeat,
		seatOccupancy
	} from './seatChecks';
	import ApplyProblems from './ApplyProblems.svelte';
	import SeatWarnings from './SeatWarnings.svelte';
	import PendingGroupsTable from './PendingGroupsTable.svelte';
	import PendingSinglesTable from './PendingSinglesTable.svelte';
	import PlanStats from './PlanStats.svelte';
	import ReleaseCard from './ReleaseCard.svelte';
	import EmailPrompt from '#lib/components/email/EmailPrompt.svelte';
	import { createEmailPrompt } from '#lib/components/email/emailPrompt.svelte.js';
	import { ASSIGNMENT_KINDS } from '#lib/helpers/emailKinds';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const [draft, roles, conference, seated, markedReviews] = $derived(
		await Promise.all([
			fetchAssignmentDraft(params.conferenceId),
			fetchAssignmentRoles(params.conferenceId),
			client.liveQuery.conference({
				__args: { id: params.conferenceId },
				assignmentReleased: true
			}),
			fetchSeatedApplications(params.conferenceId),
			// every required or prioritizing application, also those the board does not hold: a
			// required one there has no seat
			client.liveQuery.assignmentReviews({
				__args: {
					where: {
						conferenceId: { eq: params.conferenceId },
						OR: [{ required: { eq: true } }, { prioritizedRoleId: { isNotNull: true } }]
					}
				},
				delegationId: true,
				singleParticipantId: true,
				required: true,
				prioritizedRoleId: true,
				delegation: { memberCount: true }
			})
		])
	);
	// What applying does depends only on what holds a role or what the draft touches; the
	// applications without a role that the draft leaves alone are left alone by applying too.
	const plain = seatedSnapshot();
	const rows = $derived(plain(draft, seated));
	// The tab shows no ratings.
	const view = $derived(
		boardState(
			{ ...rows, reviews: [] },
			seatedRoles({ committees: roles.committees, nonStateActors: roles.nonStateActors })
		)
	);
	const roleSeats = $derived(
		new Map(roles.customRoles.map((role) => [role.id, role.seatAmount ?? 0]))
	);
	const preview = $derived(planApply({ ...view.live, seats: seatsByKey(view.seated), roleSeats }));
	const missingRequired = $derived(
		requiredWithoutSeat({
			required: markedReviews.filter((review) => review.required).flatMap(requiredApplicationOf),
			state: view
		})
	);
	const occupancy = $derived(
		seatOccupancy({ state: view, seats: seatsByKey(view.seated), roleSeats })
	);
	const empty = $derived(planIsEmpty(preview.plan));

	/** A role as the tables show it, with its flag; undefined for no role. */
	const describeTarget = (target: Target) =>
		targetKey(target)
			? describeRole({ target, roles, nationName: getFullTranslatedCountryNameFromISO3Code })
			: undefined;
	const roleName = (target: Target) => describeTarget(target)?.title ?? m.assignmentNoRole();
	const customRoleName = (roleId: string | null) =>
		roles.customRoles.find((role) => role.id === roleId)?.name ?? m.assignmentNoRole();
	/** A custom role's name, or a nation's or non-state actor's. */
	const anyRoleName = (roleId: string) =>
		roles.customRoles.some((role) => role.id === roleId)
			? customRoleName(roleId)
			: roleName({ roleId });
	const missedPriorities = $derived(
		prioritizedElsewhere({
			prioritized: markedReviews.flatMap(prioritizedApplicationOf),
			state: view
		}).map(({ application, heldRoleIds }) => ({
			id: application.delegationId ?? application.singleParticipantId ?? '',
			held: heldRoleIds.map(anyRoleName).join(', '),
			prioritized: anyRoleName(application.roleId)
		}))
	);
	const customRoleIcon = (roleId: string | null) =>
		roles.customRoles.find((role) => role.id === roleId)?.icon ?? undefined;

	const delegationById = $derived(new Map(rows.delegations.map((d) => [d.id, d])));
	const pendingGroups = $derived(
		view.groups
			.filter((group) => group.pending)
			.sort((a, b) => roleName(a.target).localeCompare(roleName(b.target)))
	);
	const pendingSingles = $derived(view.singles.filter((single) => single.pending));
	const merged = $derived(mergedRoles(view.groups));

	let confirmingApply = $state(false);
	let confirmingDiscard = $state(false);
	let applying = $state(false);
	let justApplied = $state(false);

	/** Releasing or applying sends nothing; the result mails are offered right after. */
	const emailPrompt = createEmailPrompt();
	const offerEmails = () =>
		emailPrompt.offer({ conferenceId: params.conferenceId, kinds: ASSIGNMENT_KINDS });

	async function apply() {
		applying = true;
		const applied = await Promise.resolve(
			client.mutate.applyAssignment({ __args: { conferenceId: params.conferenceId } })
		).catch(toastError);
		applying = false;
		if (!applied) return;
		toast.success(m.assignmentApplied());
		justApplied = true;
		confirmingApply = false;
		// hidden, it owes nobody a result yet
		if (conference.assignmentReleased) void offerEmails();
	}

	async function discard() {
		await Promise.resolve(
			client.mutate.discardAssignmentDraft({ __args: { conferenceId: params.conferenceId } })
		).catch(toastError);
		confirmingDiscard = false;
	}
</script>

<div class="flex flex-col gap-6">
	<ApplyProblems errors={preview.errors} warnings={preview.warnings} {roleName} {customRoleName} />
	<SeatWarnings {missingRequired} {missedPriorities} {occupancy} />
	<SchoolRuleWarnings conferenceId={params.conferenceId} plan={view} />

	<section class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body gap-4 max-sm:p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="card-title">{m.assignmentPendingChangesTitle()}</h3>
				<div class="flex flex-wrap gap-2">
					<button
						class="btn btn-ghost btn-sm"
						disabled={empty}
						onclick={() => (confirmingDiscard = true)}
					>
						<i aria-hidden="true" class="ph-duotone ph-trash"></i>
						{m.assignmentDiscardDraft()}
					</button>
					<button
						class="btn btn-primary btn-sm"
						disabled={empty || preview.errors.length > 0}
						onclick={() => (confirmingApply = true)}
					>
						<i aria-hidden="true" class="ph-duotone ph-checks"></i>
						{m.assignmentApply()}
					</button>
				</div>
			</div>

			{#if empty}
				<p class="text-base-content/60">{m.assignmentNothingPending()}</p>
			{:else}
				<PlanStats
					roles={pendingGroups.length}
					merges={merged.size}
					newDelegations={preview.plan.newDelegations.length}
					dissolved={preview.plan.deleteDelegations.length}
					singleRoles={pendingSingles.length}
				/>
				{#if pendingGroups.length > 0}
					<PendingGroupsTable
						groups={pendingGroups}
						{merged}
						{delegationById}
						{describeTarget}
						conferenceId={params.conferenceId}
					/>
				{/if}
				{#if pendingSingles.length > 0}
					<PendingSinglesTable
						singles={pendingSingles}
						{customRoleName}
						{customRoleIcon}
						conferenceId={params.conferenceId}
					/>
				{/if}
			{/if}
		</div>
	</section>

	<ReleaseCard
		conferenceId={params.conferenceId}
		released={conference.assignmentReleased}
		{justApplied}
		onReleased={() => void offerEmails()}
	/>
</div>

<EmailPrompt prompt={emailPrompt} />

{#if confirmingApply}
	<ActionModal
		title={m.assignmentApplyConfirmTitle()}
		confirmLabel={m.assignmentApply()}
		loading={applying}
		onConfirm={apply}
		onClose={() => (confirmingApply = false)}
	>
		<p>{m.assignmentApplyConfirmText()}</p>
		<SeatWarnings {missingRequired} {missedPriorities} {occupancy} />
		<SchoolRuleWarnings conferenceId={params.conferenceId} plan={view} />
		<p class="text-sm opacity-70">
			{m.assignmentSeatsFreeAfter({ free: occupancy.free, total: occupancy.total })}
		</p>
		{#if !conference.assignmentReleased}
			<p class="text-sm opacity-70">{m.assignmentApplyStaysHidden()}</p>
		{/if}
	</ActionModal>
{/if}

{#if confirmingDiscard}
	<ConfirmDeleteModal
		title={m.assignmentDiscardDraft()}
		text={m.assignmentDiscardConfirm()}
		onConfirm={discard}
		onClose={() => (confirmingDiscard = false)}
	/>
{/if}
