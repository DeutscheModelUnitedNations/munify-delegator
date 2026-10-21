import { PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH } from '$app/env/public';
import { z } from 'zod';

/**
 * A school as a form asks for it (`SchoolPicker`): an existing school's id, or the name of one to
 * find or create. Both empty means no school.
 */
export const schoolChoiceSchema = z.object({
	schoolId: z.string().nullish(),
	schoolName: z.string().max(PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH).nullish()
});
