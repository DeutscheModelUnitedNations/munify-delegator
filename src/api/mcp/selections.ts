import {
	Kind,
	type DocumentNode,
	type FieldNode,
	type FragmentDefinitionNode,
	type SelectionSetNode
} from 'graphql';

/** The document's fragments by name. */
export function fragmentsOf(document: DocumentNode) {
	return new Map(
		document.definitions
			.filter(
				(definition): definition is FragmentDefinitionNode =>
					definition.kind === Kind.FRAGMENT_DEFINITION
			)
			.map((definition) => [definition.name.value, definition])
	);
}

/**
 * The fields a selection set selects, with fragments spread in place. The schema has no
 * interfaces or unions, so every fragment applies to the type the selection is on.
 */
export function* fieldNodes({
	selectionSet,
	fragments
}: {
	selectionSet: SelectionSetNode;
	fragments: Map<string, FragmentDefinitionNode>;
}): Generator<FieldNode> {
	for (const selection of selectionSet.selections) {
		if (selection.kind === Kind.FIELD) {
			yield selection;
		} else if (selection.kind === Kind.INLINE_FRAGMENT) {
			yield* fieldNodes({ selectionSet: selection.selectionSet, fragments });
		} else {
			const fragment = fragments.get(selection.name.value);
			if (fragment) yield* fieldNodes({ selectionSet: fragment.selectionSet, fragments });
		}
	}
}
