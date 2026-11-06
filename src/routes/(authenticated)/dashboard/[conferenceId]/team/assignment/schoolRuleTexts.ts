import codenamize from '#lib/helpers/codenamize';
import formatNames from '#lib/helpers/formatNames';
import { m } from '#lib/paraglide/messages';
import type {
	CollectiveGroupProblem,
	GuaranteedSeatCount,
	SupervisedStudents
} from './schoolRules';

/** How the board and the summary word a broken school rule (`schoolRules.ts`). */

/** A supervisor as the school rules read them, with their name. */
export type NamedSupervisor = SupervisedStudents & {
	user: { givenName: string; familyName: string };
};

export const supervisorName = (supervisor: NamedSupervisor) =>
	formatNames({ givenName: supervisor.user.givenName, familyName: supervisor.user.familyName });

/** What is wrong with a split group: only some seated, or only some excluded. */
export function splitGroupText(problem: CollectiveGroupProblem<NamedSupervisor>) {
	const who = {
		school: problem.group.school.name,
		supervisor: supervisorName(problem.group.supervisor),
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
