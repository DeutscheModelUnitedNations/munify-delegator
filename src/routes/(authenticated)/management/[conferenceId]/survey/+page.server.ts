import { cache, graphql } from '$houdini';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import {
	CreateSurveyFormSchema,
	UpdateSurveyFormSchema,
	DeleteSurveyFormSchema
} from './form-schema';

const SurveyResultsQuery = graphql(`
	query SurveyResultsMainPage($conferenceId: String!) {
		findManySurveyQuestions(where: { conferenceId: { equals: $conferenceId } }) {
			id
			title
			description
			deadline
			draft
			options {
				id
				title
				description
				countSurveyAnswers
				upperLimit
			}
		}
	}
`);

const CreateSurveyMutation = graphql(`
	mutation CreateSurveyQuestion(
		$conferenceId: String!
		$title: String!
		$description: String!
		$deadline: DateTime!
	) {
		createOneSurveyQuestion(
			data: {
				conferenceId: $conferenceId
				title: $title
				description: $description
				deadline: $deadline
				draft: true
			}
		) {
			id
		}
	}
`);

const UpdateSurveyMutation = graphql(`
	mutation UpdateSurveyQuestion(
		$id: String!
		$title: StringFieldUpdateOperationsInput
		$description: StringFieldUpdateOperationsInput
		$deadline: DateTimeFieldUpdateOperationsInput
		$draft: BoolFieldUpdateOperationsInput
	) {
		updateOneSurveyQuestion(
			where: { id: $id }
			data: { title: $title, description: $description, deadline: $deadline, draft: $draft }
		) {
			id
		}
	}
`);

const DeleteSurveyMutation = graphql(`
	mutation DeleteSurveyQuestion($id: String!) {
		deleteOneSurveyQuestion(where: { id: $id }) {
			id
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { data } = await SurveyResultsQuery.fetch({
		event,
		variables: { conferenceId: event.params.conferenceId },
		blocking: true
	});

	const createSurveyForm = await superValidate(zod4(CreateSurveyFormSchema));
	const updateSurveyForm = await superValidate(zod4(UpdateSurveyFormSchema));
	const deleteSurveyForm = await superValidate(zod4(DeleteSurveyFormSchema));

	return {
		surveys: data?.findManySurveyQuestions ?? [],
		createSurveyForm,
		updateSurveyForm,
		deleteSurveyForm,
		conferenceId: event.params.conferenceId
	};
};

export const actions = {
	createSurvey: async (event) => {
		const form = await superValidate(event.request, zod4(CreateSurveyFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await CreateSurveyMutation.mutate(
			{
				conferenceId: event.params.conferenceId,
				title: form.data.title,
				description: form.data.description,
				deadline: new Date(form.data.deadline)
			},
			{ event }
		);

		cache.markStale();
		return message(form, m.saved());
	},

	updateSurvey: async (event) => {
		const form = await superValidate(event.request, zod4(UpdateSurveyFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await UpdateSurveyMutation.mutate(
			{
				id: form.data.id,
				title: form.data.title ? { set: form.data.title } : undefined,
				description: form.data.description ? { set: form.data.description } : undefined,
				deadline: form.data.deadline ? { set: new Date(form.data.deadline) } : undefined,
				draft: form.data.draft !== undefined ? { set: form.data.draft } : undefined
			},
			{ event }
		);

		cache.markStale();
		return message(form, m.saved());
	},

	deleteSurvey: async (event) => {
		const form = await superValidate(event.request, zod4(DeleteSurveyFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await DeleteSurveyMutation.mutate(
			{
				id: form.data.id
			},
			{ event }
		);

		cache.markStale();
		return message(form, m.deleted());
	},

	toggleDraft: async (event) => {
		const formData = await event.request.formData();
		const id = formData.get('id') as string;
		const currentDraft = formData.get('draft') === 'true';

		await UpdateSurveyMutation.mutate(
			{
				id,
				draft: { set: !currentDraft }
			},
			{ event }
		);

		cache.markStale();
		return { success: true };
	}
} satisfies Actions;
