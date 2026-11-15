import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/**
 * The version of the message service's terms (`messagingTermsSections`). Raise it whenever their
 * meaning changes: everybody is then asked to accept them again before their next message.
 */
export const MESSAGING_TERMS_VERSION = 1;

/** Whether somebody who accepted `version` of the terms has accepted them as they stand. */
export function acceptedMessagingTerms(version: number | null | undefined) {
	return version === MESSAGING_TERMS_VERSION;
}

/** Whether a scrolling element shows its end, give or take a few pixels of rounding. */
export function scrolledToEnd({
	scrollTop,
	clientHeight,
	scrollHeight
}: {
	scrollTop: number;
	clientHeight: number;
	scrollHeight: number;
}) {
	return scrollTop + clientHeight >= scrollHeight - 8;
}

/** The version an acceptance names: the current one, so nobody accepts a text they were not shown. */
export const messagingTermsVersionSchema = z
	.number()
	.refine((version) => version === MESSAGING_TERMS_VERSION, {
		error: () => m.chatTermsOutdated()
	});

interface TermsSection {
	icon: string;
	title: string;
	paragraphs: string[];
}

/** The terms of the message service, in the reader's language. */
export function messagingTermsSections(): TermsSection[] {
	return [
		{
			icon: 'chats-circle',
			title: m.chatTermsPurposeTitle(),
			paragraphs: [m.chatTermsPurposeText(), m.chatTermsPurposeEmergency()]
		},
		{
			icon: 'handshake',
			title: m.chatTermsConductTitle(),
			paragraphs: [
				m.chatTermsConductRespect(),
				m.chatTermsConductDiscrimination(),
				m.chatTermsConductContent(),
				m.chatTermsConductPrivacy()
			]
		},
		{
			icon: 'eye',
			title: m.chatTermsReadersTitle(),
			paragraphs: [
				m.chatTermsReadersParticipants(),
				m.chatTermsReadersReport(),
				m.chatTermsReadersTeam(),
				m.chatTermsReadersTrusted(),
				m.chatTermsReadersOperation()
			]
		},
		{
			icon: 'shield-check',
			title: m.chatTermsProtectionTitle(),
			paragraphs: [m.chatTermsProtectionText()]
		},
		{
			icon: 'warning',
			title: m.chatTermsConsequencesTitle(),
			paragraphs: [m.chatTermsConsequencesText()]
		},
		{
			icon: 'database',
			title: m.chatTermsStorageTitle(),
			paragraphs: [m.chatTermsStorageText(), m.chatTermsStorageMails()]
		}
	];
}
