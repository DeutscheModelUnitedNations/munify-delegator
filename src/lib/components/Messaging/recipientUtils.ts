import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';

export type Recipient = {
	id: string;
	label: string;
	firstName: string | null;
	lastName: string | null;
	alpha2Code: string | null;
	alpha3Code: string | null;
	fontAwesomeIcon: string | null;
	roleName: string | null;
};

export type RecipientGroup = {
	groupId: string;
	groupLabel: string;
	category: string;
	fontAwesomeIcon: string | null;
	recipients: Recipient[];
};

export function getRecipientDisplayName(r: Recipient): string {
	if (r.alpha3Code) {
		return getFullTranslatedCountryNameFromISO3Code(r.alpha3Code);
	}
	return r.roleName ?? r.label;
}
