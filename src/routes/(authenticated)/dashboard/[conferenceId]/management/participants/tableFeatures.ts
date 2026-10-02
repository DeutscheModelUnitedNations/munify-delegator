import {
	autoFilterFns,
	autoSortFns,
	columnFacetingFeature,
	columnFilteringFeature,
	columnVisibilityFeature,
	createFacetedMinMaxValues,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	metaHelper,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures
} from '$lib/components/tanStackTable';
import type { ColumnMeta } from './types';

/** Everything the participants table uses, and the row models that implement it. */
export const participantTableFeatures = tableFeatures({
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	columnVisibilityFeature,
	columnFacetingFeature,
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	facetedMinMaxValues: createFacetedMinMaxValues(),
	filterFns: autoFilterFns,
	sortFns: autoSortFns,
	columnMeta: metaHelper<ColumnMeta>()
});

export type ParticipantTableFeatures = typeof participantTableFeatures;
