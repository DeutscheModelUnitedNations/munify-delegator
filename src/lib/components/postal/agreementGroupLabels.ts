import { m } from '#lib/paraglide/messages';
import { AGREEMENT_GROUPS, type AgreementGroup } from '#lib/paperScan/agreementDetails';

/** What a group of details is called. */
export const agreementGroupLabel: Record<AgreementGroup['id'], () => string> = {
	contract: () => m.agreementGroupContract(),
	guardianConsent: () => m.agreementGroupGuardianConsent(),
	mediaForms: () => m.agreementGroupMediaForms(),
	mediaPurposes: () => m.agreementGroupMediaPurposes(),
	mediaSigned: () => m.agreementGroupMediaSigned()
};

/** The groups of details a page with these fields is of, in the order of the documents. */
const groupsOf = (fields: readonly string[]) =>
	AGREEMENT_GROUPS.filter((group) => group.fields.some((field) => fields.includes(field)));

/** What a scanned page is, by the fields on it; `undefined` for a page without any. */
export const pageLabel = (fields: readonly string[]) =>
	groupsOf(fields)
		.map(({ id }) => agreementGroupLabel[id]())
		.join(', ') || undefined;

/** Scans in the order of the documents, those of no known page last. */
export function inDocumentOrder<S extends { fields: readonly string[] }>(scans: readonly S[]): S[] {
	const place = ({ fields }: S) => {
		const [first] = groupsOf(fields);
		return first ? AGREEMENT_GROUPS.indexOf(first) : AGREEMENT_GROUPS.length;
	};
	return scans.toSorted((a, b) => place(a) - place(b));
}
