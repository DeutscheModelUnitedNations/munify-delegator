import { type ColumnDef, renderComponent } from '$lib/components/TanStackTable';
import { m } from '$lib/paraglide/messages';
import { capitalizeFirstLetter } from '$lib/services/capitalizeFirstLetter';
import { translateGender, translateTeamRole } from '$lib/services/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
import type { ColumnMeta, ParticipantRow } from './types';
import { textFilterFn, enumFilterFn, booleanFilterFn, rangeFilterFn } from './filterFns';
import RoleBadge from './RoleBadge.svelte';
import StatusIcon from './StatusIcon.svelte';
import FlagCell from './FlagCell.svelte';
import BooleanIcon from './BooleanIcon.svelte';
import FoodPreferenceCell from './FoodPreferenceCell.svelte';
import GuardianConsentCell from './GuardianConsentCell.svelte';

function meta(
	category: ColumnMeta['category'],
	description: string,
	defaultVisible: boolean,
	filterType: ColumnMeta['filterType'] = 'text'
): ColumnMeta {
	return { category, description, defaultVisible, filterType };
}

export function createColumnDefs(): ColumnDef<ParticipantRow>[] {
	return [
		// --- Personal ---
		{
			accessorKey: 'userId',
			header: m.userId(),
			filterFn: textFilterFn,
			meta: meta('personal', m.userId(), false)
		},
		{
			accessorKey: 'family_name',
			header: m.familyName(),
			cell: ({ row }) => capitalizeFirstLetter(row.original.family_name),
			filterFn: textFilterFn,
			meta: meta('personal', m.familyName(), true)
		},
		{
			accessorKey: 'given_name',
			header: m.givenName(),
			cell: ({ row }) => capitalizeFirstLetter(row.original.given_name),
			filterFn: textFilterFn,
			meta: meta('personal', m.givenName(), true)
		},
		{
			accessorKey: 'email',
			header: m.email(),
			cell: ({ row }) => row.original.email ?? '',
			filterFn: textFilterFn,
			meta: meta('personal', m.email(), true)
		},
		{
			accessorKey: 'phone',
			header: m.phone(),
			cell: ({ row }) => row.original.phone ?? '',
			filterFn: textFilterFn,
			meta: meta('personal', m.phone(), false)
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
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.birthday?.getTime() ?? 0;
				const b = rowB.original.birthday?.getTime() ?? 0;
				return a - b;
			},
			meta: meta('personal', m.birthday(), false)
		},
		{
			accessorKey: 'ageAtConference',
			header: m.conferenceAge(),
			meta: meta('computed', m.conferenceAge(), false, 'range'),
			filterFn: rangeFilterFn
		},
		{
			accessorKey: 'gender',
			header: m.gender(),
			cell: ({ row }) => (row.original.gender ? translateGender(row.original.gender) : ''),
			filterFn: enumFilterFn,
			meta: meta('personal', m.gender(), false, 'enum')
		},
		{
			accessorKey: 'pronouns',
			header: m.pronouns(),
			filterFn: textFilterFn,
			meta: meta('personal', m.pronouns(), false)
		},
		{
			accessorKey: 'foodPreference',
			header: m.foodPreference(),
			cell: ({ row }) =>
				renderComponent(FoodPreferenceCell, { value: row.original.foodPreference }),
			filterFn: enumFilterFn,
			meta: meta('personal', m.foodPreference(), false, 'enum')
		},
		{
			accessorKey: 'city',
			header: m.city(),
			cell: ({ row }) => (row.original.city ? capitalizeFirstLetter(row.original.city) : ''),
			filterFn: textFilterFn,
			meta: meta('personal', m.city(), false)
		},
		{
			accessorKey: 'country',
			header: m.country(),
			filterFn: textFilterFn,
			meta: meta('personal', m.country(), false)
		},

		// --- Role ---
		{
			accessorKey: 'role',
			header: m.participationType(),
			cell: ({ row }) => renderComponent(RoleBadge, { role: row.original.role }),
			filterFn: enumFilterFn,
			meta: meta('role', m.participationType(), true, 'enum')
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
			sortingFn: (rowA, rowB, columnId) => {
				const a = rowA.getValue<string>(columnId) ?? '';
				const b = rowB.getValue<string>(columnId) ?? '';
				return a.localeCompare(b);
			},
			filterFn: textFilterFn,
			meta: meta('role', m.nation(), true)
		},
		{
			accessorKey: 'committee',
			header: m.committee(),
			filterFn: enumFilterFn,
			meta: meta('role', m.committee(), true, 'enum')
		},
		{
			accessorKey: 'delegationSchool',
			header: m.schoolOrInstitution(),
			filterFn: textFilterFn,
			meta: meta('role', m.schoolOrInstitution(), false)
		},
		{
			accessorKey: 'isHeadDelegate',
			header: m.headDelegate(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.isHeadDelegate }),
			filterFn: booleanFilterFn,
			meta: meta('role', m.headDelegate(), false, 'boolean')
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
			filterFn: textFilterFn,
			meta: meta('role', m.assignedRole(), false)
		},
		{
			accessorKey: 'teamRole',
			header: m.teamMember(),
			cell: ({ row }) => (row.original.teamRole ? translateTeamRole(row.original.teamRole) : ''),
			filterFn: enumFilterFn,
			meta: meta('role', m.teamMember(), false, 'enum')
		},
		{
			accessorKey: 'plansOwnAttendance',
			header: m.attendancePlan(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.plansOwnAttendance }),
			filterFn: booleanFilterFn,
			meta: meta('role', m.attendancePlan(), false, 'boolean')
		},

		// --- Status ---
		{
			accessorKey: 'paymentStatus',
			header: m.payment(),
			cell: ({ row }) => renderComponent(StatusIcon, { status: row.original.paymentStatus }),
			filterFn: enumFilterFn,
			meta: meta('status', m.payment(), true, 'enum')
		},
		{
			accessorKey: 'postalRegistrationStatus',
			header: m.postalRegistration(),
			cell: ({ row }) =>
				renderComponent(StatusIcon, { status: row.original.postalRegistrationStatus }),
			filterFn: enumFilterFn,
			meta: meta('status', m.postalRegistration(), true, 'enum')
		},
		{
			accessorKey: 'didAttend',
			header: m.attendance(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.didAttend }),
			filterFn: booleanFilterFn,
			meta: meta('status', m.attendance(), true, 'boolean')
		},
		{
			accessorKey: 'termsAndConditions',
			header: m.termsAndConditions(),
			cell: ({ row }) => renderComponent(StatusIcon, { status: row.original.termsAndConditions }),
			filterFn: enumFilterFn,
			meta: meta('status', m.termsAndConditions(), false, 'enum')
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
			filterFn: enumFilterFn,
			meta: meta('status', m.guardianConsent(), false, 'enum')
		},
		{
			accessorKey: 'mediaConsent',
			header: m.mediaConsentStatus(),
			id: 'mediaConsent',
			cell: ({ row }) => renderComponent(StatusIcon, { status: row.original.mediaConsent }),
			filterFn: enumFilterFn,
			meta: meta('status', m.mediaConsentStatus(), false, 'enum')
		},
		{
			accessorKey: 'documentNumber',
			header: m.documentNumber(),
			filterFn: textFilterFn,
			meta: meta('status', m.documentNumber(), false)
		},
		{
			accessorKey: 'accessCardId',
			header: m.accessCardId(),
			filterFn: textFilterFn,
			meta: meta('status', m.accessCardId(), false)
		},

		// --- Computed ---
		{
			accessorKey: 'accepted',
			header: m.accepted(),
			cell: ({ row }) => renderComponent(BooleanIcon, { value: row.original.accepted }),
			filterFn: booleanFilterFn,
			meta: meta('computed', m.accepted(), false, 'boolean')
		},
		{
			accessorKey: 'participationCount',
			header: m.participationCount(),
			meta: meta('computed', m.participationCount(), false, 'range'),
			filterFn: rangeFilterFn
		}
	];
}
