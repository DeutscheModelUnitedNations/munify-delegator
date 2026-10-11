import formatNames from '$lib/helpers/formatNames';

/** Pure helpers behind the survey CSV exports. */

export interface ExportUser {
	id: string;
	givenName: string | null;
	familyName: string | null;
	email: string | null;
	pronouns: string | null;
	birthday: Date | null;
}

export interface ExportDelegationMember {
	user: ExportUser;
	delegation: {
		assignedNation: { alpha3Code: string } | null;
		assignedNonStateActor: { name: string } | null;
	};
	assignedCommittee: { name: string } | null;
}

export interface ExportSingleParticipant {
	user: ExportUser;
	assignedRole: { name: string } | null;
}

export interface RoleInfo {
	roleType: string;
	roleName: string;
	committee: string;
}

const noRole: RoleInfo = { roleType: '', roleName: '', committee: '' };

function delegationMemberRole(
	dm: ExportDelegationMember,
	nationName: (alpha3Code: string) => string
): RoleInfo | undefined {
	const { assignedNation: nation, assignedNonStateActor: nsa } = dm.delegation;
	if (nation) {
		return {
			roleType: 'Delegation',
			roleName: nationName(nation.alpha3Code),
			committee: dm.assignedCommittee?.name ?? ''
		};
	}
	if (nsa) return { roleType: 'NSA', roleName: nsa.name, committee: '' };
	return undefined;
}

/**
 * The seat every assigned participant holds, by user id. A single participant's role wins over a
 * delegation seat of the same user.
 */
export function buildUserRoleMap(
	delegationMembers: readonly ExportDelegationMember[],
	singleParticipants: readonly ExportSingleParticipant[],
	nationName: (alpha3Code: string) => string
): Map<string, RoleInfo> {
	const userRoleMap = new Map<string, RoleInfo>();
	for (const dm of delegationMembers) {
		const role = delegationMemberRole(dm, nationName);
		if (role) userRoleMap.set(dm.user.id, role);
	}
	for (const sp of singleParticipants) {
		if (sp.assignedRole) {
			userRoleMap.set(sp.user.id, {
				roleType: 'SingleParticipant',
				roleName: sp.assignedRole.name,
				committee: ''
			});
		}
	}
	return userRoleMap;
}

/** The role of a user, or empty columns for someone without a seat. */
export function roleInfoOf(userRoleMap: ReadonlyMap<string, RoleInfo>, userId: string): RoleInfo {
	return userRoleMap.get(userId) ?? noRole;
}

/** A birthday as YYYY-MM-DD, or an empty cell. */
export function formatBirthday(birthday: Date | null): string {
	if (!birthday) return '';
	return new Date(birthday).toISOString().split('T')[0];
}

/** A user data row for CSV export, matching the user headers, plus any extra columns. */
export function buildUserRow(
	user: ExportUser,
	roleInfo: RoleInfo,
	additionalColumns: string[] = []
): string[] {
	return [
		user.id,
		user.familyName ?? '',
		user.givenName ?? '',
		user.email ?? '',
		user.pronouns ?? '',
		formatBirthday(user.birthday),
		roleInfo.roleType,
		roleInfo.roleName,
		roleInfo.committee,
		...additionalColumns
	];
}

/** Sorts CSV rows built by `buildUserRow` by family name. */
export function byFamilyName(a: string[], b: string[]) {
	return a[1].localeCompare(b[1]);
}

/** Everyone holding a seat who has not answered, each once, delegation members first. */
export function collectNotAnswered(
	answeredUserIds: ReadonlySet<string>,
	participants: readonly { user: ExportUser }[],
	userRoleMap: ReadonlyMap<string, RoleInfo>
): { user: ExportUser; roleInfo: RoleInfo }[] {
	const result: { user: ExportUser; roleInfo: RoleInfo }[] = [];
	const seen = new Set<string>();
	for (const { user } of participants) {
		const roleInfo = userRoleMap.get(user.id);
		if (answeredUserIds.has(user.id) || seen.has(user.id) || !roleInfo) continue;
		seen.add(user.id);
		result.push({ user, roleInfo });
	}
	return result;
}

/** Sorts people by their displayed name, "Given Family". */
export function compareByDisplayName(
	a: { givenName: string | null; familyName: string | null },
	b: { givenName: string | null; familyName: string | null }
): number {
	return displayName(a).localeCompare(displayName(b));
}

function displayName(user: { givenName: string | null; familyName: string | null }) {
	return formatNames(user.givenName ?? undefined, user.familyName ?? undefined);
}
