<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { FieldCheck } from './layoutCheck';

	/**
	 * The fields read off a scan, each with what a scan of the empty form would make of it where it
	 * is placed (`checkFields`), the page it is on, and a way to pick it.
	 */
	interface Props {
		fields: { id: string; label: string; page: number; check: FieldCheck }[];
		/** The pages a field can go on, from 0; one: no choice. */
		pages: number[];
		selected: string | undefined;
		onselect: (id: string) => void;
		onmove: (id: string, page: number) => void;
	}

	let { fields, pages, selected, onselect, onmove }: Props = $props();

	const problems = $derived(
		fields.filter(({ check }) => check === 'filled' || check === 'unclear').length
	);
	const loading = $derived(fields.length > 0 && fields.every(({ check }) => check === 'unknown'));

	const look: Record<FieldCheck, { icon: string; tone: string; text: () => string }> = {
		free: {
			icon: 'ph-check-circle',
			tone: 'text-success',
			text: () => m.documentLayoutCheckFree()
		},
		unclear: {
			icon: 'ph-warning',
			tone: 'text-warning',
			text: () => m.documentLayoutCheckUnclear()
		},
		filled: {
			icon: 'ph-x-circle',
			tone: 'text-error',
			text: () => m.documentLayoutCheckFilled()
		},
		unknown: {
			icon: 'ph-question',
			tone: 'text-base-content/50',
			text: () => m.documentLayoutCheckUnknown()
		}
	};
</script>

<section class="flex flex-col gap-2" aria-labelledby="layout-field-checks">
	<h3 id="layout-field-checks" class="text-sm font-semibold">{m.documentLayoutChecksTitle()}</h3>
	<div
		role="status"
		class="alert alert-soft py-2 text-sm {loading
			? 'alert-info'
			: problems > 0
				? 'alert-warning'
				: 'alert-success'}"
	>
		{#if loading}
			<span class="loading loading-spinner loading-xs"></span>
			<span>{m.documentLayoutChecksLoading()}</span>
		{:else if problems > 0}
			<i aria-hidden="true" class="ph-duotone ph-warning"></i>
			<span>{m.documentLayoutChecksProblems({ count: problems })}</span>
		{:else}
			<i aria-hidden="true" class="ph-duotone ph-check-circle"></i>
			<span>{m.documentLayoutChecksAllFree()}</span>
		{/if}
	</div>
	<ul class="flex flex-col">
		{#each fields as field (field.id)}
			{@const shown = look[field.check]}
			<li
				class="rounded-field flex items-center gap-2 px-1 py-1 {selected === field.id
					? 'bg-base-200'
					: ''}"
			>
				<i aria-hidden="true" class="ph-duotone {shown.icon} {shown.tone} shrink-0 text-lg"></i>
				<button
					type="button"
					class="flex min-w-0 grow flex-col items-start text-left"
					aria-pressed={selected === field.id}
					onclick={() => onselect(field.id)}
				>
					<span class="truncate text-sm">{field.label}</span>
					<span class="text-base-content/60 text-xs">{shown.text()}</span>
				</button>
				{#if pages.length > 1}
					<select
						class="select select-xs w-auto shrink-0"
						aria-label={m.documentLayoutFieldPage({ field: field.label })}
						value={field.page}
						onchange={(event) => onmove(field.id, Number(event.currentTarget.value))}
					>
						{#each pages as choice (choice)}
							<option value={choice}
								>{m.documentLayoutPageNumberOption({ page: choice + 1 })}</option
							>
						{/each}
					</select>
				{/if}
			</li>
		{/each}
	</ul>
</section>
