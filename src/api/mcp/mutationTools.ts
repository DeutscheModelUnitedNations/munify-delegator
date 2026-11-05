import {
	getNamedType,
	isEnumType,
	isInputObjectType,
	isListType,
	isNonNullType,
	isObjectType,
	parse,
	type DocumentNode,
	type GraphQLArgument,
	type GraphQLField,
	type GraphQLInputObjectType,
	type GraphQLInputType,
	type GraphQLSchema,
	type OperationDefinitionNode
} from 'graphql';
import type { JsonSchemaType, ToolAnnotations } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { classifyField } from './classification';
import { mcpAnnotationOf, type McpToolAnnotation } from './mcpTool';

/**
 * The tools generated from the mutations that opted in (`mcpTool`): each takes the conference it
 * is about, the mutation's arguments that cannot carry personal data, and `confirm` where it
 * reaches people outside the team.
 */

/** Scalars that hold a person's data by definition. Never an argument an assistant may pass. */
const PERSONAL_SCALARS = new Set(['PersonName', 'EmailAddress', 'PhoneNumber']);

/** Input types that hold a person's data by definition. */
const PERSONAL_INPUTS = new Set(['AddressInput']);

/**
 * Scalars that cannot carry personal data. Every other one (`String`, `JSON`, any custom scalar)
 * counts as free text, which an assistant passes only where `textArguments` allows.
 */
const PLAIN_SCALARS = new Set(['ID', 'Int', 'Float', 'Boolean', 'Date', 'DateTime']);

export interface MutationTool {
	name: string;
	description: string;
	inputSchema: JsonSchemaType;
	annotation: McpToolAnnotation;
	field: GraphQLField<unknown, unknown>;
	/** The arguments the tool takes and passes on; a `conferenceId` among them is the tool's. */
	arguments: GraphQLArgument[];
}

/** What an input type holds, for deciding whether an assistant may pass it. */
function inputKinds(type: GraphQLInputType, seen = new Set<string>()): Set<'personal' | 'text'> {
	const named = getNamedType(type);
	const kinds = new Set<'personal' | 'text'>();
	if (PERSONAL_SCALARS.has(named.name) || PERSONAL_INPUTS.has(named.name)) {
		kinds.add('personal');
	} else if (isInputObjectType(named)) {
		if (seen.has(named.name)) return kinds;
		seen.add(named.name);
		for (const field of Object.values(named.getFields())) {
			for (const kind of inputKinds(field.type, seen)) kinds.add(kind);
		}
	} else if (!isEnumType(named) && !PLAIN_SCALARS.has(named.name)) {
		kinds.add('text');
	}
	return kinds;
}

/** JSON Schema of the scalars that are not plain strings. */
const SCALAR_SCHEMAS: Record<string, JsonSchemaType> = {
	Int: { type: 'integer' },
	Float: { type: 'number' },
	Boolean: { type: 'boolean' },
	Date: { type: 'string', format: 'date' },
	DateTime: { type: 'string', format: 'date-time' },
	JSON: {}
};

function inputObjectSchema(type: GraphQLInputObjectType, seen: readonly string[]): JsonSchemaType {
	if (seen.includes(type.name)) return { type: 'object' };
	const fields = Object.values(type.getFields());
	return {
		type: 'object',
		properties: Object.fromEntries(
			fields.map((field) => [
				field.name,
				{
					...jsonSchemaOf(field.type, [...seen, type.name]),
					...(field.description ? { description: field.description } : {})
				}
			])
		),
		required: fields.filter((field) => isNonNullType(field.type)).map((field) => field.name),
		additionalProperties: false
	};
}

/** A GraphQL input type as JSON Schema, for the tool's input. */
function jsonSchemaOf(type: GraphQLInputType, seen: readonly string[] = []): JsonSchemaType {
	if (isNonNullType(type)) return jsonSchemaOf(type.ofType, seen);
	if (isListType(type)) return { type: 'array', items: jsonSchemaOf(type.ofType, seen) };
	if (isEnumType(type))
		return { type: 'string', enum: type.getValues().map((value) => value.name) };
	if (isInputObjectType(type)) return inputObjectSchema(type, seen);
	return SCALAR_SCHEMAS[type.name] ?? { type: 'string' };
}

