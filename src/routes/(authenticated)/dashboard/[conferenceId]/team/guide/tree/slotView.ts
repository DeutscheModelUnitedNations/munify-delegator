import type { TemplateSlot } from '#lib/guide/outline';
import type { WorkspacePage } from '#lib/guide/workspace';

/**
 * What a template slot's row in the tree shows: a page slot its page (under its own title, if it
 * has one), a placeholder what it stands for.
 */
export function slotView({
	slot,
	pageOf,
	texts
}: {
	slot: TemplateSlot;
	pageOf: (pageId: string) => WorkspacePage | undefined;
	texts: { missing: string; committeePage: string; agendaItemPages: string };
}): { title: string; page: WorkspacePage | undefined } {
	switch (slot.type) {
		case 'page': {
			const page = pageOf(slot.pageId);
			return { title: slot.label || page?.title || texts.missing, page };
		}
		case 'committeePage':
			return { title: slot.label || texts.committeePage, page: undefined };
		case 'agendaItemPages':
			return { title: texts.agendaItemPages, page: undefined };
	}
}
