import { getContext, setContext } from 'svelte';

const key = Symbol('applyFlowInteraction');

/**
 * Whether the person has done anything in the application form yet. Steps that are open when the
 * page loads (a link chose the path) stay where they are; only steps opened by the person scroll
 * into view.
 */
export interface FlowInteraction {
	readonly started: boolean;
}

export function setFlowInteraction(interaction: FlowInteraction) {
	setContext(key, interaction);
}

export function getFlowInteraction(): FlowInteraction | undefined {
	return getContext<FlowInteraction | undefined>(key);
}
