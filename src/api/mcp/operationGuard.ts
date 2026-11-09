import {
	getArgumentValues,
	getNamedType,
	getVariableValues,
	isEnumType,
	isInputObjectType,
	isObjectType,
	Kind,
	type DocumentNode,
	type FieldNode,
	type FragmentDefinitionNode,
	type GraphQLArgument,
	type GraphQLField,
	type GraphQLInputObjectType,
	type GraphQLObjectType,
	type GraphQLSchema,
	type OperationDefinitionNode,
	type SelectionSetNode,
	type VariableValues
} from 'graphql';
import { ALLOWED_FREE_ARGUMENTS, classifyField } from './classification';
import { fieldNodes, fragmentsOf } from './selections';

/**
 * What an assistant may ask by, before the operation runs.
 *
 * The answers are redacted (`redact.ts`), but a question can give away what an answer hides:
 * `users(where: { familyName: { like: "M%" } })` answers ids only, yet tells whether someone
 * called M… is there, and narrowing the pattern spells out the name. So only fields the
 * classification shows may be filtered, sorted or searched by, and free-form arguments (a name
 * search, an entry code) only where `ALLOWED_FREE_ARGUMENTS` lists them.
 */

const WHERE_SUFFIX = 'WhereInputArgument';
const ORDER_SUFFIX = 'OrderInputArgument';

/** Scalars an argument may always carry: they cannot spell out anything about a person. */
const PLAIN_SCALARS = new Set(['ID', 'Int', 'Float', 'Boolean', 'Date', 'DateTime']);

/** rumble's paging arguments. */
const PAGING = new Set(['limit', 'offset']);

/** The keys that combine filters of the same entity. */
const COMBINATORS = new Set(['AND', 'OR', 'NOT']);

interface Guard {
	schema: GraphQLSchema;
	fragments: Map<string, FragmentDefinitionNode>;
	variableValues: VariableValues;
	problems: string[];
}

/** The object type a rumble `where` / `orderBy` input belongs to (`UserWhereInputArgument` → `User`). */
function entityOf({
	schema,
	inputType,
	suffix
}: {
	schema: GraphQLSchema;
	inputType: unknown;
	suffix: string;
}) {
	if (!isInputObjectType(inputType) || !inputType.name.endsWith(suffix)) return undefined;
	const entity = schema.getType(inputType.name.slice(0, -suffix.length));
	return isObjectType(entity) ? { entity, inputType } : undefined;
}

