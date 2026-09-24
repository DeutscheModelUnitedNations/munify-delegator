import {
	createTable,
	type RowData,
	type TableOptions,
	type TableOptionsResolved,
	type TableState
} from '@tanstack/table-core';

/**
 * Merges multiple objects using lazy property descriptors.
 * Later sources take priority. Getter semantics are preserved to maintain
 * Svelte 5 reactivity (values are read at access time, not at merge time).
 */
function mergeObjects<T>(...sources: (Partial<T> | (() => Partial<T>) | undefined)[]): T {
	const target = {} as Record<string, unknown>;
	for (let i = 0; i < sources.length; i++) {
		let source = sources[i];
		if (typeof source === 'function') source = source();
		if (source) {
			const descriptors = Object.getOwnPropertyDescriptors(source);
			for (const key in descriptors) {
				if (key in target) continue;
				Object.defineProperty(target, key, {
					enumerable: true,
					get() {
						for (let j = sources.length - 1; j >= 0; j--) {
							let s = sources[j];
							if (typeof s === 'function') s = s();
							const v = (s as Record<string, unknown> | undefined)?.[key];
							if (v !== undefined) return v;
						}
					}
				});
			}
		}
	}
	return target as T;
}

/**
 * Creates a TanStack Table instance that is reactive with Svelte 5 runes.
 *
 * IMPORTANT: Use getter syntax for reactive options:
 * ```ts
 * createSvelteTable({
 *   get data() { return myData; },
 *   columns,
 *   state: {
 *     get sorting() { return sorting; },
 *     get pagination() { return pagination; },
 *   },
 *   ...
 * })
 * ```
 */
export function createSvelteTable<TData extends RowData>(options: TableOptions<TData>) {
	const resolvedOptions = mergeObjects<TableOptionsResolved<TData>>(
		{
			state: {} as TableState,
			onStateChange() {},
			renderFallbackValue: null,
			mergeOptions(defaultOptions: TableOptions<TData>, newOptions: Partial<TableOptions<TData>>) {
				return mergeObjects(defaultOptions, newOptions);
			}
		} as Partial<TableOptionsResolved<TData>>,
		options as Partial<TableOptionsResolved<TData>>
	);

	const table = createTable(resolvedOptions);
	let state = $state<Partial<TableState>>(table.initialState);

	function updateOptions() {
		table.setOptions((prev) => {
			return mergeObjects(prev, options, {
				state: mergeObjects(state, options.state ?? {}),
				onStateChange: (updater: ((old: TableState) => TableState) | TableState) => {
					if (updater instanceof Function) state = updater(state as TableState);
					else state = mergeObjects(state, updater);
					options.onStateChange?.(updater);
				}
			} as Partial<TableOptionsResolved<TData>>);
		});
	}

	updateOptions();

	$effect.pre(() => {
		updateOptions();
	});

	return table;
}
