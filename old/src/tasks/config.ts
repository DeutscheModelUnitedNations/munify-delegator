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
		SLACK_NOTIFICATION_WEBHOOK: Type.Optional(Type.String())
	})
});
