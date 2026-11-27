import { withoutBlankPoints } from '#lib/schemata/discussionPoints';
import type { AgendaItem } from './types';

export type AgendaItemDraft = { title: string; teaserText: string; discussionPoints: string[] };

/**
 * What the edit dialog sends: only the fields that differ from the stored agenda item, so a field
 * left alone keeps what someone else may have saved meanwhile. Points compare without blank ones;
 * clearing them all sends `[]`.
 */
export function agendaItemChanges({
	stored,
	draft
}: {
	stored: Pick<AgendaItem, 'title' | 'teaserText' | 'discussionPoints'>;
	draft: AgendaItemDraft;
}) {
	const points = withoutBlankPoints(draft.discussionPoints);
	const pointsChanged =
		JSON.stringify(points) !== JSON.stringify(withoutBlankPoints(stored.discussionPoints));
	return {
		title: draft.title !== stored.title ? draft.title : undefined,
		teaserText: draft.teaserText !== (stored.teaserText ?? '') ? draft.teaserText : undefined,
		discussionPoints: pointsChanged ? points : undefined
	};
}
