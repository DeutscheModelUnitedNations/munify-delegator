import {
	getNamedType,
	isEnumType,
	isObjectType,
	type DocumentNode,
	type FieldNode,
	type FragmentDefinitionNode,
	type GraphQLNamedType,
	type GraphQLObjectType,
	type GraphQLSchema,
	type OperationDefinitionNode,
	type SelectionSetNode
} from 'graphql';
import { classifyField, REDACTED, MIN_GROUP_SIZE, SMALL_GROUP } from './classification';
import { fieldNodes, fragmentsOf } from './selections';

/** Any JSON value a GraphQL result holds. */
export type ResultValue =
	null | undefined | string | number | boolean | ResultValue[] | { [key: string]: ResultValue };

type ResultObject = { [key: string]: ResultValue };

/** Whether a result value is an object (a selection's answer) rather than a scalar or a list. */
function isRecord(value: ResultValue): value is ResultObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A redacted leaf: `null` stays `null` (so "nothing stored" stays visible), an empty list stays
 * empty, anything else becomes `[redacted]`.
 */
function redactLeaf(value: ResultValue): ResultValue {
	if (value === null || value === undefined) return value;
	if (Array.isArray(value) && value.length === 0) return value;
	return REDACTED;
}

/** A count by a redacted attribute: `<5` for a group small enough to point at people. */
function aggregateLeaf(value: ResultValue): ResultValue {
	if (Array.isArray(value)) return value.map(aggregateLeaf);
	if (typeof value === 'number' && value > 0 && value < MIN_GROUP_SIZE) return SMALL_GROUP;
	return value;
}

/** Values that cannot carry anything about a person: enums, Booleans, numbers and ids. */
function harmlessScalar(type: GraphQLNamedType) {
	return isEnumType(type) || ['Boolean', 'Int', 'Float', 'ID'].includes(type.name);
}

/**
 * A leaf as an assistant may read it. A mutation's plain answer is not classified: it is shown
 * when it cannot carry anything about a person, and redacted otherwise.
 */
function leafAsShown({
	type,
	fieldName,
	fieldType,
	value
}: {
	type: GraphQLObjectType;
	fieldName: string;
	fieldType: GraphQLNamedType;
	value: ResultValue;
}) {
	if (type.name === 'Mutation') return harmlessScalar(fieldType) ? value : redactLeaf(value);
	const fieldClass = classifyField({ typeName: type.name, fieldName });
	if (fieldClass === 'visible') return value;
	return fieldClass === 'aggregate' ? aggregateLeaf(value) : redactLeaf(value);
}

/** Applies `fn` to every object of a (possibly nested) list, or to the object itself. */
function eachObject(value: ResultValue, fn: (object: ResultObject) => void) {
	if (Array.isArray(value)) {
		for (const item of value) eachObject(item, fn);
	} else if (isRecord(value)) {
		fn(value);
	}
}

interface Walk {
	fragments: Map<string, FragmentDefinitionNode>;
}

function redactField({
	walk,
	node,
	type,
	object
}: {
	walk: Walk;
	node: FieldNode;
	type: GraphQLObjectType;
	object: ResultObject;
}) {
	const fieldName = node.name.value;
	const key = node.alias?.value ?? fieldName;
	if (fieldName === '__typename' || !(key in object)) return;

	const field = type.getFields()[fieldName];
	// Validation would have refused an unknown field; never let its answer through.
	if (!field) {
		object[key] = redactLeaf(object[key]);
		return;
	}
	const fieldType = getNamedType(field.type);
	const nested = node.selectionSet;
	if (isObjectType(fieldType)) {
		if (nested) {
			eachObject(object[key], (child) =>
				redactSelection({ walk, selectionSet: nested, type: fieldType, object: child })
			);
		}
		return;
	}
	object[key] = leafAsShown({ type, fieldName, fieldType, value: object[key] });
}

function redactSelection({
	walk,
	selectionSet,
	type,
	object
}: {
	walk: Walk;
	selectionSet: SelectionSetNode;
	type: GraphQLObjectType;
	object: ResultObject;
}) {
	for (const node of fieldNodes({ selectionSet, fragments: walk.fragments })) {
		redactField({ walk, node, type, object });
	}
}

/**
 * Redacts a GraphQL result in place, field by field, following the operation's own selection: a
 * leaf the classification does not show (`classification.ts`) is replaced by `[redacted]`, a count
 * by a redacted attribute below the minimum group size by `<5`.
 */
export function redactResult({
	schema,
	document,
	operation,
	data
}: {
	schema: GraphQLSchema;
	document: DocumentNode;
	operation: OperationDefinitionNode;
	data: ResultObject;
}) {
	const rootType =
		operation.operation === 'mutation' ? schema.getMutationType() : schema.getQueryType();
	if (!rootType) return data;
	const walk: Walk = { fragments: fragmentsOf(document) };
	redactSelection({ walk, selectionSet: operation.selectionSet, type: rootType, object: data });
	return data;
}
