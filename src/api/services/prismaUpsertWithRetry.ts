import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * Attempts to perform an upsert operation with retries.
 *
 * This function tries to execute the provided upsertFn. If the operation fails due to a
 * PrismaClientKnownRequestError with error code 'P2002' (indicating a unique constraint violation),
 * it will instead call updateFn. The function will retry the upsert operation up to maxAttempts times
 * before throwing an error if all attempts fail.
 *
 * Reccommended by Prisma for upserting with retries when a unique constraint is violated; See
 * https://www.prisma.io/docs/orm/reference/prisma-client-reference?var=variantA#unique-key-constraint-errors-on-upserts
 *
 * @template T - The type of the result returned by the upsert or update operation.
 * @param upsertFn - A function that returns a Promise yielding an upsert result of type T.
 * @param updateFn - A function that returns a Promise yielding an update result of type T, called when
 *                   a unique constraint violation (P2002) is encountered.
 * @param maxAttempts - The maximum number of attempts for the upsert operation. Defaults to 3.
 * @returns A Promise resolving to a value of type T, which is the result of either the upsert or update operation.
 * @throws Will throw an error if the upsert operation fails with an error other than a unique constraint violation (P2002),
 *         or if the maximum number of attempts is reached.
 */
export async function upsertWithRetry<T>(
	upsertFn: () => Promise<T>,
	updateFn: () => Promise<T>
): Promise<T> {
	try {
		return await upsertFn();
	} catch (error: any) {
		if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
			return await updateFn();
		}
		throw error;
	}
}
