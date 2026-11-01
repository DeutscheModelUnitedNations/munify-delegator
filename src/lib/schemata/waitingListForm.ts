import { z } from 'zod';
import { applicationTextSchema } from '#lib/schemata/applicationForm';
import { schoolNameSchema } from '#lib/schemata/schoolChoice';

export const waitingListFormSchema = z.object({
	/** An existing school; `schoolName` names one to find or create instead. */
	schoolId: z.string().nullish(),
	schoolName: schoolNameSchema,
	motivation: applicationTextSchema,
	experience: applicationTextSchema,
	requests: applicationTextSchema.nullish()
});
