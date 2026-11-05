import { client } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import BadgeCell from '#lib/components/dataGrid/cells/BadgeCell.svelte';
import { cellOf, defineColumns } from '#lib/components/dataGrid/gridColumn';
import { TEAM_MEMBERS_COLUMNS } from '#lib/dataGrid/tables/teamMembers';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import type { TeamMemberRow } from './teamMemberRows';
import TeamRoleCell from './TeamRoleCell.svelte';

/** The team table's columns: the API's metadata (`TEAM_MEMBERS_COLUMNS`) with labels and cells. */
export function teamMemberColumns() {
	return defineColumns<TeamMemberRow, (typeof TEAM_MEMBERS_COLUMNS)[number]>({
		metas: TEAM_MEMBERS_COLUMNS,
		extras: {
			family_name: { label: m.familyName(), alwaysVisible: true, value: (row) => row.family_name },
			given_name: { label: m.givenName(), value: (row) => row.given_name },
			email: { label: m.email(), size: 240, value: (row) => row.email },
			phone: { label: m.phone(), defaultVisible: false, value: (row) => row.phone },
			role: {
				label: m.role(),
				size: 200,
				optionLabel: translateTeamRole,
				value: (row) => row.role,
				cell: (row) =>
					cellOf({
						component: TeamRoleCell,
						props: {
							role: row.role,
							onChange: (role) =>
								Promise.resolve(
									client.mutate.updateTeamMemberRole({ __args: { id: row.id, role }, role: true })
								)
						}
					}),
				exportValue: (row) => translateTeamRole(row.role)
			},
			profileComplete: {
				label: m.profileStatus(),
				value: (row) => row.profileComplete,
				cell: (row) =>
					row.profileComplete
						? cellOf({
								component: BadgeCell,
								props: { label: m.complete(), variant: 'badge-success' }
							})
						: cellOf({
								component: BadgeCell,
								props: {
									label: m.incomplete(),
									variant: 'badge-warning',
									title: m.profileIncompleteHint()
								}
							}),
				exportValue: (row) => (row.profileComplete ? m.complete() : m.incomplete())
			},
			joinedAt: {
				label: m.dataGridJoinedTeam(),
				defaultVisible: false,
				value: (row) => row.joinedAt
			}
		}
	});
}
