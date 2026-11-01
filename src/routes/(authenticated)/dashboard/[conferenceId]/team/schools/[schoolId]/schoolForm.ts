import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { isPersonName } from '#lib/helpers/personName';
import { m } from '#lib/paraglide/messages';

/** Empty, or what the API's scalar takes; empty fields are cleared. */
const emptyOr = (check: (value: string) => boolean, message: () => string) =>
	z
		.string()
		.refine((value) => !value.trim() || check(value.trim()), { error: message })
		.optional();

/** What the team edits of a school. Empty fields are cleared on save. */
export const schoolFormSchema = z.object({
	name: z.string().trim().min(1),
	street: z.string().optional(),
	apartment: z.string().optional(),
	zip: z.string().optional(),
	city: z.string().optional(),
	region: z.string().nullish(),
	/** ISO 3166-1 alpha-3 */
	country: z.string().nullish(),
	contactName: emptyOr(isPersonName, () => m.invalidPersonName()),
	contactEmail: z.union([z.literal(''), z.email()]).optional(),
	contactPhone: emptyOr(isValidPhoneNumber, () => m.pleaseEnterAValidPhoneNumber()),
	notes: z.string().optional()
});

export type SchoolFormValues = z.infer<typeof schoolFormSchema>;

/** A form value as `updateSchool` takes it: an empty field clears the column. */
const orNull = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

/** The form's values as the arguments of `updateSchool`. */
export function toUpdateSchoolArgs({ id, values }: { id: string; values: SchoolFormValues }) {
	return {
		id,
		name: values.name.trim(),
		street: orNull(values.street),
		apartment: orNull(values.apartment),
		zip: orNull(values.zip),
		city: orNull(values.city),
		region: orNull(values.region),
		country: orNull(values.country),
		contactName: orNull(values.contactName),
		contactEmail: orNull(values.contactEmail),
		contactPhone: orNull(values.contactPhone),
		notes: orNull(values.notes)
	};
}
