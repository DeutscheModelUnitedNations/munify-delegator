/**
 * The order a conference's dates have to keep: applications close no later than the conference
 * starts, and it starts no later than it ends. Shared by the settings form and `updateConference`,
 * which checks the row as written. Answers the first date that is out of order, or undefined.
 */
export function conferenceDatesProblem({
	applicationDeadline,
	startConference,
	endConference
}: {
	applicationDeadline: Date;
	startConference: Date;
	endConference: Date;
}): 'deadlineAfterStart' | 'startAfterEnd' | undefined {
	if (applicationDeadline.getTime() > startConference.getTime()) return 'deadlineAfterStart';
	if (startConference.getTime() > endConference.getTime()) return 'startAfterEnd';
	return undefined;
}
