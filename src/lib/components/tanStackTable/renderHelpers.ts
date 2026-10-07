import type { Component, ComponentProps } from 'svelte';
import { renderComponent as tanStackRenderComponent } from '@tanstack/svelte-table';

// TYPE-SAFETY-EXCEPTION: a component of any props has to be accepted here so
// that its props can be inferred from it; `ComponentProps<TComponent>` below
// is what keeps the call site type-safe. Same constraint the adapter uses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = Component<any>;

/**
 * Wraps a Svelte component for rendering inside a TanStack Table cell or header.
 * The component will be instantiated with the given props by FlexRender.
 *
 * Unlike the adapter's own `renderComponent`, `props` is required, so a column
 * cannot forget a prop the component needs.
 */
export function renderComponent<TComponent extends AnyComponent>(
	component: TComponent,
	props: ComponentProps<TComponent>
) {
	return tanStackRenderComponent(component, props);
}
