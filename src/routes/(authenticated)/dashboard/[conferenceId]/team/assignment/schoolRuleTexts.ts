import codenamize from '#lib/helpers/codenamize';
import { m } from '#lib/paraglide/messages';
import type { CollectiveGroupProblem, GuaranteedSeatCount } from './schoolRules';

/** How the board and the summary word a broken school rule (`schoolRules.ts`). */

/** Supervisor names by id (`fetchSupervisorNames`); one not loaded yet shows as nothing. */
export type SupervisorNames = ReadonlyMap<string, string>;

/** What is wrong with a split group: only some seated, or only some excluded. */
export function splitGroupText({
	problem,
	names
}: {
	problem: CollectiveGroupProblem;
	names: SupervisorNames;
}) {
	const who = {
		school: problem.group.school.name,
		supervisor: names.get(problem.group.supervisorId) ?? '…',
		size: problem.group.size
	};
	return problem.disqualified > 0 && problem.disqualified < problem.group.size
		? m.schoolRuleGroupPartlyExcluded({ ...who, excluded: problem.disqualified })
		: m.schoolRuleGroupPartlySeated({ ...who, seated: problem.seated });
}

/** The applications of a split group that would get no seat, by codename; none when all would. */
export function withoutSeatText(problem: CollectiveGroupProblem) {
	if (problem.unseatedApplicationIds.length === 0) return undefined;
	return m.schoolRuleGroupWithoutSeat({
		applications: problem.unseatedApplicationIds.map((id) => codenamize(id)).join(', ')
	});
}

export function guaranteeText({ count, limit }: { count: GuaranteedSeatCount; limit: number }) {
	return m.schoolRuleGuaranteesOverLimit({ school: count.school.name, seats: count.seats, limit });
}
