/** One conference's numbers of a school, as `schoolMetrics` answers them. */
export interface ConferenceMetrics {
	participants: number;
	applied: number;
	seated: number;
	attended: number;
	fromWaitingList: number;
}

/** The share `part` of `whole`, or undefined where there is nothing to divide. */
const share = (part: number, whole: number) => (whole > 0 ? part / whole : undefined);

/**
 * A school's history at a glance: in how many conferences people from it took part, how many
 * applied, how many of them got a seat, and how many of those came.
 */
export function schoolSummary(conferences: readonly ConferenceMetrics[]) {
	const sum = (pick: (row: ConferenceMetrics) => number) =>
		conferences.reduce((total, row) => total + pick(row), 0);
	const applied = sum((row) => row.applied);
	const seated = sum((row) => row.seated);
	return {
		conferences: conferences.filter((row) => row.participants > 0).length,
		participants: sum((row) => row.participants),
		applied,
		seated,
		acceptanceRate: share(seated, applied),
		attendanceRate: share(
			sum((row) => row.attended),
			seated
		),
		fromWaitingList: sum((row) => row.fromWaitingList)
	};
}