function isVisible({ entity, field }: { entity: GraphQLObjectType; field: string }) {
	return classifyField({ typeName: entity.name, fieldName: field }) === 'visible';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Checks a `where` value against its entity, descending into relations and AND / OR / NOT. */
function checkWhere({
	guard,
	entity,
	inputType,
	value,
	path
}: {
	guard: Guard;
	entity: GraphQLObjectType;
	inputType: GraphQLInputObjectType;
	value: unknown;
	path: string;
}) {
	const filters = Array.isArray(value) ? value : [value];
	for (const filter of filters.filter(isRecord)) {
		for (const [key, condition] of Object.entries(filter)) {
			if (condition === undefined) continue;
			if (COMBINATORS.has(key)) {
				checkWhere({ guard, entity, inputType, value: condition, path });
				continue;
			}
			checkFilterKey({ guard, entity, inputType, key, condition, path });
		}
	}
}

/** One key of a `where`: a relation is checked against its own entity, a column must be visible. */
function checkFilterKey({
	guard,
	entity,
	inputType,
	key,
	condition,
	path
}: {
	guard: Guard;
	entity: GraphQLObjectType;
	inputType: GraphQLInputObjectType;
	key: string;
	condition: unknown;
	path: string;
}) {
	const keyType = inputType.getFields()[key]?.type;
	const related = keyType
		? entityOf({ schema: guard.schema, inputType: getNamedType(keyType), suffix: WHERE_SUFFIX })
		: undefined;
	if (related) {
		checkWhere({ guard, ...related, value: condition, path: `${path}.${key}` });
	} else if (!isVisible({ entity, field: key })) {
		guard.problems.push(
			`${path}: filtering by ${entity.name}.${key} is not allowed, it is personal data`
		);
	}
}

function checkOrder({
	guard,
	entity,
	value,
	path
}: {
	guard: Guard;
	entity: GraphQLObjectType;
	value: unknown;
	path: string;
}) {
	for (const key of Object.keys(isRecord(value) ? value : {})) {
		if (!isVisible({ entity, field: key })) {
			guard.problems.push(
				`${path}: sorting by ${entity.name}.${key} is not allowed, it is personal data`
			);
		}
	}
}

/**
 * rumble's search compares the term with the text and id columns the table's object names, or
 * every one. This stays on the safe side: any hidden text or id field refuses the search.
 */
function checkSearch({
	guard,
	entity,
	path
}: {
	guard: Guard;
	entity: GraphQLObjectType;
	path: string;
}) {
	const hidden = Object.values(entity.getFields()).some(
		(entityField) =>
			['String', 'ID'].includes(getNamedType(entityField.type).name) &&
			!isVisible({ entity, field: entityField.name })
	);
	if (hidden) {
		guard.problems.push(
			`${path}: searching ${entity.name} is not allowed, it would compare the term with personal data`
		);
	}
}

/** Whether an argument is harmless whatever it holds, or one of the allowed free-form ones. */
function isHarmlessArgument({
	parentType,
	field,
	arg
}: {
	parentType: GraphQLObjectType;
	field: GraphQLField<unknown, unknown>;
	arg: GraphQLArgument;
}) {
	const argType = getNamedType(arg.type);
	return (
		PAGING.has(arg.name) ||
		isEnumType(argType) ||
		PLAIN_SCALARS.has(argType.name) ||
		ALLOWED_FREE_ARGUMENTS.has(`${parentType.name}.${field.name}.${arg.name}`)
	);
}

/** Checks one argument a field was given. */
function checkArgument({
	guard,
	parentType,
	field,
	arg,
	value,
	path
}: {
	guard: Guard;
	parentType: GraphQLObjectType;
	field: GraphQLField<unknown, unknown>;
	arg: GraphQLArgument;
	value: unknown;
	path: string;
}) {
	const argType = getNamedType(arg.type);
	const where = entityOf({ schema: guard.schema, inputType: argType, suffix: WHERE_SUFFIX });
	if (where) return checkWhere({ guard, ...where, value, path });
	const order = entityOf({ schema: guard.schema, inputType: argType, suffix: ORDER_SUFFIX });
	if (order) return checkOrder({ guard, entity: order.entity, value, path });

	const entity = getNamedType(field.type);
	const isRumbleList = field.args.some((candidate) => candidate.name === 'where');
	if (arg.name === 'search' && isRumbleList && isObjectType(entity)) {
		return checkSearch({ guard, entity, path });
	}
	if (!isHarmlessArgument({ parentType, field, arg })) {
		guard.problems.push(
			`${path}: this argument is not available to assistants, it could look up a person`
		);
	}
}

/** The arguments a field node was given, coerced; undefined (and a problem) when they are invalid. */
function argumentsOf({
	guard,
	field,
	node,
	path
}: {
	guard: Guard;
	field: GraphQLField<unknown, unknown>;
	node: FieldNode;
	path: string;
}) {
	try {
		return getArgumentValues(field, node, guard.variableValues);
	} catch (error) {
		guard.problems.push(`${path}: ${error instanceof Error ? error.message : 'invalid arguments'}`);
		return undefined;
	}
}

function checkSelection({
	guard,
	selectionSet,
	type,
	path
}: {
	guard: Guard;
	selectionSet: SelectionSetNode;
	type: GraphQLObjectType;
	path: string;
}) {
	for (const node of fieldNodes({ selectionSet, fragments: guard.fragments })) {
		const field = type.getFields()[node.name.value];
		if (!field) continue;
		const fieldPath = path ? `${path}.${field.name}` : field.name;
		const args = argumentsOf({ guard, field, node, path: fieldPath });
		for (const arg of field.args) {
			const value = args?.[arg.name];
			if (value === undefined || value === null) continue;
			checkArgument({
				guard,
				parentType: type,
				field,
				arg,
				value,
				path: `${fieldPath}(${arg.name})`
			});
		}
		const fieldType = getNamedType(field.type);
		if (node.selectionSet && isObjectType(fieldType)) {
			checkSelection({ guard, selectionSet: node.selectionSet, type: fieldType, path: fieldPath });
		}
	}
}

/**
 * The problems that keep an assistant's operation from running: arguments that filter, sort or
 * search by personal data, or look a person up. Empty when it may run. Expects a document that
 * passed validation, and the variables it is run with.
 */
export function argumentProblems({
	schema,
	document,
	operation,
	variables
}: {
	schema: GraphQLSchema;
	document: DocumentNode;
	operation: OperationDefinitionNode;
	variables: Record<string, unknown>;
}): string[] {
	const coerced = getVariableValues(schema, operation.variableDefinitions ?? [], variables);
	if (coerced.errors) return coerced.errors.map((error) => error.message);

	const rootType =
		operation.operation === 'mutation' ? schema.getMutationType() : schema.getQueryType();
	if (!rootType) return [`${operation.operation} is not supported`];

	const guard: Guard = {
		schema,
		fragments: fragmentsOf(document),
		variableValues: coerced.variableValues,
		problems: []
	};
	checkSelection({ guard, selectionSet: operation.selectionSet, type: rootType, path: '' });
	return guard.problems;
}

/**
 * The single operation of `document`, or why there is none: the generic query tool runs exactly
 * one, and only queries.
 */
export function singleQueryOperation(
	document: DocumentNode
): { operation: OperationDefinitionNode } | { problem: string } {
	const operations = document.definitions.filter(
		(definition) => definition.kind === Kind.OPERATION_DEFINITION
	);
	const [operation] = operations;
	if (operations.length !== 1 || !operation) {
		return { problem: 'The document has to contain exactly one operation.' };
	}
	if (operation.operation !== 'query') {
		return {
			problem: `Only queries run here, not ${operation.operation}s. Changes go through the dedicated tools.`
		};
	}
	return { operation };
}
