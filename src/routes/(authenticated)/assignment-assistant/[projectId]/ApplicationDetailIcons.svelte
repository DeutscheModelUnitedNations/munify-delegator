<script lang="ts">
	import formatNames from '$lib/helpers/formatNames';
	import type { Snippet } from 'svelte';
	import LoadingData from './components/LoadingData.svelte';

	/**
	 * The tooltip icons both application cards show: note, id and school, then whatever the card
	 * adds (`children`), then the supervisors.
	 */
	interface Props {
		id: string;
		note?: string | null;
		school?: string | null;
		supervisors: { user: { givenName?: string | null; familyName?: string | null } }[];
		/** Whether the fetched details (school, supervisors) are still loading. */
		loading: boolean;
		/** Whether fetching the details failed. */
		failed: boolean;
		children?: Snippet;
	}

	let { id, note, school, supervisors, loading, failed, children }: Props = $props();
</script>

{#if note}
	<div class="tooltip" data-tip={note}>
		<i class="fas fa-sticky-note"></i>
	</div>
{/if}
<div class="tooltip" data-tip={id}>
	<i class="fas fa-barcode-scan"></i>
</div>
<LoadingData fetching={loading} error={failed}>
	<div class="tooltip" data-tip={school}>
		<i class="fas fa-school"></i>
	</div>
</LoadingData>
{@render children?.()}
{#if supervisors.length > 0}
	<LoadingData fetching={loading} error={failed}>
		<div
			class="tooltip"
			data-tip={supervisors
				.map((x) => formatNames(x.user.givenName ?? undefined, x.user.familyName ?? undefined))
				.join(', ')}
		>
			<i class="fas fa-chalkboard-user"></i>
		</div>
	</LoadingData>
{/if}
