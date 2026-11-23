import { client } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { guidePageState } from '#lib/guide/library';
import type { MatrixCommittee, WorkspacePage } from '#lib/guide/workspace';

/**
 * The queries the guide workspace's parts share (each part runs its own; graphcache merges them),
 * and the shapes `#lib/guide/workspace` computes with.
 */

/** Every page reaching the conference, with what the tree and the tables show of it. */
export function fetchWorkspaceLibrary(conferenceId: string) {
	return client.liveQuery.guideLibrary({
		__args: { conferenceId },
		title: true,
		kind: true,
		scope: true,
		draftUpdatedAt: true,
		committeeId: true,
		agendaItemId: true,
		publishedVersion: { createdAt: true }
	});
}

/** The committees with their agenda items, for the template's pages. */
export function fetchWorkspaceCommittees(conferenceId: string) {
	return client.liveQuery.committees({
		__args: { where: { conferenceId: { eq: conferenceId } }, orderBy: { createdAt: 'asc' } },
		name: true,
		abbreviation: true,
		agendaItems: { title: true, createdAt: true }
	});
}

type LibraryRow = {
	id: string;
	title: string;
	kind: WorkspacePage['kind'];
	draftUpdatedAt: Date | string;
	committeeId?: string | null;
	agendaItemId?: string | null;
	publishedVersion?: { createdAt: Date | string } | null;
};

export function toWorkspacePages(rows: readonly LibraryRow[]): WorkspacePage[] {
	return rows.map((row) => ({
		id: row.id,
		title: row.title,
		kind: row.kind,
		committeeId: row.committeeId ?? null,
		agendaItemId: row.agendaItemId ?? null,
		state: guidePageState({
			publishedAt: row.publishedVersion?.createdAt,
			draftUpdatedAt: row.draftUpdatedAt
		})
	}));
}

type CommitteeRow = {
	id: string;
	name: string;
	abbreviation: string;
	agendaItems: readonly { id: string; title: string; createdAt: Date | string }[];
};

/** The committees with their agenda items in the order they were added (the agenda's order). */
export function toMatrixCommittees(rows: readonly CommitteeRow[]): MatrixCommittee[] {
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		abbreviation: row.abbreviation,
		agendaItems: row.agendaItems
			.toSorted((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
			.map((item) => ({ id: item.id, title: item.title }))
	}));
}

/** The conference's custom roles, for audiences. */
export function fetchCustomRoles(conferenceId: string) {
	return client.liveQuery.conferenceRoles({
		__args: { where: { conferenceId: { eq: conferenceId }, kind: 'CUSTOM' } },
		name: true
	});
}

export function toRoleOptions(rows: readonly { id: string; name?: string | null }[]) {
	return rows.map((row) => ({ id: row.id, name: row.name ?? '' }));
}

/** The toast of creating a page (a general one, or a committee's or agenda item's). */
export const pageCreatedToast = {
	loading: m.genericToastLoading(),
	success: m.guidePageCreated(),
	error: (error: unknown) => (error instanceof Error ? error.message : m.genericToastError())
};

/** What the workspace's views of the whole guide need: the pages, committees and custom roles. */
export function fetchWorkspace(conferenceId: string) {
	return Promise.all([
		fetchWorkspaceLibrary(conferenceId),
		fetchWorkspaceCommittees(conferenceId),
		fetchCustomRoles(conferenceId)
	]);
}

/** `fetchWorkspace`'s results in the shapes `#lib/guide/workspace` computes with. */
export function toWorkspace([library, committees, roles]: Awaited<
	ReturnType<typeof fetchWorkspace>
>) {
	return {
		pages: toWorkspacePages(library),
		committees: toMatrixCommittees(committees),
		roles: toRoleOptions(roles)
	};
}
