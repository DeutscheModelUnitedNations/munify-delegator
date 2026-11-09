import { getLocale } from '#lib/paraglide/runtime';
import { m } from '#lib/paraglide/messages';
import { capitalizeFirstLetter } from '#lib/helpers/capitalizeFirstLetter';
import { cellOf, defineColumns, type GridColumn } from '#lib/components/dataGrid/gridColumn';
import { PARTICIPANTS_COLUMNS } from '#lib/dataGrid/tables/participants';
import {
	translateAdministrativeStatus,
	translateFoodPreference,
	translateGender,
	translateParticipationRole,
	translateTeamRole
} from '#lib/utils/enumTranslations';
import type { ParticipantRow } from './types';
import RoleBadge from './RoleBadge.svelte';
import StatusIcon from './StatusIcon.svelte';
import FlagCell from './FlagCell.svelte';
import BooleanIcon from './BooleanIcon.svelte';
import FoodPreferenceCell from './FoodPreferenceCell.svelte';
import GuardianConsentCell from './GuardianConsentCell.svelte';
import MonoCell from './MonoCell.svelte';
import ConferenceBirthdayCell from './ConferenceBirthdayCell.svelte';

/** A nation (by alpha-3 code) or non-state actor (by name) the nation column offers. */
export interface NationOption {
	value: string;
	label: string;
}

const dateText = (date: Date | null) =>
	date ? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(date) : '';

const booleanCell = (value: boolean | null) => cellOf({ component: BooleanIcon, props: { value } });
const statusCell = (status: ParticipantRow['paymentStatus']) =>
	cellOf({ component: StatusIcon, props: { status } });

/**
 * The participants table's columns: the API's metadata (`PARTICIPANTS_COLUMNS`) with labels, cells
 * and headings. The nation column offers the conference's nations and non-state actors.
 */
