import { CombinedError } from '@urql/core';
import { m } from '#lib/paraglide/messages';
import { apiErrorMessageOf } from '#lib/api/errorCodes';

/**
 * What a failure's toast says. A failed operation shows the message the API worded for the person
 * (`apiErrorMessageOf`), never its raw `message` ("[GraphQL] …", or an unexpected error's text not
 * meant for people). Errors the client throws itself carry translated text and show it.
 */
export function errorToastMessage(error: unknown) {
	if (error instanceof CombinedError) return apiErrorMessageOf(error) ?? m.genericToastError();
	return error instanceof Error && error.message ? error.message : m.genericToastError();
}

export const genericPromiseToastMessages = {
	loading: m.genericToastLoading(),
	success: m.genericToastSuccess(),
	error: errorToastMessage
};
