import type { TeamroleEnum } from '#lib/api/rumbleClient/client';

/** A team member as the table shows them. */
export interface TeamMemberRow {
	id: string;
	userId: string;
	role: TeamroleEnum;
	family_name: string;
	given_name: string;
	email: string;
	phone: string | null;
	/** Everything the conference asks of its team on paper is filled in */
	profileComplete: boolean;
	joinedAt: Date;
}

type Maybe<T> = T | null | undefined;

/** A team member as the page fetches them. */
export interface TeamMemberEntry {
	id: string;
	role: TeamroleEnum;
	createdAt: Date | string;
	user: {
		id: string;
		givenName: string;
		familyName: string;
		email: string;
		birthday?: Maybe<Date | string>;
		phone?: Maybe<string>;
		street?: Maybe<string>;
		zip?: Maybe<string>;
		city?: Maybe<string>;
		country?: Maybe<string>;
		gender?: Maybe<string>;
		foodPreference?: Maybe<string>;
	};
}

const filled = (value: Maybe<string | Date>) =>
	value instanceof Date || (typeof value === 'string' && value.trim() !== '');

/**
 * Whether a profile holds everything the conference asks of its team on paper: birthday, phone,
 * address, gender and food preference.
 */
export function isProfileComplete(user: TeamMemberEntry['user']) {
	const { birthday, phone, street, zip, city, country, gender, foodPreference } = user;
	return [birthday, phone, street, zip, city, country, gender, foodPreference].every(filled);
}

/** One table row. */
export function toTeamMemberRow(member: TeamMemberEntry): TeamMemberRow {
	return {
		id: member.id,
		userId: member.user.id,
		role: member.role,
		family_name: member.user.familyName,
		given_name: member.user.givenName,
		email: member.user.email,
		phone: member.user.phone ?? null,
		profileComplete: isProfileComplete(member.user),
		joinedAt: new Date(member.createdAt)
	};
}
