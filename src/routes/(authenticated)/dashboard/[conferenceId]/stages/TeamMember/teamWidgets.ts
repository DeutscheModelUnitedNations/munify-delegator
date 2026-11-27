import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';
import { mayOpenTeamRoute, teamRoutes } from '#lib/data/teamRoutes';
import { isOnTeam } from '#lib/helpers/teamAccess';
import type { WaitingAccess } from './teamWaiting';

/**
 * The widgets of the team's overview: one block per question the team asks in a stage of the
 * conference ("how many have paid?", "what is on now?"), each linking to the page where it is
 * answered. Which show, how large and in which order follows from the conference's state and the
 * pages the caller may open, nothing else; `widgetsFor` decides it and is tested.
 */

export type WidgetId =
	| 'timeline'
	| 'participants'
	| 'payments'
	| 'committees'
	| 'papers'
	| 'communication'
	| 'readiness'
	| 'now'
	| 'entrance'
	| 'messages'
	| 'wrapUp';

/** Large widgets lead the overview and take a whole row on wide screens; compact ones follow. */
export type WidgetSize = 'large' | 'compact';

interface WidgetDefinition {
	id: WidgetId;
	/**
	 * The team pages it summarises: shown to whoever may open at least one of them. Absent: the
	 * whole team.
	 */
	routeIds?: readonly string[];
	/** Its size in each state of the conference; a state that is absent hides it */
	stages: Partial<Record<ConferencestateEnum, WidgetSize>>;
}

/** In the order they appear within one size. */
const WIDGETS: readonly WidgetDefinition[] = [
	{
		id: 'now',
		stages: { ACTIVE: 'large' }
	},
	{
		id: 'timeline',
		stages: {
			PRE: 'large',
			PARTICIPANT_REGISTRATION: 'large',
			PREPARATION: 'large',
			ACTIVE: 'compact',
			POST: 'compact'
		}
	},
	{
		id: 'wrapUp',
		routeIds: ['payments'],
		stages: { POST: 'large' }
	},
	{
		id: 'entrance',
		routeIds: ['checkIn'],
		stages: { ACTIVE: 'large' }
	},
	{
		id: 'messages',
		routeIds: ['messages'],
		stages: { PREPARATION: 'compact', ACTIVE: 'large', POST: 'compact' }
	},
	{
		id: 'readiness',
		routeIds: ['settings'],
		stages: { PRE: 'large', PARTICIPANT_REGISTRATION: 'compact', PREPARATION: 'large' }
	},
	{
		id: 'participants',
		routeIds: ['participants'],
		stages: { PARTICIPANT_REGISTRATION: 'large', PREPARATION: 'compact' }
	},
	{
		id: 'payments',
		routeIds: ['payments'],
		stages: {
			PARTICIPANT_REGISTRATION: 'compact',
			PREPARATION: 'large',
			ACTIVE: 'compact'
		}
	},
	{
		id: 'committees',
		routeIds: ['assignment'],
		stages: { PARTICIPANT_REGISTRATION: 'compact', PREPARATION: 'large' }
	},
	{
		id: 'papers',
		routeIds: ['paperHub'],
		stages: { PREPARATION: 'large', ACTIVE: 'compact' }
	},
	{
		id: 'communication',
		routeIds: ['emails', 'announcement'],
		stages: {
			PRE: 'compact',
			PARTICIPANT_REGISTRATION: 'large',
			PREPARATION: 'large',
			ACTIVE: 'compact',
			POST: 'compact'
		}
	}
];

export interface PlacedWidget {
	id: WidgetId;
	size: WidgetSize;
}

/** Whether the caller may open the team page with this id (an unknown id: no) */
export function mayOpen({ routeId, access }: { routeId: string; access: WaitingAccess }) {
	const route = teamRoutes.find((entry) => entry.id === routeId);
	return !!route && mayOpenTeamRoute({ route, access });
}

function visible({ widget, access }: { widget: WidgetDefinition; access: WaitingAccess }) {
	if (!widget.routeIds) return isOnTeam(access);
	return widget.routeIds.some((routeId) => mayOpen({ routeId, access }));
}

/** The caller's widgets in a state of the conference: large ones first, each in registry order. */
export function widgetsFor({
	state,
	access
}: {
	state: ConferencestateEnum;
	access: WaitingAccess;
}): PlacedWidget[] {
	const placed = WIDGETS.flatMap((widget) => {
		const size = widget.stages[state];
		return size && visible({ widget, access }) ? [{ id: widget.id, size }] : [];
	});
	return [
		...placed.filter((widget) => widget.size === 'large'),
		...placed.filter((widget) => widget.size === 'compact')
	];
}

/**
 * The tiles of what waits for the caller that a large widget already shows: while the messages
 * widget leads, the unread messages and reported chats leave the tiles.
 */
export function tilesShownByWidgets(widgets: readonly PlacedWidget[]) {
	const messages = widgets.find((widget) => widget.id === 'messages');
	return messages?.size === 'large' ? (['unreadMessages', 'reportedChats'] as const) : [];
}
