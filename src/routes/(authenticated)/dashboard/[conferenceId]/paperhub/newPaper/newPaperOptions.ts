import type { PapertypeEnum } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';

interface Option<V extends string = string> {
	value: V;
	label: string;
}

/** Non-state actors may also write introduction papers; nations only write position papers. */
export function paperTypeOptions(isNSA: boolean): Option<PapertypeEnum>[] {
	const positionPaper: Option<PapertypeEnum> = {
		value: 'POSITION_PAPER',
		label: m.paperTypePositionPaper()
	};
	return isNSA
		? [{ value: 'INTRODUCTION_PAPER', label: m.paperTypeIntroductionPaper() }, positionPaper]
		: [positionPaper];
}

/**
 * The agenda items a new paper can be about. Non-state actors sit in no committee, so they pick
 * from the whole conference; an introduction paper spans committees; everyone else picks from
 * their own committee.
 */
export function agendaItemOptions({
	isNSA,
	type,
	conferenceAgendaItems,
	committeeAgendaItems
}: {
	isNSA: boolean;
	type: PapertypeEnum;
	conferenceAgendaItems: { id: string; title: string; committee: { abbreviation: string } }[];
	committeeAgendaItems: { id: string; title: string }[] | undefined;
}): Option[] {
	if (isNSA) {
		return conferenceAgendaItems
			.map((item) => ({
				value: item.id,
				label: `${item.committee.abbreviation}: ${item.title}`
			}))
			.sort((a, b) => a.label.localeCompare(b.label));
	}
	if (type === 'INTRODUCTION_PAPER') {
		return [{ value: 'INTRODUCTION_PAPER', label: m.paperAcrossCommittees() }];
	}
	return (committeeAgendaItems ?? []).map((item) => ({ value: item.id, label: item.title }));
}

/** Introduction papers span committees, so they are saved without an agenda item. */
export function newPaperAgendaItemId(type: PapertypeEnum, agendaItemId: string | undefined) {
	return type === 'INTRODUCTION_PAPER' ? undefined : agendaItemId;
}

/** Why a new paper cannot be saved yet, or null if it can. */
export function newPaperSaveError(
	type: PapertypeEnum,
	agendaItemId: string | undefined,
	content: unknown
): string | null {
	if (!agendaItemId && type !== 'INTRODUCTION_PAPER') return m.paperAgendaItemRequired();
	if (content === undefined) return m.paperContentRequired();
	return null;
}
