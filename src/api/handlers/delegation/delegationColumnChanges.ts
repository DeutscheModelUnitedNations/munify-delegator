/**
 * The columns of the delegation row an update writes directly: the application texts when either
 * is given, and a fresh entry code when asked for one. Empty when there is nothing to write.
 */
export function delegationColumnChanges({
	args,
	newEntryCode
}: {
	args: {
		experience?: string | null;
		motivation?: string | null;
		resetEntryCode?: boolean | null;
	};
	newEntryCode: () => string;
}) {
	return {
		...(args.experience || args.motivation
			? { experience: args.experience, motivation: args.motivation }
			: {}),
		...(args.resetEntryCode ? { entryCode: newEntryCode() } : {})
	};
}
