import { client } from '#lib/api/rumbleClient/client';
import { iconPng, loadSheetAssets } from '#lib/api/nametagSheetImages';
import { downloadPdf } from '#lib/api/nametagSheetsPdf';
import { buildNsaCardsPdf } from '#lib/api/nsaCardsPdf';
import { m } from '#lib/paraglide/messages';

const cardSelection = {
	givenName: true,
	familyName: true,
	nsaName: true,
	nsaIcon: true,
	cardNumber: true,
	code: true
} as const;

interface Card {
	givenName: string;
	familyName: string;
	nsaName: string | null;
	nsaIcon: string | null;
	cardNumber: number;
	code: string;
}

async function download({
	conferenceId,
	cards,
	filename
}: {
	conferenceId: string;
	cards: readonly Card[];
	filename: string;
}) {
	const assets = await loadSheetAssets(conferenceId);
	const icons = new Map<string, Promise<Uint8Array>>();
	const iconOf = (icon: string | null) => {
		const key = icon ?? '';
		const known = icons.get(key) ?? iconPng(icon);
		icons.set(key, known);
		return known;
	};
	downloadPdf({
		bytes: await buildNsaCardsPdf({
			cards: await Promise.all(
				cards.map(async (card) => ({
					givenName: card.givenName,
					familyName: card.familyName,
					nsaName: card.nsaName,
					icon: await iconOf(card.nsaIcon),
					cardNumber: card.cardNumber,
					code: card.code
				}))
			),
			conferenceTitle: assets.conferenceTitle,
			logo: assets.logo,
			cardLabel: (cardNumber) => m.nsaCardNumberLabel({ number: cardNumber }),
			fonts: assets.fonts
		}),
		filename
	});
}

/** The cards of all the conference's NSA delegates, as one PDF to print and cut. */
export async function downloadNsaCards(conferenceId: string) {
	const cards = await client.mutate.issueNsaCards({ __args: { conferenceId }, ...cardSelection });
	await download({ conferenceId, cards: Array.from(cards), filename: 'nsa-cards.pdf' });
}

/** One person's card again, as it is (`reprint: false`), or a new one that voids the earlier. */
export async function downloadNsaCard({
	conferenceId,
	conferenceParticipantId,
	reprint
}: {
	conferenceId: string;
	conferenceParticipantId: string;
	reprint: boolean;
}) {
	const cards = reprint
		? [
				await client.mutate.reprintNsaCard({
					__args: { conferenceParticipantId },
					...cardSelection
				})
			]
		: Array.from(
				await client.mutate.issueNsaCards({
					__args: { conferenceId, conferenceParticipantIds: [conferenceParticipantId] },
					...cardSelection
				})
			);
	await download({ conferenceId, cards, filename: 'nsa-card.pdf' });
}
