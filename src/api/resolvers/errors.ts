import { maskError as ME } from 'graphql-yoga';
import type { MaskError } from 'graphql-yoga';

export const maskError: MaskError = (error, message, isDev) => {
	const e = error as any;
	if (e.message.includes('Unique constraint failed')) {
		return e;
	}

	if (
		e.message.includes(
			'An operation failed because it depends on one or more records that were required but not found'
		)
	) {
		return e;
	}

	return ME(error, message, isDev);
};
