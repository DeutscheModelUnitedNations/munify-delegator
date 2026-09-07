import { m } from '$lib/paraglide/messages';
import type { z } from 'zod';
import type { conferenceSettingsFormSchema } from './form-schema';

type ConferenceSettings = z.infer<typeof conferenceSettingsFormSchema>;
type SettingsFieldKey = keyof ConferenceSettings;

/**
 * The tabs of the configuration page. The change preview reuses them so a change
 * is always presented in the same place the user edited it.
 */
export type ChangeGroupKey = 'general' | 'status' | 'links' | 'payments' | 'documents';

export const changeGroupOrder: ChangeGroupKey[] = [
	'general',
	'status',
	'links',
	'payments',
	'documents'
];

export function changeGroupLabel(group: ChangeGroupKey): string {
	switch (group) {
		case 'general':
			return m.general();
		case 'status':
			return m.statusAndFeatures();
		case 'links':
			return m.linksAndContent();
		case 'payments':
			return m.bankingInformation();
		case 'documents':
			return m.documentsAndTemplates();
	}
}

export interface ConfigChange {
	key: SettingsFieldKey;
	group: ChangeGroupKey;
	label: string;
	/** Formatted value as it is currently stored. */
	before: string;
	/** Formatted value that will be written on save. */
	after: string;
	/** File fields cannot be compared by value - they are only ever "replaced". */
	isFile: boolean;
	/** Whether the change immediately affects what participants can see or do. */
	highImpact: boolean;
	/** Short explanation shown underneath a high impact change. */
	note?: string;
}

interface FieldDescription {
	group: ChangeGroupKey;
	label: () => string;
	/** Overrides the generic value formatting, e.g. to resolve an enum to its label. */
	format?: (value: unknown) => string;
	highImpact?: boolean;
	note?: () => string;
}

function conferenceStateLabel(value: unknown): string {
	switch (value) {
		case 'PRE':
			return m.conferenceStatusPre();
		case 'PARTICIPANT_REGISTRATION':
			return m.conferenceStatusParticipantRegistration();
		case 'PREPARATION':
			return m.conferenceStatusPreparation();
		case 'ACTIVE':
			return m.conferenceStatusActive();
		case 'POST':
			return m.conferenceStatusPost();
		default:
			return formatValue(value);
	}
}

function featureToggleNote(): string {
	return m.configChangeWarningFeature();
}

function bankingNote(): string {
	return m.configChangeWarningBanking();
}

/**
 * Every field of the settings schema needs an entry here. Using a complete
 * `Record` (instead of a `Partial`) makes the compiler point at this file when a
 * field is added to the schema, so new settings can never silently disappear
 * from the preview.
 */
const fieldDescriptions: Record<SettingsFieldKey, FieldDescription> = {
	title: { group: 'general', label: () => m.conferenceTitle() },
	longTitle: { group: 'general', label: () => m.conferenceLongTitle() },
	location: { group: 'general', label: () => m.conferenceLocation() },
	language: { group: 'general', label: () => m.conferenceLanguage() },
	website: { group: 'general', label: () => m.conferenceWebsite() },
	image: { group: 'general', label: () => m.conferenceImage() },
	emblem: { group: 'general', label: () => m.conferenceEmblem() },
	logo: { group: 'general', label: () => m.conferenceLogo() },
	startAssignment: { group: 'general', label: () => m.conferenceStartAssignment() },
	registrationDeadlineGracePeriodMinutes: {
		group: 'general',
		label: () => m.registrationDeadlineGracePeriod()
	},
	startConference: { group: 'general', label: () => m.conferenceStart() },
	endConference: { group: 'general', label: () => m.conferenceEnd() },
	timezone: { group: 'general', label: () => m.conferenceTimezone() },
	state: {
		group: 'status',
		label: () => m.conferenceStatus(),
		format: conferenceStateLabel,
		highImpact: true,
		note: () => m.configChangeWarningConferenceStatus()
	},
	unlockPayments: {
		group: 'status',
		label: () => m.paymentOpen(),
		highImpact: true,
		note: featureToggleNote
	},
	unlockPostals: {
		group: 'status',
		label: () => m.postalOpen(),
		highImpact: true,
		note: featureToggleNote
	},
	isOpenPaperSubmission: {
		group: 'status',
		label: () => m.paperSubmissionOpen(),
		highImpact: true,
		note: featureToggleNote
	},
	showCalendar: {
		group: 'status',
		label: () => m.showCalendar(),
		highImpact: true,
		note: featureToggleNote
	},
	linkToPreparationGuide: { group: 'links', label: () => m.preparationGuide() },
	linkToTeamWiki: { group: 'links', label: () => m.linkToTeamWiki() },
	linkToServicesPage: { group: 'links', label: () => m.linkToServicesPage() },
	feeAmount: { group: 'payments', label: () => m.fee(), highImpact: true, note: bankingNote },
	bankName: { group: 'payments', label: () => m.bankName(), highImpact: true, note: bankingNote },
	iban: { group: 'payments', label: () => m.iban(), highImpact: true, note: bankingNote },
	bic: { group: 'payments', label: () => m.bic(), highImpact: true, note: bankingNote },
	accountHolder: {
		group: 'payments',
		label: () => m.accountHolder(),
		highImpact: true,
		note: bankingNote
	},
	currency: { group: 'payments', label: () => m.currency(), highImpact: true, note: bankingNote },
	postalName: { group: 'documents', label: () => m.name() },
	postalStreet: { group: 'documents', label: () => m.street() },
	postalApartment: { group: 'documents', label: () => m.streetAddition() },
	postalZip: { group: 'documents', label: () => m.zipCode() },
	postalCity: { group: 'documents', label: () => m.city() },
	postalCountry: { group: 'documents', label: () => m.country() },
	contractBasePDF: { group: 'documents', label: () => m.postalTemplateContract() },
	guardianConsentBasePDF: { group: 'documents', label: () => m.postalTemplateGuardianConsent() },
	mediaConsentBasePDF: { group: 'documents', label: () => m.postalTemplateMediaConsent() },
	termsAndConditionsBasePDF: {
		group: 'documents',
		label: () => m.postalTemplateTermsAndConditions()
	},
	certificateBasePDF: { group: 'documents', label: () => m.certificateTemplate() }
};

