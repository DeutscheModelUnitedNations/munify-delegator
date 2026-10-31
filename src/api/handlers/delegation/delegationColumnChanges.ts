/**
 * The columns of the delegation row an update writes directly: each application text that is
 * given (`null` clears it, left out keeps it), and a fresh entry code when asked for one. Empty
 * when there is nothing to write.
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
		...(args.experience === undefined ? {} : { experience: args.experience }),
		...(args.motivation === undefined ? {} : { motivation: args.motivation }),
		...(args.resetEntryCode ? { entryCode: newEntryCode() } : {})
	};
}
