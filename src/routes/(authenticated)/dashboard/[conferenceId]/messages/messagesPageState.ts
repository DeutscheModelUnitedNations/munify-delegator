/**
 * What the participants' messages page shows: why there is nothing to see, or the chats, with what
 * the caller can do there. The team and the own delegation are reached from the registration on;
 * other delegations only once the roles are released and the conference switched that on.
 */
export function messagesPageState({
	messagingEnabled,
	assignmentReleased,
	takesPart,
	hasChats
}: {
	/** The conference's switch: chats between participants of different delegations. */
	messagingEnabled: boolean;
	assignmentReleased: boolean;
	/** Delegates and single participants write; supervisors and the team do not take part here. */
	takesPart: boolean;
	hasChats: boolean;
}) {
	return {
		/** Instead of the chats: the caller takes no part. Earlier chats stay readable. */
		closed: !takesPart && !hasChats ? ('noPart' as const) : null,
		canStart: takesPart,
		/**
		 * Why the caller cannot write to other delegations yet: the roles are not released, or the
		 * conference keeps participants from writing each other. Null once they can.
		 */
		othersClosed: !takesPart
			? null
			: !assignmentReleased
				? ('beforeRelease' as const)
				: !messagingEnabled
					? ('disabled' as const)
					: null
	};
}
