import { mapEnvToSchema } from '$config/schemaMapper';
import { Type } from '@sinclair/typebox';

export const config = mapEnvToSchema({
	env: process.env,
	prefix: '',
	separator: '_',
	building: false,
	schema: Type.Object({
		DATABASE_URL: Type.String(),
		// NODE_ENV: Type.Union([
		// 	Type.Literal('development'),
		// 	Type.Literal('production'),
		// 	Type.Literal('test')
		// ]),
		SLACK_ERROR_WEBHOOK: Type.Optional(Type.String()),
		SLACK_NOTIFICATION_WEBHOOK: Type.Optional(Type.String()),
		LISTMONK_API_URL: Type.String(),
		LISTMONK_API_USER: Type.String(),
		LISTMONK_API_KEY: Type.String()
	})
});