export function participantColumns({
	nations
}: {
	nations: readonly NationOption[];
}): GridColumn<ParticipantRow>[] {
	const personal = m.personalData();
	const participation = m.participation();
	const status = m.status();
	const computed = m.computedValues();
	const nationLabels = new Map(nations.map((nation) => [nation.value, nation.label]));

	return defineColumns<ParticipantRow, (typeof PARTICIPANTS_COLUMNS)[number]>({
		metas: PARTICIPANTS_COLUMNS,
		extras: {
			userId: {
				label: m.userId(),
				group: personal,
				defaultVisible: false,
				value: (row) => row.userId,
				cell: (row) => cellOf({ component: MonoCell, props: { value: row.userId } })
			},
			family_name: {
				label: m.familyName(),
				group: personal,
				alwaysVisible: true,
				size: 170,
				value: (row) => row.family_name,
				text: (row) => capitalizeFirstLetter(row.family_name)
			},
			given_name: {
				label: m.givenName(),
				group: personal,
				value: (row) => row.given_name,
				text: (row) => capitalizeFirstLetter(row.given_name)
			},
			email: { label: m.email(), group: personal, size: 220, value: (row) => row.email },
			phone: {
				label: m.phone(),
				group: personal,
				defaultVisible: false,
				value: (row) => row.phone
			},
			birthday: {
				label: m.birthday(),
				group: personal,
				defaultVisible: false,
				value: (row) => row.birthday,
				text: (row) => dateText(row.birthday)
			},
			ageAtConference: {
				label: m.conferenceAge(),
				group: computed,
				defaultVisible: false,
				align: 'right',
				size: 110,
				value: (row) => row.ageAtConference
			},
			hasBirthdayDuringConference: {
				label: m.conferenceBirthday(),
				group: computed,
				defaultVisible: false,
				value: (row) => row.hasBirthdayDuringConference,
				cell: (row) =>
					cellOf({
						component: ConferenceBirthdayCell,
						props: { hasBirthday: row.hasBirthdayDuringConference }
					})
			},
			gender: {
				label: m.gender(),
				group: personal,
				defaultVisible: false,
				optionLabel: translateGender,
				value: (row) => row.gender
			},
			pronouns: {
				label: m.pronouns(),
				group: personal,
				defaultVisible: false,
				value: (row) => row.pronouns
			},
			foodPreference: {
				label: m.foodPreference(),
				group: personal,
				defaultVisible: false,
				optionLabel: translateFoodPreference,
				value: (row) => row.foodPreference,
				cell: (row) =>
					cellOf({ component: FoodPreferenceCell, props: { value: row.foodPreference } }),
				exportValue: (row) =>
					row.foodPreference ? translateFoodPreference(row.foodPreference) : ''
			},
			city: {
				label: m.city(),
				group: personal,
				defaultVisible: false,
				value: (row) => row.city,
				text: (row) => (row.city ? capitalizeFirstLetter(row.city) : '')
			},
			country: {
				label: m.country(),
				group: personal,
				defaultVisible: false,
				value: (row) => row.country
			},
			role: {
				label: m.participationType(),
				group: participation,
				optionLabel: translateParticipationRole,
				value: (row) => row.role,
				cell: (row) => cellOf({ component: RoleBadge, props: { role: row.role } }),
				exportValue: (row) => translateParticipationRole(row.role)
			},
			nation: {
				label: m.nation(),
				group: participation,
				options: nations.map((nation) => nation.value),
				optionLabel: (value) => nationLabels.get(value) ?? value,
				value: (row) => row.nsaName ?? row.nationAlpha3Code,
				cell: (row) =>
					cellOf({
						component: FlagCell,
						props: {
							alpha2Code: row.nationAlpha2Code,
							alpha3Code: row.nationAlpha3Code,
							nsaName: row.nsaName,
							nsaIcon: row.nsaIcon
						}
					})
			},
			committee: { label: m.committee(), group: participation, value: (row) => row.committee },
			school: {
				label: m.schoolOrInstitution(),
				group: participation,
				defaultVisible: false,
				value: (row) => row.school
			},
			isHeadDelegate: {
				label: m.headDelegate(),
				group: participation,
				defaultVisible: false,
				value: (row) => row.isHeadDelegate,
				cell: (row) => booleanCell(row.isHeadDelegate)
			},
			assignedRoleName: {
				label: m.assignedRole(),
				group: participation,
				defaultVisible: false,
				value: (row) => row.assignedRoleName
			},
			teamRole: {
				label: m.teamMember(),
				group: participation,
				defaultVisible: false,
				optionLabel: translateTeamRole,
				value: (row) => row.teamRole
			},
			onWaitingList: {
				label: m.onWaitingList(),
				description: m.onWaitingListDescription(),
				group: participation,
				defaultVisible: false,
				value: (row) => row.onWaitingList,
				cell: (row) => booleanCell(row.onWaitingList)
			},
			waitingListSince: {
				label: m.waitingListSince(),
				group: participation,
				defaultVisible: false,
				value: (row) => row.waitingListSince,
				text: (row) => dateText(row.waitingListSince)
			},
			seatedFromWaitingListAt: {
				label: m.seatedFromWaitingListAt(),
				description: m.seatedFromWaitingListAtDescription(),
				group: participation,
				defaultVisible: false,
				value: (row) => row.seatedFromWaitingListAt,
				text: (row) => dateText(row.seatedFromWaitingListAt)
			},
			plansOwnAttendance: {
				label: m.attendancePlan(),
				group: participation,
				defaultVisible: false,
				value: (row) => row.plansOwnAttendance,
				cell: (row) => booleanCell(row.plansOwnAttendance)
			},
			paymentStatus: {
				label: m.payment(),
				group: status,
				optionLabel: translateAdministrativeStatus,
				value: (row) => row.paymentStatus,
				cell: (row) => statusCell(row.paymentStatus)
			},
			postalRegistrationStatus: {
				label: m.postalRegistration(),
				group: status,
				optionLabel: translateAdministrativeStatus,
				value: (row) => row.postalRegistrationStatus,
				cell: (row) => statusCell(row.postalRegistrationStatus)
			},
			didAttend: {
				label: m.attendance(),
				group: status,
				value: (row) => row.didAttend,
				cell: (row) => booleanCell(row.didAttend)
			},
			termsAndConditions: {
				label: m.termsAndConditions(),
				group: status,
				defaultVisible: false,
				optionLabel: translateAdministrativeStatus,
				value: (row) => row.termsAndConditions,
				cell: (row) => statusCell(row.termsAndConditions)
			},
			guardianConsent: {
				label: m.guardianConsent(),
				group: status,
				defaultVisible: false,
				optionLabel: translateAdministrativeStatus,
				value: (row) => row.guardianConsent,
				cell: (row) =>
					cellOf({
						component: GuardianConsentCell,
						props: { status: row.guardianConsent, ageAtConference: row.ageAtConference }
					}),
				exportValue: (row) =>
					row.ageAtConference !== null && row.ageAtConference >= 18
						? m.notRequired()
						: row.guardianConsent
							? translateAdministrativeStatus(row.guardianConsent)
							: ''
			},
			mediaConsent: {
				label: m.mediaConsentStatus(),
				group: status,
				defaultVisible: false,
				optionLabel: translateAdministrativeStatus,
				value: (row) => row.mediaConsent,
				cell: (row) => statusCell(row.mediaConsent)
			},
			documentNumber: {
				label: m.documentNumber(),
				group: status,
				defaultVisible: false,
				value: (row) => (row.documentNumber === null ? null : String(row.documentNumber))
			},
			accessCardId: {
				label: m.accessCardId(),
				group: status,
				defaultVisible: false,
				value: (row) => row.accessCardId
			},
			accepted: {
				label: m.accepted(),
				group: computed,
				value: (row) => row.accepted,
				cell: (row) => booleanCell(row.accepted)
			},
			hasOpenIssue: {
				label: m.openIssues(),
				description: m.openIssuesExplanation(),
				group: computed,
				defaultVisible: false,
				value: (row) => row.hasOpenIssue,
				cell: (row) => booleanCell(row.hasOpenIssue)
			},
			participationCount: {
				label: m.participationCount(),
				group: computed,
				defaultVisible: false,
				align: 'right',
				value: (row) => row.participationCount
			}
		}
	});
}
