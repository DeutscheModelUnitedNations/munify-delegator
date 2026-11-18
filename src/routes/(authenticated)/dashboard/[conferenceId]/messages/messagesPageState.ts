/**
 * What the participants' messages page shows: why there is nothing to see, or the chats, with what
 * the caller can do there.
 */
export function messagesPageState({
	messagingEnabled,
	assignmentReleased,
	takesPart,
	hasChats
}: {
	messagingEnabled: boolean;
	assignmentReleased: boolean;
	/** Delegates and single participants write; supervisors and the team do not take part here. */
	takesPart: boolean;
	hasChats: boolean;
}) {
	const canStart = messagingEnabled && takesPart;
	return {
		/** Instead of the chats: messaging is off, or the caller takes no part. Earlier chats stay readable. */
		closed: hasChats
			? null
			: !messagingEnabled
				? ('disabled' as const)
				: !takesPart
					? ('noPart' as const)
					: null,
		canStart,
		/** Only participant care is reachable until the roles are released */
		beforeRelease: canStart && !assignmentReleased
	};
}
