import { m } from '#lib/paraglide/messages';
import { getAgeAtConference, ofAgeAtConference } from './ageChecker';

/**
 * What the postal registration says about the documents and who signs them, as HTML: without the
 * parents for somebody of age at the conference, and with "if you are not of age" only where the
 * birthday or the start of the conference is not known. `age` (plain text) is what is said about
 * their age, where it is known; `warning` reminds a minor of the parents' part.
 */
export function postalRegistrationTexts({
	birthday,
	startConference,
	conferenceStart
}: {
	birthday: Date | null | undefined;
	startConference: Date | null | undefined;
	/** The start of the conference as it is written. */
	conferenceStart: string;
}) {
	const years =
		birthday && startConference ? getAgeAtConference({ birthday, startConference }) : undefined;
	if (years === undefined) {
		return {
			documents: m.postalRegistrationDocuments({ conferenceStart }),
			whereTo: m.postalRegistrationFAQ1()
		};
	}
	if (ofAgeAtConference({ startConference, dateOfBirth: birthday })) {
		return {
			documents: m.postalRegistrationDocumentsOfAge(),
			whereTo: m.postalRegistrationFAQ1OfAge(),
			age: {
				ofAge: true,
				text: m.postalRegistrationAgeOfAge({ conferenceStart, age: years }),
				meaning: m.postalRegistrationAgeOfAgeMeaning(),
				summary: m.postalRegistrationAgeOfAgeSummary()
			}
		};
	}
	return {
		documents: m.postalRegistrationDocumentsMinor({ conferenceStart }),
		whereTo: m.postalRegistrationFAQ1Minor(),
		warning: m.postalRegistrationMinorWarning({ conferenceStart }),
		age: {
			ofAge: false,
			text: m.postalRegistrationAgeMinor({ conferenceStart, age: years }),
			meaning: m.postalRegistrationAgeMinorMeaning(),
			summary: m.postalRegistrationAgeMinorSummary()
		}
	};
}
