import { describe, expect, it } from 'vitest';
import {
	GraphQLBoolean,
	GraphQLID,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLScalarType,
	GraphQLSchema,
	GraphQLString,
	print,
	type GraphQLFieldConfigMap
} from 'graphql';
import { mcpTool } from './mcpTool';
import {
	mutationInput,
	mutationOperation,
	mutationToolsOf,
	needsConfirmation,
	previewOf,
	toolAnnotations
} from './mutationTools';

const PersonName = new GraphQLScalarType({ name: 'PersonName' });

const Committee = new GraphQLObjectType({
	name: 'Committee',
	fields: { id: { type: GraphQLID }, name: { type: GraphQLString } }
});

function schemaWith(mutations: GraphQLFieldConfigMap<unknown, unknown>) {
	return new GraphQLSchema({
		query: new GraphQLObjectType({ name: 'Query', fields: { ok: { type: GraphQLBoolean } } }),
		mutation: new GraphQLObjectType({ name: 'Mutation', fields: mutations })
	});
}

describe('mutationToolsOf', () => {
	const schema = schemaWith({
		createCommittee: {
			type: Committee,
			extensions: mcpTool({ textArguments: ['name'] }),
			args: {
				conferenceId: { type: new GraphQLNonNull(GraphQLID) },
				name: { type: new GraphQLNonNull(GraphQLString) },
				seats: { type: GraphQLInt },
				// free text nobody declared: left out
				notes: { type: GraphQLString }
			}
		},
		renamePerson: {
			type: GraphQLBoolean,
			extensions: mcpTool(),
			args: { id: { type: GraphQLID }, givenName: { type: PersonName } }
		},
		notOptedIn: { type: GraphQLBoolean, args: { id: { type: GraphQLID } } },
		needsPersonalData: {
			type: GraphQLBoolean,
			extensions: mcpTool(),
			args: { givenName: { type: new GraphQLNonNull(PersonName) } }
		},
		declaresPersonalData: {
			type: GraphQLBoolean,
			extensions: mcpTool({ textArguments: ['givenName'] }),
			args: { givenName: { type: PersonName } }
		},
		changeStage: {
			type: GraphQLBoolean,
			extensions: mcpTool({ outwardArguments: ['stage'] }),
			args: {
				id: { type: GraphQLID },
				stage: { type: GraphQLString },
				title: { type: GraphQLString }
			}
		}
	});
	const { tools, problems } = mutationToolsOf(schema);
	const tool = (name: string) => tools.find((candidate) => candidate.name === name);

	it('offers only mutations that opted in', () => {
		expect(tools.map((candidate) => candidate.name).sort()).toEqual([
			'changeStage',
			'createCommittee',
			'renamePerson'
		]);
	});

	it('reports opt-ins that cannot be a tool', () => {
		expect(problems).toEqual([
			'needsPersonalData needs givenName, which an assistant may not pass',
			'declaresPersonalData.givenName holds personal data and cannot be passed'
		]);
	});

	it('passes declared text and plain values, never personal data or undeclared text', () => {
		const create = tool('createCommittee');
		expect(Object.keys(create?.inputSchema.properties ?? {}).sort()).toEqual([
			'conferenceId',
			'name',
			'seats'
		]);
		expect(create?.inputSchema.required).toEqual(['conferenceId', 'name']);
		expect(create?.inputSchema.additionalProperties).toBe(false);
		expect(Object.keys(tool('renamePerson')?.inputSchema.properties ?? {}).sort()).toEqual([
			'conferenceId',
			'id'
		]);
	});

	it('asks for confirmation only when an outward argument is given', () => {
		const stage = tool('changeStage');
		if (!stage) throw new Error('no tool');
		expect(stage.inputSchema.properties).toHaveProperty('confirm');
		expect(needsConfirmation({ tool: stage, args: { id: 'c', title: 'New' } })).toBe(false);
		expect(needsConfirmation({ tool: stage, args: { id: 'c', stage: 'ACTIVE' } })).toBe(true);
	});

	it('splits a call into its conference, its confirmation and the arguments', () => {
		expect(mutationInput({ conferenceId: 'c1', confirm: true, id: 'c1', stage: 'ACTIVE' })).toEqual(
			{ conferenceId: 'c1', confirmed: true, args: { id: 'c1', stage: 'ACTIVE' } }
		);
		expect(mutationInput({ conferenceId: 'c1' }).confirmed).toBe(false);
		expect(() => mutationInput({ id: 'c1' })).toThrow();
	});

	it('previews and hints what reaches people outside the team', () => {
		const stage = tool('changeStage');
		const create = tool('createCommittee');
		if (!stage || !create) throw new Error('no tool');
		expect(previewOf({ tool: stage, args: { stage: 'ACTIVE' } })).toMatchObject({
			preview: true,
			tool: 'changeStage',
			arguments: { stage: 'ACTIVE' }
		});
		expect(toolAnnotations(stage)).toMatchObject({ openWorldHint: true, destructiveHint: false });
		expect(toolAnnotations(create)).toMatchObject({ openWorldHint: false });
	});

	it('builds the mutation from the exposed arguments, with the tool’s conference', () => {
		const create = tool('createCommittee');
		if (!create) throw new Error('no tool');
		const { document, variables } = mutationOperation({
			tool: create,
			args: { name: 'GA', notes: 'smuggled' },
			conferenceId: 'c1'
		});
		expect(print(document)).toContain('createCommittee(conferenceId: $conferenceId, name: $name)');
		expect(variables).toEqual({ conferenceId: 'c1', name: 'GA' });
	});
});
