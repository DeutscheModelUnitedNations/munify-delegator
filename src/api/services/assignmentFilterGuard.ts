import { db } from '$api/db/db';
import type { ApiContext, createYoga } from '$api/rumble';
import { isSystemAdmin, userId } from '$api/services/authHelper';
import { findGatedFilters } from '$api/services/gatedFilters';
import { GraphQLError, type DocumentNode, type GraphQLSchema } from 'graphql';

type YogaPlugin = NonNullable<NonNullable<Parameters<typeof createYoga>[0]>['plugins']>[number];

const isApiContext = (context: unknown): context is ApiContext =>
	typeof context === 'object' && context !== null && 'abilities' in context && 'hasRole' in context;

/** Whether the caller may filter by assignments: an admin, or on the team of any conference. */
async function mayFilterByAssignment(context: unknown) {
	if (!isApiContext(context)) return false;
	if (isSystemAdmin(context)) return true;
	const id = userId(context);
	if (!id) return false;
	const membership = await db.query.teamMember.findFirst({
		where: { userId: id },
		columns: { id: true }
	});
	return !!membership;
}

/** The refusal for a request that filters by something it may not see, if it does. */
async function refusal(
	schema: GraphQLSchema,
	document: DocumentNode,
	variables: Record<string, unknown> | null | undefined,
	context: unknown
) {
	const gated = findGatedFilters(schema, document, variables);
	if (gated.length === 0 || (await mayFilterByAssignment(context))) return undefined;
	return {
		errors: [
			new GraphQLError(
				`Access denied - the assignment cannot be filtered or sorted by: ${gated.join(', ')}`
			)
		]
	};
}

/**
 * Refuses queries and subscriptions that filter or sort by a participant's assignment unless the
 * caller is on a team. Masking only hides the columns from what is read; a filter is applied in
 * SQL first and would answer "does this delegation hold FRA?" for anyone who asks. See
 * `$api/services/gatedFilters`.
 */
export function useAssignmentFilterGuard(): YogaPlugin {
	return {
		onExecute({ args, executeFn, setExecuteFn }) {
			setExecuteFn(async (executionArgs) => {
				const refused = await refusal(
					args.schema,
					args.document,
					args.variableValues,
					args.contextValue
				);
				return refused ?? executeFn(executionArgs);
			});
		},
		onSubscribe({ args, subscribeFn, setSubscribeFn }) {
			setSubscribeFn(async (subscriptionArgs) => {
				const refused = await refusal(
					args.schema,
					args.document,
					args.variableValues,
					args.contextValue
				);
				return refused ?? subscribeFn(subscriptionArgs);
			});
		}
	};
}
