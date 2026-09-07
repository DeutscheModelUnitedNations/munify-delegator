import * as z from 'zod';
import worldCountries from 'world-countries';

// The `Nation` table only ever contains UN member states, because that is how
// `prisma/defaultData/nations.ts` populates it. Deriving the accepted codes from
// the very same source keeps this schema from accepting a code that later cannot
// be connected in `seedNewConference` (e.g. `TW`, which is a valid ISO 3166-1
// alpha-2 code but not a UN member).
const unMemberAlpha2Codes = worldCountries
	.filter((country) => country.unMember)
	.map((country) => country.cca2.toUpperCase());

const nationSeedSchema = z.enum(unMemberAlpha2Codes, {
	error: (issue) =>
		`"${String(issue.input)}" is not a UN member state. Only UN member states can be seeded as delegations of a committee.`
});

const hasUniqueValues = (values: string[]) => new Set(values).size === values.length;

const isoDateTime = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const ConferenceSeedingSchema = z.object({
	$schema: z.string(),
	conference: z
		.object({
			title: z.string(),
			longTitle: z.string(),
			location: z.string(),
			website: z.string().url(),
			language: z.string(),
			// ISO 8601 strings rather than `z.coerce.date()`: this is what the seeding
			// files actually contain, and unlike a bare date it can be expressed in the
			// JSON Schema served at /schemata/seed, which editors use to validate them.
			startAssignment: isoDateTime,
			startConference: isoDateTime,
			endConference: isoDateTime
		})
		.refine((conference) => conference.startAssignment < conference.startConference, {
			message: 'startAssignment has to be before startConference',
			path: ['startAssignment']
		})
		.refine((conference) => conference.startConference < conference.endConference, {
			message: 'startConference has to be before endConference',
			path: ['startConference']
		}),
	nsa: z
		.array(
			z.object({
				name: z.string(),
				abbreviation: z.string().refine((x) => x.length < 6),
				seatAmount: z.number().min(1).optional().default(1),
				description: z.string(),
				fontAwesomeIcon: z.string()
			})
		)
		.refine((nsas) => hasUniqueValues(nsas.map((nsa) => nsa.abbreviation)), {
			message: 'No Duplicate Non State Actor Abbreviations Allowed'
		}),
	committees: z
		.array(
			z.object({
				name: z.string(),
				abbreviation: z.string().refine((x) => x.length < 6),
				nations: z
					.array(nationSeedSchema)
					.min(1, { message: 'A committee needs at least one nation' })
					.refine((items) => hasUniqueValues(items), {
						message: 'No Duplicate Nations Allowed'
					}),
				numOfSeatsPerDelegation: z.number().min(1).optional().default(1)
			})
		)
		.refine((committees) => hasUniqueValues(committees.map((c) => c.abbreviation)), {
			message: 'No Duplicate Committee Abbreviations Allowed'
		}),
	customConferenceRole: z.array(
		z.object({
			name: z.string(),
			description: z.string(),
			fontAwesomeIcon: z.string()
		})
	)
});
