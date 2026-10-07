/** Pure decisions behind the application sighting page. */

/** Whether the item at `index` falls on the given 1-based page. */
export function isOnPage(index: number, page: number, pageSize: number): boolean {
	return index >= (page - 1) * pageSize && index < page * pageSize;
}

/** Whether a school filter selects an application's school; no school matches the empty entry. */
export function isSchoolSelected(
	filter: readonly string[] | null | undefined,
	school: string | undefined
): boolean | undefined {
	return filter?.includes(school ?? '');
}

interface SupervisedApplication {
	supervisors?: readonly { id: string }[];
	members?: readonly { supervisors?: readonly { id: string }[] }[];
}

/**
 * The supervisors of an application: a single participant's own, or else those of every
 * delegation member.
 */
export function supervisorIdsOf(application: SupervisedApplication): string[] {
	const ids =
		application.supervisors?.map((sp) => sp.id) ??
		application.members?.flatMap((m) => m.supervisors?.map((sp) => sp.id)) ??
		[];
	return ids.filter((id): id is string => Boolean(id));
}
