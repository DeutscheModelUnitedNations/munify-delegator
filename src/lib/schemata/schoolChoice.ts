import { PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH } from '$app/env/public';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/** The name of a school to find or create. */
export const schoolNameSchema = z
	.string()
	.max(PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH, { error: () => m.schoolNameTooLong() })
	.nullish();

/**
 * A school as a form asks for it (`SchoolPicker`): an existing school's id, or the name of one to
 * find or create. Both empty means no school.
 */
export const schoolChoiceSchema = z.object({
	schoolId: z.string().nullish(),
	schoolName: schoolNameSchema
});
