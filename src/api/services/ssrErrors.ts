import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { dev } from '$app/env';

/**
 * SvelteKit serializes what a remote function returns into the page, and devalue refuses class
 * instances such as `GraphQLError`: one error in an SSR query failed the whole page. So errors go
 * out as plain objects, and masked as yoga masks them on `/api/graphql` (`maskedErrors: !dev`),
 * since they end up in the page's HTML: an unexpected error (a failed SQL statement, with its
 * parameters) answers only that something went wrong.
 */
export function formatError(graphqlError: GraphQLError): GraphQLFormattedError {
	if (dev || isExpected(graphqlError)) return graphqlError.toJSON();
	return {
		message: 'Unexpected error.',
		path: graphqlError.path,
		locations: graphqlError.locations,
		extensions: { code: 'INTERNAL_SERVER_ERROR' }
	};
}

/** yoga's rule: an error is expected when it was raised as a `GraphQLError` all the way down. */
function isExpected(value: unknown): boolean {
	if (!(value instanceof GraphQLError)) return false;
	return value.originalError == null || isExpected(value.originalError);
}