/** A nullable argument also takes `null`, which clears the value. */
function argumentSchema(arg: GraphQLArgument): JsonSchemaType {
	const schema = jsonSchemaOf(arg.type);
	const described = arg.description ? { ...schema, description: arg.description } : schema;
	return isNonNullType(arg.type) ? described : { anyOf: [described, { type: 'null' }] };
}

/** Whether an assistant may pass an argument: never personal data, free text only if declared. */
function mayPass({ arg, annotation }: { arg: GraphQLArgument; annotation: McpToolAnnotation }) {
	const kinds = inputKinds(arg.type);
	if (kinds.has('personal')) return false;
	return !kinds.has('text') || annotation.textArguments.includes(arg.name);
}

/**
 * The arguments a tool takes, or why the mutation cannot be one: a required argument it may not
 * pass, or an annotation naming a personal or missing argument.
 */
function exposedArguments({
	field,
	annotation
}: {
	field: GraphQLField<unknown, unknown>;
	annotation: McpToolAnnotation;
}): { exposed: GraphQLArgument[] } | { problem: string } {
	for (const name of [...annotation.textArguments, ...annotation.outwardArguments]) {
		const arg = field.args.find((candidate) => candidate.name === name);
		if (!arg) return { problem: `${field.name} has no argument ${name}` };
		if (inputKinds(arg.type).has('personal')) {
			return { problem: `${field.name}.${name} holds personal data and cannot be passed` };
		}
	}
	const exposed = field.args.filter((arg) => mayPass({ arg, annotation }));
	const missing = field.args.find((arg) => !exposed.includes(arg) && isNonNullType(arg.type));
	if (missing) {
		return { problem: `${field.name} needs ${missing.name}, which an assistant may not pass` };
	}
	return { exposed };
}

function isConfirmable(annotation: McpToolAnnotation) {
	return annotation.outward || annotation.outwardArguments.length > 0;
}

/** The tool's input: the conference, the exposed arguments, and `confirm` where it is outward. */
function toolInputSchema({
	exposed,
	annotation
}: {
	exposed: GraphQLArgument[];
	annotation: McpToolAnnotation;
}): JsonSchemaType {
	const own = exposed.filter((arg) => arg.name !== 'conferenceId');
	const properties: Record<string, JsonSchemaType> = {
		conferenceId: {
			type: 'string',
			description: 'The conference this change is about (see whoami).'
		},
		...Object.fromEntries(own.map((arg) => [arg.name, argumentSchema(arg)])),
		...(isConfirmable(annotation)
			? {
					confirm: {
						type: 'boolean',
						description:
							'Reaches people outside the team. Leave it out first to get a preview, and set it to true only after the user agreed to exactly that change.'
					}
				}
			: {})
	};
	const required = [
		'conferenceId',
		...own.filter((arg) => isNonNullType(arg.type)).map((arg) => arg.name)
	];
	return { type: 'object', properties, required, additionalProperties: false };
}

function toolDescription({
	field,
	annotation,
	exposed
}: {
	field: GraphQLField<unknown, unknown>;
	annotation: McpToolAnnotation;
	exposed: GraphQLArgument[];
}) {
	const hidden = field.args.filter((arg) => !exposed.includes(arg)).map((arg) => arg.name);
	const outward = annotation.outwardArguments;
	return [
		annotation.description ?? field.description ?? field.name,
		hidden.length > 0
			? `Not available to assistants, because it could carry personal data: ${hidden.join(', ')}.`
			: '',
		outward.length > 0
			? `Changing ${outward.join(', ')} reaches people outside the team and needs confirm.`
			: ''
	]
		.filter(Boolean)
		.join(' ');
}

/** Builds the tool of one opted-in mutation, or says why it cannot be one. */
function mutationTool(
	field: GraphQLField<unknown, unknown>
): { tool: MutationTool } | { problem: string } | undefined {
	const annotation = mcpAnnotationOf(field.extensions);
	if (!annotation) return undefined;
	const exposure = exposedArguments({ field, annotation });
	if ('problem' in exposure) return exposure;
	const { exposed } = exposure;
	return {
		tool: {
			name: field.name,
			description: toolDescription({ field, annotation, exposed }),
			inputSchema: toolInputSchema({ exposed, annotation }),
			annotation,
			field,
			arguments: exposed
		}
	};
}

