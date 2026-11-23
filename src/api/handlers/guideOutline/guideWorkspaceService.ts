import { db } from '#api/db/db';
import { guidePageState } from '#lib/guide/library';
import { parseOutline } from '#lib/guide/outline';
import {
	committeeMatrix,
	committeeProgress,
	outlineChanged,
	pendingPages,
	visibilityRows,
	type MatrixCommittee,
	type ReaderGroup,
	type WorkspacePage
} from '#lib/guide/workspace';
import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';
import { guidePageIdsReaching } from '../guidePage/guidePageService';

/**
 * The team workspace's views of a conference's guide (`team/guide`), computed on the server for
 * the API and assistants: who sees what, the committee matrix, and what waits to be published.
 * The computing is `#lib/guide/workspace`, which the app uses too.
 */

/** The pages reaching the conference, the committees with their agenda items, the custom roles. */
async function workspaceOf(conferenceId: string) {
	const pageIds = await guidePageIdsReaching(conferenceId);
	const [pages, committees, roles, outline] = await Promise.all([
		db.query.guidePage.findMany({
			where: { id: { in: pageIds } },
			columns: {
				id: true,
				title: true,
				kind: true,
				committeeId: true,
				agendaItemId: true,
				draftUpdatedAt: true
			},
			with: { publishedVersion: { columns: { createdAt: true } } },
			orderBy: { title: 'asc' }
		}),
		db.query.committee.findMany({
			where: { conferenceId },
			columns: { id: true, name: true, abbreviation: true },
			with: {
				agendaItems: { columns: { id: true, title: true }, orderBy: { createdAt: 'asc' } }
			},
			orderBy: { createdAt: 'asc' }
		}),
		db.query.conferenceRole.findMany({
			where: { conferenceId, kind: 'CUSTOM' },
			columns: { id: true, name: true },
			orderBy: { name: 'asc' }
		}),
		db.query.guideOutline.findFirst({
			where: { conferenceId },
			columns: { draft: true, published: true }
		})
	]);
	return {
		pages: pages.map((page): WorkspacePage => ({
			id: page.id,
			title: page.title,
			kind: page.kind,
			committeeId: page.committeeId,
			agendaItemId: page.agendaItemId,
			state: guidePageState({
				publishedAt: page.publishedVersion?.createdAt,
				draftUpdatedAt: page.draftUpdatedAt
			})
		})),
		committees: committees satisfies MatrixCommittee[],
		roles: roles.map((role) => ({ id: role.id, name: role.name ?? '' })),
		draft: parseOutline(outline?.draft),
		published: outline?.published ?? null
	};
}

/** The reader groups the visibility table has a column for, with the custom roles' names. */
function readerGroups(roles: readonly { id: string; name: string }[]) {
	const groups: { group: ReaderGroup; roleName: string | null }[] = [
		{ group: { type: 'delegates' }, roleName: null },
		{ group: { type: 'nonStateActors' }, roleName: null },
		...roles.map((role) => ({
			group: { type: 'customRole' as const, roleId: role.id },
			roleName: role.name
		})),
		{ group: { type: 'supervisors' }, roleName: null }
	];
	return groups;
}

/**
 * Who sees what of the draft (or the published) sidebar: a row per section, entry with its own
 * audience and the committee template, a cell per reader group.
 */
export async function guideVisibility({
	conferenceId,
	draft
}: {
	conferenceId: string;
	draft: boolean;
}) {
	const workspace = await workspaceOf(conferenceId);
	const outline = draft ? workspace.draft : parseOutline(workspace.published);
	const groups = readerGroups(workspace.roles);
	const titles = new Map(workspace.pages.map((page) => [page.id, page.title]));
	const rows = visibilityRows({
		outline,
		groups: groups.map((entry) => entry.group),
		titles: {
			template: m.guideCommitteeTemplate(),
			page: (pageId) => titles.get(pageId) ?? pageId
		}
	});
	return {
		groups: groups.map(({ group, roleName }) => ({
			type: group.type,
			roleId: group.type === 'customRole' ? group.roleId : null,
			roleName
		})),
		rows: rows.map((row) => ({
			kind: row.kind,
			key: row.key,
			title: row.title,
			sectionId: row.section === null ? null : (outline.sections[row.section]?.id ?? null),
			cells: row.cells
		}))
	};
}

/**
 * The draft's committee template against the committees: a row per slot (agenda item pages one
 * per agenda item number), the pages' states and what is missing, and each committee's progress.
 */
export async function guideCommitteeMatrix(conferenceId: string) {
	const { pages, committees, draft } = await workspaceOf(conferenceId);
	const rows = committeeMatrix({ slots: draft.committeeTemplate?.slots, committees, pages });
	const progress = committeeProgress(rows, committees.length);
	return {
		hasTemplate: Boolean(draft.committeeTemplate),
		committees: committees.map((committee, index) => ({
			id: committee.id,
			name: committee.name,
			abbreviation: committee.abbreviation,
			...progress[index]
		})),
		rows: rows.map((row) => ({
			kind: row.kind,
			key: row.key,
			label: row.kind === 'agendaItem' ? null : row.label,
			number: row.kind === 'agendaItem' ? row.number : null,
			page: row.kind === 'shared' ? row.page : null,
			cells:
				row.kind === 'shared'
					? []
					: row.cells.map((cell) => ({
							kind: cell.kind,
							pageId: cell.kind === 'page' ? cell.pageId : null,
							title: cell.kind === 'none' ? null : cell.title,
							state: cell.kind === 'page' ? cell.state : null,
							committeeId:
								cell.kind === 'missing' && 'committeeId' in cell.owner
									? cell.owner.committeeId
									: null,
							agendaItemId:
								cell.kind === 'missing' && 'agendaItemId' in cell.owner
									? cell.owner.agendaItemId
									: null
						}))
		}))
	};
}

/**
 * What "Publish changes" publishes: the pages the draft sidebar uses that are not published as
 * they stand, and whether the sidebar draft differs from what is published.
 */
export async function guidePendingChanges(conferenceId: string) {
	const { pages, draft, published } = await workspaceOf(conferenceId);
	return {
		pages: pendingPages({ outline: draft, pages, locale: getLocale() }).map((page) => ({
			id: page.id,
			title: page.title,
			kind: page.kind,
			state: page.state
		})),
		sidebarChanged: outlineChanged({ draft, published }),
		sidebarPublished: published !== null
	};
}
