import { m } from '#lib/paraglide/messages';
import { z } from 'zod';

/** The checks of a place's arguments, free of database access so they are unit tested. */

/** A latitude in degrees. */
export const latitudeSchema = z
	.number()
	.min(-90, { error: () => m.placeCoordinatesInvalid() })
	.max(90, { error: () => m.placeCoordinatesInvalid() })
	.nullish();

/** A longitude in degrees. */
export const longitudeSchema = z
	.number()
	.min(-180, { error: () => m.placeCoordinatesInvalid() })
	.max(180, { error: () => m.placeCoordinatesInvalid() })
	.nullish();
