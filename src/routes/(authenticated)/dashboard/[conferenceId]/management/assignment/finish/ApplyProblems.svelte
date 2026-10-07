<script lang="ts">
	import type { ApplyError, planApply } from '$lib/assignment/applyPlan';
	import type { Target } from '$lib/assignment/state';
	import codenamize from '$lib/helpers/codenamize';
	import { m } from '$lib/paraglide/messages';

	/** What blocks applying the draft, and what is allowed but probably wrong. */
	interface Props {
		errors: ApplyError[];
		warnings: ReturnType<typeof planApply>['warnings'];
		roleName: (target: Target) => string;
		customRoleName: (roleId: string | null) => string;
	}

	let { errors, warnings, roleName, customRoleName }: Props = $props();

	function describeError(error: ApplyError) {
		switch (error.type) {
			case 'incompleteSplit':
				return m.assignmentErrorIncompleteSplitOf({
					name: codenamize(error.delegationId),
					count: error.memberIds.length
				});
			case 'overCapacity':
				return m.assignmentErrorOverCapacity({
					role: roleName(error.target),
					seats: error.seats,
					assigned: error.assigned
				});
			case 'deletesPapers':
				return m.assignmentErrorDeletesPapersOf({ name: codenamize(error.delegationId) });
		}
	}
</script>

{#if errors.length > 0}
	<div class="alert alert-error alert-soft">
		<i class="fa-duotone fa-circle-xmark text-xl"></i>
		<div class="flex flex-col gap-1">
			<h3 class="font-bold">{m.assignmentBlockingProblems()}</h3>
			<ul class="list-inside list-disc text-sm">
				{#each errors as error, index (index)}
					<li>{describeError(error)}</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
{#if warnings.length > 0}
	<div class="alert alert-warning alert-soft">
		<i class="fa-duotone fa-triangle-exclamation text-xl"></i>
		<ul class="list-inside list-disc text-sm">
			{#each warnings as warning, index (index)}
				<li>
					{m.assignmentWarningRoleOverCapacity({
						role: customRoleName(warning.roleId),
						seats: warning.seats,
						assigned: warning.assigned
					})}
				</li>
			{/each}
		</ul>
	</div>
{/if}
