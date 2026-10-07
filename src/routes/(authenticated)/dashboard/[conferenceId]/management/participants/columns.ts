import { renderComponent } from '$lib/components/tanStackTable';
import { columnIdOf, type ManagedColumn } from '$lib/components/tanStackTable/managedTable';
import { m } from '$lib/paraglide/messages';
import { capitalizeFirstLetter } from '$lib/helpers/capitalizeFirstLetter';
import {
	translateAdministrativeStatus,
	translateFoodPreference,
	translateGender,
	translateParticipationRole,
	translateTeamRole
} from '$lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import type { ParticipantRow } from './types';
import { getPlainTextValue } from './exportHelpers';
import RoleBadge from './RoleBadge.svelte';
import StatusIcon from './StatusIcon.svelte';
import FlagCell from './FlagCell.svelte';
import BooleanIcon from './BooleanIcon.svelte';
import FoodPreferenceCell from './FoodPreferenceCell.svelte';
import GuardianConsentCell from './GuardianConsentCell.svelte';
import MonoCell from './MonoCell.svelte';
import ConferenceBirthdayCell from './ConferenceBirthdayCell.svelte';

function participantColumns(): ManagedColumn<ParticipantRow>[] {
	return [
		// --- Personal ---
		{
			accessorKey: 'userId',
			header: m.userId(),
			cell: ({ row }) => renderComponent(MonoCell, { value: row.original.userId }),
			group: m.personalData(),
			defaultVisible: false,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'family_name',
			header: m.familyName(),
			cell: ({ row }) => capitalizeFirstLetter(row.original.family_name),
			group: m.personalData(),
			defaultVisible: true,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'given_name',
			header: m.givenName(),
			cell: ({ row }) => capitalizeFirstLetter(row.original.given_name),
			group: m.personalData(),
			defaultVisible: true,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'email',
			header: m.email(),
			cell: ({ row }) => row.original.email ?? '',
			group: m.personalData(),
			defaultVisible: true,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'phone',
			header: m.phone(),
			cell: ({ row }) => row.original.phone ?? '',
			group: m.personalData(),
			defaultVisible: false,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'birthday',
			header: m.birthday(),
			cell: ({ row }) =>
				row.original.birthday
					? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
							row.original.birthday
						)
					: '',
			sortFn: (rowA, rowB) => {
				const a = rowA.original.birthday?.getTime() ?? 0;
				const b = rowB.original.birthday?.getTime() ?? 0;
				return a - b;
			},
			group: m.personalData(),
			defaultVisible: false
		},
		{
			accessorKey: 'ageAtConference',
			header: m.conferenceAge(),
			group: m.computedValues(),
			defaultVisible: false,
			filter: { type: 'range' }
		},
		{
			accessorKey: 'hasBirthdayDuringConference',
			header: m.conferenceBirthday(),
			cell: ({ row }) =>
				renderComponent(ConferenceBirthdayCell, {
					hasBirthday: row.original.hasBirthdayDuringConference
				}),
			group: m.computedValues(),
			defaultVisible: false,
			filter: { type: 'boolean' }
		},
		{
			accessorKey: 'gender',
			header: m.gender(),
			cell: ({ row }) => (row.original.gender ? translateGender(row.original.gender) : ''),
			group: m.personalData(),
			defaultVisible: false,
			filter: { type: 'enum', label: translateGender }
		},
		{
			accessorKey: 'pronouns',
			header: m.pronouns(),
			group: m.personalData(),
			defaultVisible: false,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'foodPreference',
			header: m.foodPreference(),
			cell: ({ row }) =>
				renderComponent(FoodPreferenceCell, { value: row.original.foodPreference }),
			group: m.personalData(),
			defaultVisible: false,
			filter: { type: 'enum', label: translateFoodPreference }
		},
		{
			accessorKey: 'city',
			header: m.city(),
			cell: ({ row }) => (row.original.city ? capitalizeFirstLetter(row.original.city) : ''),
			group: m.personalData(),
			defaultVisible: false,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'country',
			header: m.country(),
			group: m.personalData(),
			defaultVisible: false,
			filter: { type: 'text' }
		},

		// --- Role ---
		{
			accessorKey: 'role',
			header: m.participationType(),
			cell: ({ row }) => renderComponent(RoleBadge, { role: row.original.role }),
			group: m.participation(),
			defaultVisible: true,
			filter: { type: 'enum', label: translateParticipationRole }
		},
		{
			id: 'nation',
			accessorFn: (row) =>
				row.nsaName ??
				(row.nationAlpha3Code
					? getFullTranslatedCountryNameFromISO3Code(row.nationAlpha3Code)
					: ''),
			header: m.nation(),
			cell: ({ row }) =>
				renderComponent(FlagCell, {
					alpha2Code: row.original.nationAlpha2Code,
					alpha3Code: row.original.nationAlpha3Code,
					nsaName: row.original.nsaName,
					nsaIcon: row.original.nsaIcon
				}),
			sortFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue<string>(columnId) ?? '';
				const b = rowB.getValue<string>(columnId) ?? '';
				return a.localeCompare(b);
			},
			group: m.participation(),
			defaultVisible: true,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'committee',
			header: m.committee(),
			group: m.participation(),
			defaultVisible: true,
			filter: { type: 'enum' }
		},
		{
			accessorKey: 'delegationSchool',
			header: m.schoolOrInstitution(),
			group: m.participation(),
			defaultVisible: false,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'isHeadDelegate',
			header: m.headDelegate(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.isHeadDelegate }),
			group: m.participation(),
			defaultVisible: false,
			filter: { type: 'boolean' }
		},
		{
			accessorKey: 'assignedRoleName',
			header: m.assignedRole(),
			cell: ({ row }) => {
				const icon = row.original.assignedRoleIcon;
				const name = row.original.assignedRoleName;
				if (!name) return '';
				if (icon) return `${name}`;
				return name;
			},
			group: m.participation(),
			defaultVisible: false,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'teamRole',
			header: m.teamMember(),
			cell: ({ row }) => (row.original.teamRole ? translateTeamRole(row.original.teamRole) : ''),
			group: m.participation(),
			defaultVisible: false,
			filter: { type: 'enum', label: translateTeamRole }
		},
		{
			accessorKey: 'plansOwnAttendance',
			header: m.attendancePlan(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.plansOwnAttendance }),
			group: m.participation(),
			defaultVisible: false,
			filter: { type: 'boolean' }
		},

		// --- Status ---
		{
			accessorKey: 'paymentStatus',
			header: m.payment(),
			cell: ({ row }) => renderComponent(StatusIcon, { status: row.original.paymentStatus }),
			group: m.status(),
			defaultVisible: true,
			filter: { type: 'enum', label: translateAdministrativeStatus, alwaysAvailable: true }
		},
		{
			accessorKey: 'postalRegistrationStatus',
			header: m.postalRegistration(),
			cell: ({ row }) =>
				renderComponent(StatusIcon, { status: row.original.postalRegistrationStatus }),
			group: m.status(),
			defaultVisible: true,
			filter: { type: 'enum', label: translateAdministrativeStatus, alwaysAvailable: true }
		},
		{
			accessorKey: 'didAttend',
			header: m.attendance(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.didAttend }),
			group: m.status(),
			defaultVisible: true,
			filter: { type: 'boolean' }
		},
		{
			accessorKey: 'termsAndConditions',
			header: m.termsAndConditions(),
			cell: ({ row }) => renderComponent(StatusIcon, { status: row.original.termsAndConditions }),
			group: m.status(),
			defaultVisible: false,
			filter: { type: 'enum', label: translateAdministrativeStatus, alwaysAvailable: true }
		},
		{
			accessorKey: 'guardianConsent',
			header: m.guardianConsent(),
			id: 'guardianConsent',
			cell: ({ row }) =>
				renderComponent(GuardianConsentCell, {
					status: row.original.guardianConsent,
					ageAtConference: row.original.ageAtConference
				}),
			group: m.status(),
			defaultVisible: false,
			filter: { type: 'enum', label: translateAdministrativeStatus, alwaysAvailable: true }
		},
		{
			accessorKey: 'mediaConsent',
			header: m.mediaConsentStatus(),
			id: 'mediaConsent',
			cell: ({ row }) => renderComponent(StatusIcon, { status: row.original.mediaConsent }),
			group: m.status(),
			defaultVisible: false,
			filter: { type: 'enum', label: translateAdministrativeStatus, alwaysAvailable: true }
		},
		{
			accessorKey: 'documentNumber',
			header: m.documentNumber(),
			group: m.status(),
			defaultVisible: false,
			filter: { type: 'text' }
		},
		{
			accessorKey: 'accessCardId',
			header: m.accessCardId(),
			group: m.status(),
			defaultVisible: false,
			filter: { type: 'text' }
		},

		// --- Computed ---
		{
			accessorKey: 'accepted',
			header: m.accepted(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.accepted }),
			group: m.computedValues(),
			defaultVisible: true,
			filter: { type: 'boolean', alwaysAvailable: true }
		},
		{
			accessorKey: 'hasOpenIssue',
			header: m.openIssues(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.hasOpenIssue }),
			group: m.computedValues(),
			defaultVisible: false,
			description: m.openIssuesDescription(),
			filter: { type: 'boolean', alwaysAvailable: true, hint: m.openIssuesExplanation() }
		},
		{
			accessorKey: 'participationCount',
			header: m.participationCount(),
			group: m.computedValues(),
			defaultVisible: false,
			filter: { type: 'range' }
		}
	];
}

/** The columns, each exporting the text `getPlainTextValue` gives for it. */
export function createColumnDefs(): ManagedColumn<ParticipantRow>[] {
	return participantColumns().map((column) => {
		const id = columnIdOf(column);
		return id === undefined
			? column
			: { ...column, exportValue: (row) => getPlainTextValue(row, id) };
	});
}

/** The order of the groups in the filter and column drawers. */
export const participantGroupOrder = () => [
	m.personalData(),
	m.participation(),
	m.status(),
	m.computedValues()
];
