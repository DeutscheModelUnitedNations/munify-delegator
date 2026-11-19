import { toast } from 'svelte-sonner';
import { client } from '#lib/api/rumbleClient/client';
import type { ChatInboxRow } from '#lib/api/chats';
import { chatOpenError } from './inboxChoice';

/**
 * Opens (or finds) a chat and hands its id to `onOpened`. `opening` stays true while a chat is
 * being opened, so callers can disable their buttons against double clicks.
 */
export function createChatOpener({
	conferenceId,
	onOpened
}: {
	conferenceId: () => string;
	onOpened: (chatId: string) => void;
}) {
	let opening = $state(false);

	async function open(start: () => Promise<{ id: string }>) {
		if (opening) return;
		opening = true;
		try {
			onOpened((await start()).id);
		} catch (error) {
			toast.error(chatOpenError(error));
		} finally {
			opening = false;
		}
	}

	return {
		get opening() {
			return opening;
		},
		/** A team inbox; `participantId` when the team writes to someone */
		inbox: ({ option, participantId }: { option: ChatInboxRow; participantId?: string }) =>
			open(() =>
				client.mutate.openTeamChat({
					__args: {
						conferenceId: conferenceId(),
						inbox: option.inbox,
						committeeId: option.committeeId,
						trustedPersonId: option.trustedPersonId,
						participantId
					},
					id: true
				})
			),
		delegation: () =>
			open(() =>
				client.mutate.openDelegationChat({ __args: { conferenceId: conferenceId() }, id: true })
			),
		direct: (participantId: string) =>
			open(() =>
				client.mutate.openDirectChat({
					__args: { conferenceId: conferenceId(), participantId },
					id: true
				})
			)
	};
}