const fieldOrder = Object.keys(fieldDescriptions).filter(isSettingsFieldKey);

function isSettingsFieldKey(key: string): key is SettingsFieldKey {
	return key in fieldDescriptions;
}

/** An empty file input still yields a `File` with no content - that is "no upload". */
function isUploadedFile(value: unknown): value is File {
	return value instanceof File && value.size > 0;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatValue(value: unknown): string {
	if (value === undefined || value === null || value === '') return m.configChangeValueNotSet();
	if (typeof value === 'boolean') return value ? m.on() : m.off();
	if (value instanceof Date) return value.toLocaleString();
	if (isUploadedFile(value)) return `${value.name} (${formatFileSize(value.size)})`;
	if (value instanceof File) return m.configChangeValueNotSet();
	if (typeof value === 'number') return value.toLocaleString();
	if (typeof value === 'string') return value;
	return JSON.stringify(value) ?? '';
}

function isEmpty(value: unknown): boolean {
	if (value === undefined || value === null || value === '') return true;
	if (value instanceof File) return !isUploadedFile(value);
	return false;
}

function valuesAreEqual(before: unknown, after: unknown): boolean {
	if (isEmpty(before) && isEmpty(after)) return true;
	if (before instanceof Date && after instanceof Date) {
		return before.getTime() === after.getTime();
	}
	// A picked file always counts as a change - there is nothing to compare it to.
	if (before instanceof File || after instanceof File) return false;
	return before === after;
}

export interface ChangePreviewInput {
	/** The values as they are currently stored, i.e. the ones the form was loaded with. */
	saved: Partial<ConferenceSettings>;
	/** The values as they are in the form right now. */
	current: Partial<ConferenceSettings>;
	/** Superforms' tainted map. Only fields the user actually touched are considered. */
	tainted: Record<string, unknown> | undefined;
	/**
	 * Which file backed fields already hold content on the server, so an upload can
	 * be labelled as replacing an existing document rather than adding a new one.
	 */
	existingFiles: Partial<Record<SettingsFieldKey, boolean>>;
}

export function collectConfigChanges({
	saved,
	current,
	tainted,
	existingFiles
}: ChangePreviewInput): ConfigChange[] {
	if (!tainted) return [];

	const changes: ConfigChange[] = [];

	for (const key of fieldOrder) {
		if (!tainted[key]) continue;

		const before = saved[key];
		const after = current[key];

		// Superforms untaints a field that was changed back to its original value, but
		// guard against it anyway so the preview never lists a non-change.
		if (valuesAreEqual(before, after)) continue;

		const description = fieldDescriptions[key];
		const format = description.format ?? formatValue;
		const isFile = after instanceof File;

		changes.push({
			key,
			group: description.group,
			label: description.label(),
			before: isFile
				? existingFiles[key]
					? m.configChangeFileExisting()
					: m.configChangeValueNotSet()
				: format(before),
			after: format(after),
			isFile,
			highImpact: description.highImpact ?? false,
			note: description.note?.()
		});
	}

	return changes;
}

export interface ChangeGroup {
	key: ChangeGroupKey;
	label: string;
	changes: ConfigChange[];
}

export function groupConfigChanges(changes: ConfigChange[]): ChangeGroup[] {
	return changeGroupOrder
		.map((key) => ({
			key,
			label: changeGroupLabel(key),
			changes: changes.filter((change) => change.group === key)
		}))
		.filter((group) => group.changes.length > 0);
}
