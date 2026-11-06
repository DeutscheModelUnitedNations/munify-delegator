<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { fetchSchoolRules, schoolRulesSnapshot } from '../board';
	import { supervisorName } from '../schoolRuleTexts';
	import {
		collectiveGroups,
		collectiveGroupsOf,
		guaranteesAround,
		type GuaranteedApplication
	} from '../schoolRules';

	/**
	 * What the school rules (`schoolRules.ts`) say about one application in the sighting: the
	 * groups decided together it belongs to, and the guaranteed seats of its people's
	 * Auslandsschulen, counted as if it were marked required or not as the card shows it.
	 */
	interface Props {
		conferenceId: string;
		application: GuaranteedApplication &
			({ delegationId: string } | { singleParticipantId: string });
		/** Whether the card marks it required, ahead of what the backend has */
		required: boolean;
	}

	let { conferenceId, application, required }: Props = $props();

	const rules = $derived(await fetchSchoolRules(conferenceId));
	const plain = schoolRulesSnapshot();
	const checked = $derived(plain(rules));
	const guaranteeLimit = $derived(checked.guaranteeLimit);

	const groups = $derived(
		collectiveGroupsOf({
			groups: collectiveGroups({ supervisors: checked.supervisors, limit: checked.groupLimit }),
			application
		})
	);
	const guarantees = $derived(
		guaranteesAround({
			applications: checked.reviews.filter((review) => review.required),
			application,
			required
		})
	);
	const over = (seats: number) => guaranteeLimit !== null && seats > guaranteeLimit;
</script>

{#if groups.length > 0 || guarantees.length > 0}
	<div class="flex flex-col gap-2">
		{#each groups as group (group.key)}
			<div class="alert alert-info alert-soft py-2 text-sm" data-testid="collective-group">
				<i class="fa-sharp-duotone fa-solid fa-people-group"></i>
				<span>
					{m.schoolRuleSightingGroup({
						school: group.school.name,
						supervisor: supervisorName(group.supervisor),
						size: group.size
					})}
				</span>
			</div>
		{/each}
		{#each guarantees as count (count.school.id)}
			<div
				class="alert alert-soft py-2 text-sm {over(count.seats) ? 'alert-warning' : ''}"
				data-testid="foreign-guarantees"
			>
				<i class="fa-sharp-duotone fa-solid fa-earth-europe"></i>
				<span>
					{guaranteeLimit === null
						? m.schoolRuleSightingGuaranteesNoLimit({
								school: count.school.name,
								seats: count.seats
							})
						: m.schoolRuleSightingGuarantees({
								school: count.school.name,
								seats: count.seats,
								limit: guaranteeLimit
							})}
				</span>
			</div>
		{/each}
	</div>
{/if}
