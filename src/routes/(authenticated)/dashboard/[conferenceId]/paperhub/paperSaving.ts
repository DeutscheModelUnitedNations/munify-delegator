import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { client, type PapertypeEnum } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';

/** The toast shown while an author saves a paper as a draft or submits it. */
export function paperSaveToastMessages(submit: boolean) {
	return {
		loading: submit ? m.paperSubmitting() : m.paperSavingDraft(),
		success: submit ? m.paperSubmittedSuccessfully() : m.paperDraftSavedSuccessfully(),
		error: submit ? m.paperSubmitError() : m.paperSaveDraftError()
	};
}

export interface NewPaper {
	conferenceId: string;
	authorId: string;
	/** Missing when the author's delegation could not be found; the save is refused then. */
	delegationId: string | undefined;
	type: PapertypeEnum;
	content: unknown;
	agendaItemId: string | undefined;
}

/**
 * Creates a paper, as a draft or already submitted, behind the save toast. Once it exists,
 * `onCreated` gets to clear the editor and its stored draft, and the author returns to the paper
 * hub.
 */
export async function createPaper(
	{ delegationId, ...paper }: NewPaper,
	submit: boolean,
	onCreated: () => void
) {
	if (!delegationId) {
		toast.error(m.paperSaveDraftError());
		return;
	}

	const promise = client.mutate.createPaper({
		__args: { ...paper, delegationId, status: submit ? 'SUBMITTED' : 'DRAFT' },
		id: true
	});
	toast.promise(promise, paperSaveToastMessages(submit));

	const created = await promise;
	if (created.id) {
		onCreated();
		goto(resolve(`/dashboard/${paper.conferenceId}/paperhub`));
	}
}
