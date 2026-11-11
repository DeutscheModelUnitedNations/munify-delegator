<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { fetchSchoolRules, fetchSupervisorNames, schoolRulesSnapshot } from '../board';
	import {
		collectiveGroupsOf,
		guaranteesAround,
		guaranteeShareAround,
		type GuaranteedApplication
	} from '../schoolRules';

	/**
	 * What the school rules (`schoolRules.ts`) say about one application in the sighting: the
	 * groups decided together it belongs to, and the guaranteed seats of its people's
	 * Auslandsschulen, alone and all together, counted as if it were marked required or not as the card shows it.
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

	const groups = $derived(collectiveGroupsOf({ groups: checked.groups, application }));
	const supervisorKey = $derived(groups.map((group) => group.supervisorId).join(','));
	const names = $derived(await fetchSupervisorNames(supervisorKey ? supervisorKey.split(',') : []));
	const requiredReviews = $derived(checked.reviews.filter((review) => review.required));
	const guarantees = $derived(
		guaranteesAround({ applications: requiredReviews, application, required })
	);
	const share = $derived(
		guaranteeShareAround({
			applications: requiredReviews,
			application,
			required,
			capacity: checked.capacity,
			percent: checked.sharePercent
		})
	);
	const warnIf = (over: boolean) => (over ? 'alert-warning' : '');
	const guaranteeClass = (seats: number) =>
		warnIf(guaranteeLimit !== null && seats > guaranteeLimit);

	function guaranteeMessage({ school, seats }: { school: { name: string }; seats: number }) {
		return guaranteeLimit === null
			? m.schoolRuleSightingGuaranteesNoLimit({ school: school.name, seats })
			: m.schoolRuleSightingGuarantees({ school: school.name, seats, limit: guaranteeLimit });
	}
</script>

{#if groups.length > 0 || guarantees.length > 0}
	<div class="flex flex-col gap-2">
		{#each groups as group (group.key)}
			<div class="alert alert-info alert-soft py-2 text-sm" data-testid="collective-group">
				<i aria-hidden="true" class="ph-duotone ph-users-three"></i>
				<span>
					{m.schoolRuleSightingGroup({
						school: group.school.name,
						supervisor: names.get(group.supervisorId) ?? '…',
						size: group.size
					})}
				</span>
			</div>
		{/each}
		{#each guarantees as count (count.school.id)}
			<div
				class="alert alert-soft py-2 text-sm {guaranteeClass(count.seats)}"
				data-testid="foreign-guarantees"
			>
				<i aria-hidden="true" class="ph-duotone ph-globe-hemisphere-east"></i>
				<span>{guaranteeMessage(count)}</span>
			</div>
		{/each}
		{#if share}
			<div
				class="alert alert-soft py-2 text-sm {warnIf(share.seats > share.allowed)}"
				data-testid="foreign-guarantee-share"
			>
				<i aria-hidden="true" class="ph-duotone ph-globe"></i>
				<span>{m.schoolRuleSightingGuaranteeShare({ ...share })}</span>
			</div>
		{/if}
	</div>
{/if}
