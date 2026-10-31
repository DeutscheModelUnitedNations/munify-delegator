/** A registration as the school page reads it: whether it was sent, and whether it holds a role. */
interface Registration {
	applied: boolean;
	assignedRoleId?: string | null;
}

/** One person of the school in a conference, as `conferenceParticipants` answers them. */
export interface SchoolParticipantRow {
	didAttend: boolean;
	user: { id: string; givenName: string; familyName: string };
	delegationMember?: { isHeadDelegate: boolean; delegation: Registration } | null;
	singleParticipant?: Registration | null;
	conferenceSupervisor?: { id: string } | null;
}

export type SchoolPersonKind = 'DELEGATION_MEMBER' | 'SINGLE_PARTICIPANT' | 'SUPERVISOR';
export type SchoolPersonStage = 'REGISTERED' | 'APPLIED' | 'SEATED';

export interface SchoolPerson {
	userId: string;
	givenName: string;
	familyName: string;
	kind: SchoolPersonKind;
	isHeadDelegate: boolean;
	/** How far the person's application got; supervisors have none */
	stage?: SchoolPersonStage;
	didAttend: boolean;
}

const stageOf = (registration: Registration): SchoolPersonStage =>
	registration.assignedRoleId ? 'SEATED' : registration.applied ? 'APPLIED' : 'REGISTERED';

/**
 * The people a school has in one conference, by family name. A participant row without any
 * registration (kept only for a paper or a payment) is nobody the school has there.
 */
export function schoolPeople(rows: readonly SchoolParticipantRow[]): SchoolPerson[] {
	const people: SchoolPerson[] = [];
	for (const row of rows) {
		const base = {
			userId: row.user.id,
			givenName: row.user.givenName,
			familyName: row.user.familyName,
			didAttend: row.didAttend
		};
		if (row.delegationMember) {
			people.push({
				...base,
				kind: 'DELEGATION_MEMBER',
				isHeadDelegate: row.delegationMember.isHeadDelegate,
				stage: stageOf(row.delegationMember.delegation)
			});
		} else if (row.singleParticipant) {
			people.push({
				...base,
				kind: 'SINGLE_PARTICIPANT',
				isHeadDelegate: false,
				stage: stageOf(row.singleParticipant)
			});
		} else if (row.conferenceSupervisor) {
			people.push({ ...base, kind: 'SUPERVISOR', isHeadDelegate: false });
		}
	}
	return people.sort(
		(a, b) => a.familyName.localeCompare(b.familyName) || a.givenName.localeCompare(b.givenName)
	);
}
