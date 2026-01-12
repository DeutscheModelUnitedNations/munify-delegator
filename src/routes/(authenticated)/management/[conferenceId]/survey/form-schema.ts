import z from 'zod';

export const CreateSurveyFormSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	deadline: z.string().min(1)
});

export const UpdateSurveyFormSchema = z.object({
	id: z.string(),
	title: z.string().min(1).optional(),
	description: z.string().min(1).optional(),
	deadline: z.string().optional(),
	draft: z.boolean().optional()
});

export const DeleteSurveyFormSchema = z.object({
	id: z.string()
});

export const CreateOptionFormSchema = z.object({
	questionId: z.string(),
	title: z.string().min(1),
	description: z.string(),
	upperLimit: z.coerce.number().int().min(0)
});

export const UpdateOptionFormSchema = z.object({
	id: z.string(),
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	upperLimit: z.coerce.number().int().min(0).optional()
});

export const DeleteOptionFormSchema = z.object({
	id: z.string()
});
