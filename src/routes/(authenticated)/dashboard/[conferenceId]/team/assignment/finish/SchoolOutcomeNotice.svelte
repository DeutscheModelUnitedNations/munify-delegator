<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import codenamize from '#lib/helpers/codenamize';
	import { m } from '#lib/paraglide/messages';
	import type { PlannedSeats } from '../schoolRules';
	import { mixedSchoolOutcomes } from './schoolOutcomes';

	/**
	 * Schools whose applicants the plan would seat only partly (`schoolOutcomes.ts`). Often fine,
	 * so a quiet note, folded, beside the school rules' warnings. Shows nothing while no school is split.
	 */
	interface Props {
		conferenceId: string;
		/** The plan, as the board sees it */
		plan: PlannedSeats;
	}

	let { conferenceId, plan }: Props = $props();

	const schools = $derived(
		await client.query.schoolApplicants({
			__args: { conferenceId },
			school: { id: true, name: true, isForeignSchool: true },
			members: { delegationMemberId: true, delegationId: true },
			singleParticipantIds: true,
			size: true
		})
	);
	const mixed = $derived(mixedSchoolOutcomes({ schools, plan }));
	const names = (ids: readonly string[]) => ids.map((id) => codenamize(id)).join(', ');
</script>

{#if mixed.length > 0}
	<div class="alert alert-soft bg-base-200 border-base-300" role="status">
		<i aria-hidden="true" class="ph-duotone ph-graduation-cap text-xl"></i>
		<div class="flex min-w-0 flex-col gap-1">
			<h3 class="font-bold">{m.schoolOutcomesMixedTitle()}</h3>
			<p class="text-sm opacity-80">{m.schoolOutcomesMixedHint()}</p>
			<details class="text-sm">
				<summary class="cursor-pointer"
					>{m.schoolOutcomesMixedShow({ count: mixed.length })}</summary
				>
				<ul class="mt-2 flex flex-col gap-2">
					{#each mixed as outcome (outcome.school.id)}
						<li>
							<span class="font-semibold">{outcome.school.name}</span>:
							{m.schoolOutcomesMixedCount({ seated: outcome.seated, size: outcome.size })}
							<div class="opacity-70">
								{m.schoolOutcomesMixedAccepted({
									applications: names(outcome.acceptedApplicationIds)
								})}
							</div>
							<div class="opacity-70">
								{m.schoolOutcomesMixedDeclined({
									applications: names(outcome.declinedApplicationIds)
								})}
							</div>
						</li>
					{/each}
				</ul>
			</details>
		</div>
	</div>
{/if}
