import type { ColumnDef, RowData, TableFeatures } from '$lib/components/tanStackTable';
import { m } from '$lib/paraglide/messages';
import { capitalizeFirstLetter } from '$lib/helpers/capitalizeFirstLetter';
import {
	translateGender,
	translateTeamRole,
	translateAdministrativeStatus,
	translateParticipationRole,
	translateFoodPreference
} from '$lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import type { ParticipantRow } from './types';

function booleanText(value: boolean | null): string {
	if (value === null || value === undefined) return '';
	return value ? m.yes() : m.no();
}

function statusText(value: string | null): string {
	if (!value) return '';
	return translateAdministrativeStatus(value);
}

function text(value: string | null): string {
	return value ?? '';
}

function numberText(value: number | null): string {
	return value !== null ? String(value) : '';
}

/** Each exportable column as plain text, keyed by column id. */
const plainTextValues: Record<string, (row: ParticipantRow) => string> = {
	userId: (row) => row.userId,
	family_name: (row) => capitalizeFirstLetter(row.family_name),
	given_name: (row) => capitalizeFirstLetter(row.given_name),
	email: (row) => text(row.email),
	phone: (row) => text(row.phone),
	birthday: (row) =>
		row.birthday
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(row.birthday)
			: '',
	ageAtConference: (row) => numberText(row.ageAtConference),
	hasOpenIssue: (row) => booleanText(row.hasOpenIssue),
	hasBirthdayDuringConference: (row) => booleanText(row.hasBirthdayDuringConference),
	gender: (row) => (row.gender ? translateGender(row.gender) : ''),
	pronouns: (row) => text(row.pronouns),
	foodPreference: (row) => (row.foodPreference ? translateFoodPreference(row.foodPreference) : ''),
	city: (row) => (row.city ? capitalizeFirstLetter(row.city) : ''),
	country: (row) => text(row.country),
	role: (row) => translateParticipationRole(row.role),
	nation: (row) => {
		if (row.nsaName) return row.nsaName;
		if (row.nationAlpha3Code) return getFullTranslatedCountryNameFromISO3Code(row.nationAlpha3Code);
		return '';
	},
	committee: (row) => text(row.committee),
	delegationSchool: (row) => text(row.delegationSchool),
	isHeadDelegate: (row) => booleanText(row.isHeadDelegate),
	assignedRoleName: (row) => text(row.assignedRoleName),
	teamRole: (row) => (row.teamRole ? translateTeamRole(row.teamRole) : ''),
	plansOwnAttendance: (row) => booleanText(row.plansOwnAttendance),
	paymentStatus: (row) => statusText(row.paymentStatus),
	postalRegistrationStatus: (row) => statusText(row.postalRegistrationStatus),
	termsAndConditions: (row) => statusText(row.termsAndConditions),
	guardianConsent: (row) =>
		row.ageAtConference !== null && row.ageAtConference >= 18
			? m.notRequired()
			: statusText(row.guardianConsent),
	mediaConsent: (row) => statusText(row.mediaConsent),
	didAttend: (row) => booleanText(row.didAttend),
	accepted: (row) => booleanText(row.accepted),
	documentNumber: (row) => numberText(row.documentNumber),
	accessCardId: (row) => text(row.accessCardId),
	participationCount: (row) => String(row.participationCount)
};

export function getPlainTextValue(row: ParticipantRow, columnId: string): string {
	return Object.hasOwn(plainTextValues, columnId) ? plainTextValues[columnId](row) : '';
}

export function getColumnHeader<TFeatures extends TableFeatures, TData extends RowData>(
	col: ColumnDef<TFeatures, TData>
): string {
	const header = col.header;
	if (typeof header === 'string') return header;
	return col.id ?? ('accessorKey' in col ? String(col.accessorKey) : '');
}
