import {
	getNamedType,
	isInputObjectType,
	isInputType,
	isListType,
	isNonNullType,
	typeFromAST,
	visit,
	visitWithTypeInfo,
	TypeInfo,
	type DocumentNode,
	type GraphQLInputType,
	type GraphQLSchema
} from 'graphql';

/**
 * Filters and orderings on the fields that carry a participant's assignment.
 *
 * Masking hides these columns from what a participant reads, but a `where` argument is applied in
 * SQL before any masking: `delegations(where: { assignedNationAlpha3Code: { eq: "FRA" } })` finds a
 * row exactly when the delegation holds FRA, whether or not the column may be read. So until the
 * assignment is released, anybody who is not on a team must not be able to name these fields in a
 * filter at all - the same goes for sorting by them, and for the relations pointing back.
 *
 * Keyed by the input type rumble generates for a table (`<Table>WhereInputArgument`,
 * `<Table>OrderInputArgument`).
 */
const GATED_BY_TABLE: Record<string, readonly string[]> = {
	Delegation: [
		'assignedNationAlpha3Code',
		'assignedNonStateActorId',
		'assignedNation',
		'assignedNonStateActor'
	],
	Delegationmember: ['assignedCommitteeId', 'assignedCommittee'],
	Singleparticipant: ['assignedRoleId', 'assignedRole', 'assignmentDetails'],
	Nation: ['assignedDelegations'],
	Nonstateactor: ['assignedDelegations'],
	Committee: ['delegationMembers'],
	Customconferencerole: ['singleParticipantAssignments']
};

/** `Delegation.assignedNation` style names of every gated filter field, by input type name. */
const GATED_INPUT_FIELDS = new Map(
	Object.entries(GATED_BY_TABLE).flatMap(([table, fields]) =>
		['WhereInputArgument', 'OrderInputArgument'].map(
			(kind) => [`${table}${kind}`, new Set(fields)] as const
		)
	)
);

/** Whether `field` of the input type `typeName` is a gated filter or ordering. */
export function isGatedFilter(typeName: string, field: string) {
	return GATED_INPUT_FIELDS.get(typeName)?.has(field) ?? false;
}

function inLiterals(schema: GraphQLSchema, document: DocumentNode) {
	const found = new Set<string>();
	const typeInfo = new TypeInfo(schema);
	visit(
		document,
		visitWithTypeInfo(typeInfo, {
			ObjectField(node) {
				const parent = typeInfo.getParentInputType();
				const name = parent && getNamedType(parent).name;
				if (name && isGatedFilter(name, node.name.value)) found.add(`${name}.${node.name.value}`);
			}
		})
	);
	return found;
}

function inValue(type: GraphQLInputType, value: unknown, found: Set<string>) {
	if (value == null) return;
	if (isNonNullType(type)) return inValue(type.ofType, value, found);
	if (isListType(type)) {
		for (const item of Array.isArray(value) ? value : [value]) inValue(type.ofType, item, found);
		return;
	}
	if (!isInputObjectType(type) || typeof value !== 'object') return;
	const fields = type.getFields();
	for (const [key, nested] of Object.entries(value)) {
		if (isGatedFilter(type.name, key)) found.add(`${type.name}.${key}`);
		const field = fields[key];
		if (field) inValue(field.type, nested, found);
	}
}

/** The variables of the operation, walked by their declared input types. */
function inVariables(
	schema: GraphQLSchema,
	document: DocumentNode,
	variables: Record<string, unknown> | null | undefined
) {
	const found = new Set<string>();
	for (const definition of document.definitions) {
		if (definition.kind !== 'OperationDefinition') continue;
		for (const variable of definition.variableDefinitions ?? []) {
			const type = typeFromAST(schema, variable.type);
			if (isInputType(type)) inValue(type, variables?.[variable.variable.name.value], found);
		}
	}
	return found;
}

/**
 * Every gated filter or ordering a request names, written `Type.field`: in literals of the
 * document, and in the variables its operations declare.
 */
export function findGatedFilters(
	schema: GraphQLSchema,
	document: DocumentNode,
	variables?: Record<string, unknown> | null
) {
	return [
		...new Set([...inLiterals(schema, document), ...inVariables(schema, document, variables)])
	];
}