/** Every mutation that opted in, as a tool, and the opt-ins that cannot be one. */
export function mutationToolsOf(schema: GraphQLSchema) {
	const tools: MutationTool[] = [];
	const problems: string[] = [];
	for (const field of Object.values(schema.getMutationType()?.getFields() ?? {})) {
		const built = mutationTool(field);
		if (!built) continue;
		if ('problem' in built) problems.push(built.problem);
		else tools.push(built.tool);
	}
	return { tools, problems };
}

/** Whether a call needs the user's confirmation first: it reaches people outside the team. */
export function needsConfirmation({
	tool,
	args
}: {
	tool: MutationTool;
	args: Record<string, unknown>;
}) {
	return (
		tool.annotation.outward ||
		tool.annotation.outwardArguments.some((name) => args[name] !== undefined)
	);
}

/** The hints clients show next to a mutation tool. */
export function toolAnnotations(tool: MutationTool): ToolAnnotations {
	return {
		readOnlyHint: false,
		destructiveHint: /^(delete|discard)/.test(tool.name),
		openWorldHint: isConfirmable(tool.annotation)
	};
}

const mutationInputSchema = z.looseObject({
	conferenceId: z.string().min(1),
	confirm: z.boolean().optional()
});

/** A tool call's input: the conference, whether it is confirmed, and the mutation's arguments. */
export function mutationInput(input: unknown) {
	const { conferenceId, confirm, ...args } = mutationInputSchema.parse(input);
	return { conferenceId, confirmed: confirm === true, args };
}

/** What a call that needs confirming answers instead of changing anything. */
export function previewOf({ tool, args }: { tool: MutationTool; args: Record<string, unknown> }) {
	return {
		preview: true,
		message:
			'Nothing changed yet. This change reaches people outside the team. Show the user exactly what will change and call again with confirm: true once they agreed.',
		tool: tool.name,
		arguments: args
	};
}

/** The mutation's answer as a selection: its fields an assistant may read, nothing else. */
function resultSelection(field: GraphQLField<unknown, unknown>) {
	const type = getNamedType(field.type);
	if (!isObjectType(type)) return '';
	const leaves = Object.values(type.getFields()).filter(
		(candidate) =>
			!isObjectType(getNamedType(candidate.type)) &&
			candidate.args.length === 0 &&
			classifyField({ typeName: type.name, fieldName: candidate.name }) === 'visible'
	);
	return leaves.length > 0
		? ` { ${leaves.map((leaf) => leaf.name).join(' ')} }`
		: ' { __typename }';
}

/**
 * The mutation document a tool call runs, and the variables for it: only the arguments the tool
 * exposes, and the tool's `conferenceId` for a mutation that takes one.
 */
export function mutationOperation({
	tool,
	args,
	conferenceId
}: {
	tool: MutationTool;
	args: Record<string, unknown>;
	conferenceId: string;
}): {
	document: DocumentNode;
	operation: OperationDefinitionNode;
	variables: Record<string, unknown>;
} {
	const passed = tool.arguments.filter(
		(arg) => arg.name === 'conferenceId' || args[arg.name] !== undefined
	);
	const variables = Object.fromEntries(
		passed.map((arg) => [arg.name, arg.name === 'conferenceId' ? conferenceId : args[arg.name]])
	);
	const definitions = passed.map((arg) => `$${arg.name}: ${String(arg.type)}`).join(', ');
	const callArguments = passed.map((arg) => `${arg.name}: $${arg.name}`).join(', ');
	const source = `mutation${definitions ? `(${definitions})` : ''} { ${tool.field.name}${
		callArguments ? `(${callArguments})` : ''
	}${resultSelection(tool.field)} }`;
	const document = parse(source);
	const [operation] = document.definitions;
	if (!operation || operation.kind !== 'OperationDefinition') {
		throw new Error(`Could not build the operation of ${tool.name}`);
	}
	return { document, operation, variables };
}
