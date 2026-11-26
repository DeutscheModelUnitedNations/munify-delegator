/** The steps of the postal registration, in order. */
const STEPS = ['info', 'details', 'age', 'hints', 'send'] as const;
export type PostalStep = (typeof STEPS)[number];

/**
 * The steps that show: those done and the open one after them. A step stays done once it was
 * confirmed, but what was confirmed has to be what is stored: corrected details or another age ask
 * again. Without a known age there is nothing to confirm about it.
 */
export function postalSteps({
	read,
	details,
	confirmedDetails,
	ofAge,
	confirmedOfAge,
	hintsSeen
}: {
	read: boolean;
	/** The fingerprint of the details the documents print, undefined while some are missing. */
	details: string | undefined;
	confirmedDetails: string | undefined;
	/** Whether they are of age at the conference, undefined where that is not known. */
	ofAge: boolean | undefined;
	confirmedOfAge: boolean | undefined;
	hintsSeen: boolean;
}) {
	const done: Record<PostalStep, boolean> = {
		info: read,
		details: details !== undefined && confirmedDetails === details,
		age: confirmedOfAge === ofAge,
		hints: hintsSeen,
		send: false
	};
	const steps = STEPS.filter((step) => step !== 'age' || ofAge !== undefined);
	const open = steps.find((step) => !done[step]) ?? 'send';
	return {
		open,
		shown: steps
			.slice(0, steps.indexOf(open) + 1)
			.map((step, index) => ({ step, number: index + 1, done: step !== open }))
	};
}
