import { ForbiddenError } from '@casl/ability';
import {
	PrismaClientInitializationError,
	PrismaClientKnownRequestError,
	PrismaClientRustPanicError,
	PrismaClientUnknownRequestError,
	PrismaClientValidationError
} from '@prisma/client/runtime/library';
import Elysia, { StatusMap } from 'elysia';

import { errors as openidErrors } from 'openid-client';
import { languageExtractor } from './languageExtractor';
import * as m from '$lib/paraglide/messages';

/**
 * An error that can be thrown when a permission check fails. For the user
 * this results in a forbidden error.
 */
export class PermissionCheckError extends Error {
	constructor(public message: string) {
		super(message);
	}
}

/**
 * An error whose message can be safely exposed to the user
 */
export class UserFacingError extends Error {
	constructor(
		public message: string,
		public status?: keyof StatusMap
	) {
		super(message);
	}
}

//TODO see if we still need this when using graphql

export const logger = new Elysia({
	name: 'logger'
})
	.use(languageExtractor)
	// these are errors which can occur in the app
	// we can register them here to gain type safety in our onError handler
	.error({
		PrismaClientKnownRequestError,
		PrismaClientUnknownRequestError,
		PrismaClientRustPanicError,
		PrismaClientInitializationError,
		PrismaClientValidationError,
		ForbiddenError,
		PermissionCheckError,
		UserFacingError,
		...openidErrors
	})
	.derive({ as: 'global' }, () => {
		return {
			requestId: Math.random().toString(36).substring(7)
		};
	})
	.onBeforeHandle({ as: 'global' }, ({ request, path, requestId }) => {
		console.info(`[${requestId}]: Received request ${request.method} ${path}`);
	})
	.onAfterHandle({ as: 'global' }, ({ request, path, set, requestId }) => {
		console.info(
			`[${requestId}]: Handled request ${request.method} ${path} with status ${set.status}`
		);
	})
	.onError({ as: 'global' }, ({ error, code, path, set, request, requestId, languageTag }) => {
		console.error(
			`[${requestId}]: Error in ${request.method} ${path}: ${code} ${error.message}. Thrown at ${error.stack}. \n ${JSON.stringify(error)}`
		);

		// Built-in elysia errors

		if (code === 'VALIDATION') {
			return error.message;
		}

		if (code === 'NOT_FOUND') {
			return m.pathDoesNotExist({ path, error: error.message }, { languageTag });
		}

		// Application errors

		if (code === 'ForbiddenError' || code === 'PermissionCheckError') {
			set.status = 'Forbidden';
			return m.forbidden(
				{ error: error.message ?? "You don't have permission to do that" },
				{ languageTag }
			);
		}

		if (code === 'OPError' || code === 'RPError') {
			set.status = 'Unauthorized';
			return m.unauthorized({ error: error.message ?? 'You are unauthorized' }, { languageTag });
		}

		//TODO code is not typed correctly for prisma errors?
		if (code === 'PrismaClientKnownRequestError') {
			if (error.code === 'P2025' || error.code === 'P2002') {
				return error.message;
			}
		}

		if (code === 'UserFacingError') {
			set.status = error.status ?? 'Internal Server Error';
			return error.message;
		}

		set.status = 'Internal Server Error';
		return m.internalServerError();
	});
