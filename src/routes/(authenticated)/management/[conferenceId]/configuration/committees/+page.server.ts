import { cache, graphql } from '$houdini';
import z from 'zod';
import type { PageServerLoad } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { invalidateAll } from '$app/navigation';
import { fail } from '@sveltejs/kit';

const ConfigurationCommitteesQuery = graphql(`
	query ManagementCommitteeQuery($conferenceId: String!) {
		findManyCommittees(where: { conferenceId: { equals: $conferenceId } }) {
			id
			abbreviation
			name
			numOfSeatsPerDelegation
			nations {
				alpha2Code
				alpha3Code
			}
			agendaItems {
				id
				title
				teaserText
			}
		}
	}
`);

const AddAgendaItemMutation = graphql(`
		mutation AddAgendaItemMutation($committeeId: String!, $title: String!, $teaserText: String!) {
			createOneAgendaItem(
				data: { committeeId: $committeeId, title: $title, teaserText: $teaserText }
			) {
				id
			}
		}
	`);

const AddAgendaItemFormSchema = z.object({
  committeeId: z.string(),
  title: z.string(),
  teaserText: z.string()
})

export const load: PageServerLoad = async (event) => {

  const { data } = await ConfigurationCommitteesQuery.fetch({
    event,
    variables: { id: event.params.conferenceId },
    blocking: true
  });

  const addAgendaItemForm = superValidate(zod(AddAgendaItemFormSchema))

  return {
    data,
    addAgendaItemForm
  }
}


export const actions = {
  default: async (event) => {
    const form = await superValidate(event.request, zod(AddAgendaItemFormSchema));
    if (!form.valid) {
      return fail(400, { form });
    }
    await AddAgendaItemMutation.mutate(
      {
        data: form.data,
        where: {
          id: event.params.conferenceId
        }
      },
      { event }
    );

    cache.markStale()
    invalidateAll()

    return message(form, m.saved());
  }
} satisfies Actions;
