// svelte-virtual-list ships an untyped Svelte 3 component (`export let` props, a `<slot>`).
declare module 'svelte-virtual-list' {
	import type { SvelteComponent } from 'svelte';

	export default class VirtualList<T> extends SvelteComponent<
		{
			items: T[];
			/** CSS height of the scroll viewport; the list needs a bounded height to virtualize. */
			height?: string;
			/** Fixed row height in px; skips measuring rows when set. */
			itemHeight?: number;
			start?: number;
			end?: number;
		},
		Record<string, never>,
		{ default: { item: T } }
	> {}
}
