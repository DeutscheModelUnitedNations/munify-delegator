import { m } from '#lib/paraglide/messages';
import type { WriteRefusal } from './chat';

/** Why a chat cannot be written in right now, as the API refuses it and the thread says it. */
const REFUSALS: Record<WriteRefusal, () => string> = {
	DISABLED: () => m.chatRefusedDisabled(),
	NOT_RELEASED: () => m.chatRefusedNotReleased(),
	NOT_SEATED: () => m.chatRefusedNotSeated(),
	SUSPENDED: () => m.chatRefusedSuspended(),
	BLOCKED: () => m.chatRefusedBlocked(),
	REVIEW: () => m.chatRefusedReview()
};

const isRefusal = (value: string): value is WriteRefusal => value in REFUSALS;

/** The text for a refusal; one the app does not know (`chat.writeRefusal` is a string) reads as switched off. */
export function refusalText(refusal: string) {
	return REFUSALS[isRefusal(refusal) ? refusal : 'DISABLED']();
}
