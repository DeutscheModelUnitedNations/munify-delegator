import { schemabuilder } from './builder';

schemabuilder.queryFields((t) => {
	return {
		test: t.field({
			resolve: async () => 'hello',
			type: 'String'
		}),
		test2: t.field({
			resolve: async () => 'hello',
			type: 'String'
		})
	};
});
