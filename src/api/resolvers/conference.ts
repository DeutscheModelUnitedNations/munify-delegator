import { schemabuilder } from './builder';

interface Giraffe {
	name: string;
	heightInMeters: number;
}

const GiraffeRef = schemabuilder.objectRef<Giraffe>('Giraffe').implement({
	description: 'Long necks, cool patterns, taller than you.',
	fields: (t) => ({
		name: t.exposeString('name'),
		heightInMeters: t.exposeFloat('heightInMeters')
	})
});

schemabuilder.queryFields((t) => ({
	giraffes: t.field({
		type: [GiraffeRef],
		resolve: () => [
			{
				name: 'Jeff',
				heightInMeters: 1.7
			},
			{
				name: 'Jeff2',
				heightInMeters: 1.7
			}
		]
	})
}));
	