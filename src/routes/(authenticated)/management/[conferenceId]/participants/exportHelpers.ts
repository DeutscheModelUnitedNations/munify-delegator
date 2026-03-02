import type { ColumnDef } from '$lib/components/TanStackTable';
import { m } from '$lib/paraglide/messages';
import { capitalizeFirstLetter } from '$lib/services/capitalizeFirstLetter';
import {
	translateGender,
	translateTeamRole,
	translateAdministrativeStatus,
	translateParticipationRole,
	translateFoodPreference
} from '$lib/services/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
import type { ParticipantRow } from './types';

function booleanText(value: boolean | null): string {
	if (value === null || value === undefined) return '';
	return value ? m.yes() : m.no();
}

function statusText(value: string | null): string {
	if (!value) return '';
	return translateAdministrativeStatus(value);
}

export function getPlainTextValue(row: ParticipantRow, columnId: string): string {
	switch (columnId) {
		case 'userId':
			return row.userId;
		case 'family_name':
			return capitalizeFirstLetter(row.family_name);
		case 'given_name':
			return capitalizeFirstLetter(row.given_name);
		case 'email':
			return row.email ?? '';
		case 'phone':
			return row.phone ?? '';
		case 'birthday':
			return row.birthday
				? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(row.birthday)
				: '';
		case 'ageAtConference':
			return row.ageAtConference !== null ? String(row.ageAtConference) : '';
		case 'hasBirthdayDuringConference':
			return booleanText(row.hasBirthdayDuringConference);
		case 'gender':
			return row.gender ? translateGender(row.gender) : '';
		case 'pronouns':
			return row.pronouns ?? '';
		case 'foodPreference':
			return row.foodPreference ? translateFoodPreference(row.foodPreference) : '';
		case 'city':
			return row.city ? capitalizeFirstLetter(row.city) : '';
		case 'country':
			return row.country ?? '';
		case 'role':
			return translateParticipationRole(row.role);
		case 'nation':
			if (row.nsaName) return row.nsaName;
			if (row.nationAlpha3Code)
				return getFullTranslatedCountryNameFromISO3Code(row.nationAlpha3Code);
			return '';
		case 'committee':
			return row.committee ?? '';
		case 'delegationSchool':
			return row.delegationSchool ?? '';
		case 'isHeadDelegate':
			return booleanText(row.isHeadDelegate);
		case 'assignedRoleName':
			return row.assignedRoleName ?? '';
		case 'teamRole':
			return row.teamRole ? translateTeamRole(row.teamRole) : '';
		case 'plansOwnAttendance':
			return booleanText(row.plansOwnAttendance);
		case 'paymentStatus':
			return statusText(row.paymentStatus);
		case 'postalRegistrationStatus':
			return statusText(row.postalRegistrationStatus);
		case 'termsAndConditions':
			return statusText(row.termsAndConditions);
		case 'guardianConsent':
			if (row.ageAtConference !== null && row.ageAtConference >= 18) return m.notRequired();
			return statusText(row.guardianConsent);
		case 'mediaConsent':
			return statusText(row.mediaConsent);
		case 'didAttend':
			return booleanText(row.didAttend);
		case 'accepted':
			return booleanText(row.accepted);
		case 'documentNumber':
			return row.documentNumber !== null ? String(row.documentNumber) : '';
		case 'accessCardId':
			return row.accessCardId ?? '';
		case 'participationCount':
			return String(row.participationCount);
		default:
			return '';
	}
}

export function getColumnHeader<TData>(col: ColumnDef<TData>): string {
	const header = col.header;
	if (typeof header === 'string') return header;
	return col.id ?? ('accessorKey' in col ? String(col.accessorKey) : '');
}
