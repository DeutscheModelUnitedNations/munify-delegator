export type ParticipationRole =
	| 'SUPERVISOR'
	| 'SINGLE_PARTICIPANT'
	| 'DELEGATION_MEMBER'
	| 'TEAM_MEMBER';

export interface ParticipantRow {
	id: string;
	given_name: string;
	family_name: string;
	email: string | null;
	role: ParticipationRole;
}
