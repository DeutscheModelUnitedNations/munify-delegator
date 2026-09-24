import type { Component, ComponentProps, Snippet } from 'svelte';

// TYPE-SAFETY-EXCEPTION: TanStack Table cell/header rendering requires dynamic
// component instantiation. We store the component and its props separately,
// then FlexRender reassembles them. The generic constraint on renderComponent()
// ensures type-safe props at the call site, but the storage class uses a wider
// type since FlexRender doesn't know the specific component type at render time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = Component<any>;

export class RenderComponentConfig<TProps extends Record<string, unknown>> {
	component: AnyComponent;
	props: TProps;

	constructor(component: AnyComponent, props: TProps) {
		this.component = component;
		this.props = props;
	}
}

export class RenderSnippetConfig<TProps> {
	snippet: Snippet<[TProps]>;
	params: TProps;

	constructor(snippet: Snippet<[TProps]>, params: TProps) {
		this.snippet = snippet;
		this.params = params;
	}
}

/**
 * Wraps a Svelte component for rendering inside a TanStack Table cell or header.
 * The component will be instantiated with the given props by FlexRender.
 *
 * Type safety is enforced at the call site: the `props` parameter must match
 * the component's expected props.
 */
export function renderComponent<TComponent extends AnyComponent>(
	component: TComponent,
	props: ComponentProps<TComponent>
): RenderComponentConfig<ComponentProps<TComponent>> {
	return new RenderComponentConfig(component, props);
}

/**
 * Wraps a Svelte snippet for rendering inside a TanStack Table cell or header.
 */
export function renderSnippet<TProps>(
	snippet: Snippet<[TProps]>,
	params: TProps
): RenderSnippetConfig<TProps> {
	return new RenderSnippetConfig(snippet, params);
}
