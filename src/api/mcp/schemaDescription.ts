import {
	getNamedType,
	isInputObjectType,
	isObjectType,
	isEnumType,
	type GraphQLField,
	type GraphQLSchema
} from 'graphql';
import { classifyField } from './classification';

/**
 * What `graphql_schema` tells an assistant: the API in a compact SDL-like form, every leaf marked
 * with how it reaches the assistant, so it does not ask for what reads `[redacted]` anyway.
 */

function signature(field: GraphQLField<unknown, unknown>) {
	const args = field.args.map((arg) => `${arg.name}: ${String(arg.type)}`).join(', ');
	return `${field.name}${args ? `(${args})` : ''}: ${String(field.type)}`;
}

/** The root queries, or one type with its fields marked. */
export function describeSchema({
	schema,
	typeName
}: {
	schema: GraphQLSchema;
	typeName: string | undefined;
}) {
	if (!typeName) {
		const queries = Object.values(schema.getQueryType()?.getFields() ?? {});
		return {
			hint: 'Lists take where, orderBy, limit and offset. Ask for a type by name to see its fields. Fields marked [redacted] answer "[redacted]" whatever you do, and filtering, sorting or searching by them is refused.',
			queries: queries.map(signature)
		};
	}

	const type = schema.getType(typeName);
	if (isObjectType(type)) {
		return {
			type: type.name,
			fields: Object.values(type.getFields()).map((field) => {
				const named = getNamedType(field.type);
				if (isObjectType(named)) return signature(field);
				const fieldClass = classifyField({ typeName: type.name, fieldName: field.name });
				const mark =
					fieldClass === 'redacted'
						? '  # [redacted]'
						: fieldClass === 'aggregate'
							? '  # counts of 1-4 read <5'
							: '';
				return `${signature(field)}${mark}`;
			})
		};
	}
	if (isInputObjectType(type)) {
		return {
			input: type.name,
			fields: Object.values(type.getFields()).map((field) => `${field.name}: ${String(field.type)}`)
		};
	}
	if (isEnumType(type)) {
		return { enum: type.name, values: type.getValues().map((value) => value.name) };
	}
	return { error: `There is no type called ${typeName}.` };
}
