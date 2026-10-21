import { splitRole } from '#lib/helpers/conferenceRole.js';
import { paperEntityName, type PaperDelegationRole } from './paperDisplay';

/** The delegation fields a paper is grouped and labelled by. */
interface GroupablePaper {
	delegation: {
		id: string;
		assignedRole: PaperDelegationRole | null;
	};
}

export interface DelegationPaperGroup<P> {
	delegationId: string;
	delegationName: string;
	alpha2Code?: string;
	nsa?: boolean;
	icon?: string | null;
	papers: P[];
}

/** The papers grouped by their delegation, groups sorted by the delegation's name. */
export function groupPapersByDelegation<P extends GroupablePaper>(
	papers: P[]
): DelegationPaperGroup<P>[] {
	const groups = new Map<string, DelegationPaperGroup<P>>();

	for (const paper of papers) {
		const { delegation } = paper;
		let group = groups.get(delegation.id);
		if (!group) {
			const { nation, nonStateActor: nsa } = splitRole(delegation.assignedRole);
			group = {
				delegationId: delegation.id,
				delegationName: paperEntityName(delegation) ?? 'Unknown',
				alpha2Code: nation?.alpha2Code,
				nsa: !!nsa,
				icon: nsa?.fontAwesomeIcon,
				papers: []
			};
			groups.set(delegation.id, group);
		}
		group.papers.push(paper);
	}

	return [...groups.values()].sort((a, b) => a.delegationName.localeCompare(b.delegationName));
}
