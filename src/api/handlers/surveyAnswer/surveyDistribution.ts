/** An option as the distribution sees it: its limit (0 for none) and the answers it holds. */
interface OptionLoad {
	id: string;
	upperLimit: number;
	taken: number;
}

/** How full an option is; one without a limit counts as empty, so it takes whoever is left. */
const fillRatio = (option: OptionLoad) =>
	option.upperLimit ? option.taken / option.upperLimit : 0;

const hasRoom = (option: OptionLoad) => !option.upperLimit || option.taken < option.upperLimit;

/**
 * Hands each of `participantIds`, in the order given, the option that is least full, so the
 * options fill up evenly relative to their limits; ties go to the option holding fewer answers,
 * then to the earlier one. Never puts anybody into an option past its limit: once no option has
 * room, the rest get nothing.
 */
export function distributeToOptions(
	participantIds: readonly string[],
	options: readonly OptionLoad[]
): { participantId: string; optionId: string }[] {
	const loads = options.map((option) => ({ ...option }));
	const plan: { participantId: string; optionId: string }[] = [];
	for (const participantId of participantIds) {
		const open = loads.filter(hasRoom);
		if (open.length === 0) break;
		const target = open.reduce((best, option) =>
			fillRatio(option) < fillRatio(best) ||
			(fillRatio(option) === fillRatio(best) && option.taken < best.taken)
				? option
				: best
		);
		target.taken++;
		plan.push({ participantId, optionId: target.id });
	}
	return plan;
}
