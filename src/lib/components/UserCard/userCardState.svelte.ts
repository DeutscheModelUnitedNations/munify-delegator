let openUserId = $state<string | null>(null);
let openConferenceId = $state<string | null>(null);

export function openUserCard(userId: string, conferenceId: string) {
	openUserId = userId;
	openConferenceId = conferenceId;
}

export function closeUserCard() {
	openUserId = null;
	openConferenceId = null;
}

export function getUserCardState() {
	return {
		get userId() {
			return openUserId;
		},
		get conferenceId() {
			return openConferenceId;
		},
		get isOpen() {
			return openUserId !== null;
		}
	};
}
