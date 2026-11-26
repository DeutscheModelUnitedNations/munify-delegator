import type { ChatGroupRow } from '#lib/api/chats';
import type { GroupLabelSource } from './chatLabels';

/** A group the caller is in (`chatGroups`), as the labels read a group chat. */
export function groupLabelSource(
	group: Pick<ChatGroupRow, 'kind' | 'committeeAbbreviation' | 'roleName' | 'roleIcon'>
): GroupLabelSource {
	return {
		kind: group.kind === 'ROLE' ? 'ROLE' : 'COMMITTEE',
		committee: group.committeeAbbreviation ? { abbreviation: group.committeeAbbreviation } : null,
		role: { name: group.roleName ?? null, icon: group.roleIcon }
	};
}
