import { cache, graphql } from '$houdini';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import {
	UpdateSurveyFormSchema,
	CreateOptionFormSchema,
	UpdateOptionFormSchema,
	DeleteOptionFormSchema
} from '../form-schema';

const SurveyDetailsQuery = graphql(`
	query SurveyResultsDetailsPage($conferenceId: String!, $surveyId: String!) {
		findUniqueSurveyQuestion(where: { id: $surveyId }) {
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
			surveyAnswers {
				id
				option {
					id
				}
				user {
					id
					given_name
					family_name
				}
			}
		}
		findManyUsers(
			where: {
				surveyAnswers: { none: { questionId: { equals: $surveyId } } }
				OR: [
					{
						delegationMemberships: {
							some: {
								conferenceId: { equals: $conferenceId }
								delegation: {
									OR: [
										{ assignedNationAlpha3Code: { not: { equals: null } } }
										{ assignedNonStateActorId: { not: { equals: null } } }
									]
								}
							}
						}
					}
					{
						singleParticipant: {
							some: {
								AND: [
									{ conferenceId: { equals: $conferenceId } }
									{ assignedRoleId: { not: { equals: null } } }
								]
							}
						}
					}
				]
			}
		) {
			id
			given_name
			family_name
		}
	}
`);

const UpdateSurveyMutation = graphql(`
	mutation UpdateSurveyQuestionDetail(
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

const CreateOptionMutation = graphql(`
	mutation CreateSurveyOption(
		$questionId: String!
		$title: String!
		$description: String!
		$upperLimit: Int!
	) {
		createOneSurveyOption(
			data: {
				questionId: $questionId
				title: $title
				description: $description
				upperLimit: $upperLimit
			}
		) {
			id
		}
	}
`);

const UpdateOptionMutation = graphql(`
	mutation UpdateSurveyOption(
		$id: String!
		$title: StringFieldUpdateOperationsInput
		$description: StringFieldUpdateOperationsInput
		$upperLimit: IntFieldUpdateOperationsInput
	) {
		updateOneSurveyOption(
			where: { id: $id }
			data: { title: $title, description: $description, upperLimit: $upperLimit }
		) {
			id
		}
	}
`);

const DeleteOptionMutation = graphql(`
	mutation DeleteSurveyOption($id: String!) {
		deleteOneSurveyOption(where: { id: $id }) {
			id
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { data } = await SurveyDetailsQuery.fetch({
		event,
		variables: {
			conferenceId: event.params.conferenceId,
			surveyId: event.params.surveyId
		},
		blocking: true
	});

	const updateSurveyForm = await superValidate(zod4(UpdateSurveyFormSchema));
	const createOptionForm = await superValidate(zod4(CreateOptionFormSchema));
	const updateOptionForm = await superValidate(zod4(UpdateOptionFormSchema));
	const deleteOptionForm = await superValidate(zod4(DeleteOptionFormSchema));

	return {
		survey: data?.findUniqueSurveyQuestion ?? null,
		usersNotAnswered: data?.findManyUsers ?? [],
		updateSurveyForm,
		createOptionForm,
		updateOptionForm,
		deleteOptionForm,
		conferenceId: event.params.conferenceId,
		surveyId: event.params.surveyId
	};
};

export const actions = {
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

	createOption: async (event) => {
		const form = await superValidate(event.request, zod4(CreateOptionFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await CreateOptionMutation.mutate(
			{
				questionId: form.data.questionId,
				title: form.data.title,
				description: form.data.description,
				upperLimit: form.data.upperLimit
			},
			{ event }
		);

		cache.markStale();
		return message(form, m.saved());
	},

	updateOption: async (event) => {
		const form = await superValidate(event.request, zod4(UpdateOptionFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await UpdateOptionMutation.mutate(
			{
				id: form.data.id,
				title: form.data.title ? { set: form.data.title } : undefined,
				description:
					form.data.description !== undefined ? { set: form.data.description } : undefined,
				upperLimit: form.data.upperLimit !== undefined ? { set: form.data.upperLimit } : undefined
			},
			{ event }
		);

		cache.markStale();
		return message(form, m.saved());
	},

	deleteOption: async (event) => {
		const form = await superValidate(event.request, zod4(DeleteOptionFormSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await DeleteOptionMutation.mutate(
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
