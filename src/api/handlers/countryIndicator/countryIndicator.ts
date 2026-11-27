import { schemaBuilder } from '#api/rumble';
import { assertCanReadCountryIndicators } from './countryIndicatorPermissions';
import {
	countryFigures,
	countryIndicatorsArgsSchema,
	type CountryFigure
} from './countryIndicatorService';

/**
 * World Bank figures about a country for the country information delegates and supervisors see,
 * fetched by the server and cached (`countryIndicatorService.ts`). Which indicators there are is
 * the app's choice (`#lib/countryStats/indicators`).
 */

type Row = CountryFigure & { alpha3Code: string };

const CountryIndicatorRef = schemaBuilder.objectRef<Row>('CountryIndicator');
CountryIndicatorRef.implement({
	description: 'The most recent World Bank figure of one indicator for one country.',
	fields: (t) => ({
		id: t.id({ resolve: ({ alpha3Code, indicator }) => `${alpha3Code}.${indicator}` }),
		alpha3Code: t.string({ resolve: ({ alpha3Code }) => alpha3Code }),
		indicator: t.string({
			description: "The World Bank's indicator code, e.g. SP.POP.TOTL.",
			resolve: ({ indicator }) => indicator
		}),
		value: t.float({
			nullable: true,
			description: 'Null when the World Bank has no figure from the last ten years.',
			resolve: ({ value }) => value
		}),
		year: t.int({
			nullable: true,
			description: 'The year the value is for.',
			resolve: ({ year }) => year
		})
	})
});

schemaBuilder.queryFields((t) => ({
	countryIndicators: t.field({
		description:
			'The World Bank figures of the country information for a country (ISO alpha-3), in display order. Served from a cache: a figure is at most a week old, or older while the World Bank does not answer. INVALID_INPUT for a code that names no country.',
		type: [CountryIndicatorRef],
		args: { alpha3Code: t.arg.string({ required: true }) },
		validate: countryIndicatorsArgsSchema,
		resolve: async (_root, { alpha3Code }, ctx) => {
			assertCanReadCountryIndicators(ctx);
			const figures = await countryFigures({ alpha3Code });
			return figures.map((figure) => ({ ...figure, alpha3Code }));
		}
	})
}));
