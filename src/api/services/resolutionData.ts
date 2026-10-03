/** The title to store for a new resolution: the given one, or the file name if it is blank. */
export function resolutionTitle(title: string | null | undefined, fileName: string) {
	return title?.trim() || fileName;
}

/**
 * Translates updateResolution arguments into a Prisma update. Omitted or blank
 * values leave the field unchanged; `clearCommittee` removes the committee tag.
 */
export function resolutionUpdateData(args: {
	title?: string | null;
	committeeId?: string | null;
	clearCommittee?: boolean | null;
}) {
	return {
		title: args.title?.trim() || undefined,
		committeeId: args.clearCommittee ? null : (args.committeeId ?? undefined)
	};
}
