<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { planApply, planIsEmpty } from '$lib/assignment/applyPlan';
	import { boardState, describeRole, mergedRoles } from '$lib/assignment/board';
	import { seatsByKey } from '$lib/assignment/capacity';
	import { targetKey, type Target } from '$lib/assignment/state';
	import ActionModal from '$lib/components/ActionModal.svelte';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { toast } from 'svelte-sonner';
	import {
		draftApplicationIds,
		fetchAssignmentDraft,
		fetchAssignmentRoles,
		fetchSeatedApplications
	} from '../board';
	import { toastError } from '../toastError';
	import ApplyProblems from './ApplyProblems.svelte';
	import PendingGroupsTable from './PendingGroupsTable.svelte';
	import PendingSinglesTable from './PendingSinglesTable.svelte';
	import PlanStats from './PlanStats.svelte';
	import ReleaseCard from './ReleaseCard.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const [draft, roles, conference] = $derived(
		await Promise.all([
			fetchAssignmentDraft(params.conferenceId),
			fetchAssignmentRoles(params.conferenceId),
			client.liveQuery.conference({ __args: { id: params.conferenceId }, assignmentReleased: true })
		])
	);
	// What applying does depends only on what holds a role or what the draft touches; the
	// applications without a role that the draft leaves alone are left alone by applying too.
	const touched = $derived(draftApplicationIds(draft));
	const seated = $derived(await fetchSeatedApplications(params.conferenceId, touched));
	// The tab shows no ratings.
	const view = $derived(boardState({ ...draft, ...seated, reviews: [] }, roles));
	const preview = $derived(
		planApply({
			...view.live,
			seats: seatsByKey(view.seated),
			roleSeats: new Map(roles.customRoles.map((role) => [role.id, role.seatAmount]))
		})
	);
	const empty = $derived(planIsEmpty(preview.plan));

	const roleName = (target: Target) =>
		targetKey(target)
			? describeRole(target, roles, getFullTranslatedCountryNameFromISO3Code).title
			: m.assignmentNoRole();
	const customRoleName = (roleId: string | null) =>
		roles.customRoles.find((role) => role.id === roleId)?.name ?? m.assignmentNoRole();

	const delegationById = $derived(new Map(seated.delegations.map((d) => [d.id, d])));
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

	<section class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body gap-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="card-title">{m.assignmentPendingChangesTitle()}</h3>
				<div class="flex gap-2">
					<button
						class="btn btn-ghost btn-sm"
						disabled={empty}
						onclick={() => (confirmingDiscard = true)}
					>
						<i class="fa-duotone fa-trash"></i>
						{m.assignmentDiscardDraft()}
					</button>
					<button
						class="btn btn-primary btn-sm"
						disabled={empty || preview.errors.length > 0}
						onclick={() => (confirmingApply = true)}
					>
						<i class="fa-duotone fa-check-double"></i>
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
					<PendingGroupsTable groups={pendingGroups} {merged} {delegationById} {roleName} />
				{/if}
				{#if pendingSingles.length > 0}
					<PendingSinglesTable singles={pendingSingles} {customRoleName} />
				{/if}
			{/if}
		</div>
	</section>

	<ReleaseCard
		conferenceId={params.conferenceId}
		released={conference.assignmentReleased}
		{justApplied}
	/>
</div>

{#if confirmingApply}
	<ActionModal
		title={m.assignmentApplyConfirmTitle()}
		confirmLabel={m.assignmentApply()}
		loading={applying}
		onConfirm={apply}
		onClose={() => (confirmingApply = false)}
	>
		<p>{m.assignmentApplyConfirmText()}</p>
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
