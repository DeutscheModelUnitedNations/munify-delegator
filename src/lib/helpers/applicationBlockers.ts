import { m } from '#lib/paraglide/messages';
import { getAgeAtConference } from '#lib/helpers/ageChecker';
import {
	ageIssue,
	type AgeIssue,
	type AgeLimits,
	type AgeRole
} from '#lib/helpers/plausibilityRules';
import {
	invalidProfileFields,
	type ProfileField,
	type StoredProfile
} from '#lib/schemata/userForm';

/**
 * What the plausibility checks find about the people of an application, which holds it back: a
 * profile the account form refuses, or an age on the first conference day outside the
 * conference's range for the role. A supervisor's counterpart of sending an application is
 * confirming they attend in person. The API refuses to send such an application
 * (`#api/services/registration/applicationReadiness`), the registration stages list the findings
 * per person, and the team's plausibility page shows the same rules for the whole conference.
 */

/** A person of an application, as their user row stores them. */
type ApplicantPerson = StoredProfile & { id: string; birthday: Date | string | null };

/** What holds one person of an application back; only people with a finding have one. */
export type ApplicationBlocker = {
	userId: string;
	/** Their age on the first conference day misses the range for the role they apply as. */
	ageIssue: AgeIssue | null;
	/** The profile fields the account form refuses, in the form's order. */
	invalidFields: ProfileField[];
};

/**
 * The findings for each of `people` applying as `role` to a conference with these age limits,
 * starting on `startConference`; empty when nothing holds the application back. Delegates and
 * single participants are judged by the participants' range, supervisors (whose "application" is
 * confirming they attend in person) by `supervisorMinAge` alone. A birthday that is missing is a
 * profile finding, not an age one.
 */
export function applicationBlockers({
	conference,
	people,
	role
}: {
	conference: AgeLimits & { startConference: Date | string };
	people: ApplicantPerson[];
	role: AgeRole;
}): ApplicationBlocker[] {
	return people.flatMap((person) => {
		const invalidFields = invalidProfileFields(person);
		const age = person.birthday
			? getAgeAtConference({
					birthday: person.birthday,
					startConference: conference.startConference
				})
			: undefined;
		const issue = age === undefined ? undefined : ageIssue({ age, role, limits: conference });
		if (!issue && invalidFields.length === 0) return [];
		return [{ userId: person.id, ageIssue: issue ?? null, invalidFields }];
	});
}

const PROFILE_FIELD_LABELS: Record<ProfileField, () => string> = {
	given_name: m.firstName,
	family_name: m.lastName,
	birthday: m.birthDate,
	phone: m.phoneNumber,
	street: m.street,
	apartment: m.streetAddition,
	zip: m.zipCode,
	city: m.city,
	region: m.region,
	country: m.country,
	gender: m.gender,
	pronouns: m.pronouns,
	foodPreference: m.diet,
	emergencyContacts: m.emergencyContacts,
	wantsToReceiveGeneralInformation: m.receiveGeneralInformation,
	wantsJoinTeamInformation: m.receiveJoinTeamInformation
};

/** The label the account form shows for the field. */
export function profileFieldLabel(field: ProfileField) {
	return PROFILE_FIELD_LABELS[field]();
}

const AGE_ISSUE_TEXTS: Record<AgeIssue, () => string> = {
	tooYoung: m.applicationBlockerTooYoung,
	tooOld: m.applicationBlockerTooOld,
	shouldBeSupervisor: m.applicationBlockerShouldBeSupervisor,
	shouldNotBeSupervisor: m.applicationBlockerShouldNotBeSupervisor
};

/** What is wrong with one person, in words: the profile fields first, then the age. */
export function applicationBlockerTexts({
	ageIssue: issue,
	invalidFields
}: Pick<ApplicationBlocker, 'ageIssue' | 'invalidFields'>) {
	return [
		invalidFields.length > 0 &&
			m.applicationBlockerProfile({ fields: invalidFields.map(profileFieldLabel).join(', ') }),
		issue && AGE_ISSUE_TEXTS[issue]()
	].filter((text) => typeof text === 'string');
}
