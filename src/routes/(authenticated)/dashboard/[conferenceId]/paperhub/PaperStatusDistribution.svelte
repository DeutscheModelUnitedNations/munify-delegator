<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		counts: {
			submitted: number;
			revised: number;
			changesRequested: number;
			accepted: number;
			total: number;
		};
		/** Blur the numbers, as focus mode does. */
		blur?: boolean;
	}

	let { counts, blur = false }: Props = $props();
</script>

{#if counts.total > 0}
	<div class="border-t border-base-300 pt-4">
		<h4 class="text-sm font-semibold mb-2">{m.paperStatusOverview()}</h4>
		<div class="flex h-12 w-full rounded-box overflow-hidden">
			{#if counts.submitted > 0}
				<div
					class="tooltip tooltip-right tooltip-warning bg-warning flex items-center justify-center gap-2 text-warning-content transition-all"
					style="width: {(counts.submitted / counts.total) * 100}%"
					data-tip="{m.paperStatusSubmitted()}: {counts.submitted}"
				>
					<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
					<span class="text-sm font-medium" class:blur-sm={blur} class:select-none={blur}
						>{counts.submitted}</span
					>
				</div>
			{/if}
			{#if counts.revised > 0}
				<div
					class="tooltip tooltip-right tooltip-info bg-info flex items-center justify-center gap-2 text-info-content transition-all"
					style="width: {(counts.revised / counts.total) * 100}%"
					data-tip="{m.paperStatusRevised()}: {counts.revised}"
				>
					<i class="fa-sharp-duotone fa-solid fa-rotate"></i>
					<span class="text-sm font-medium" class:blur-sm={blur} class:select-none={blur}
						>{counts.revised}</span
					>
				</div>
			{/if}
			{#if counts.changesRequested > 0}
				<div
					class="tooltip tooltip-left tooltip-error bg-error flex items-center justify-center gap-2 text-accent-content transition-all"
					style="width: {(counts.changesRequested / counts.total) * 100}%"
					data-tip="{m.paperStatusChangesRequested()}: {counts.changesRequested}"
				>
					<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
					<span class="text-sm font-medium" class:blur-sm={blur} class:select-none={blur}
						>{counts.changesRequested}</span
					>
				</div>
			{/if}
			{#if counts.accepted > 0}
				<div
					class="tooltip tooltip-left tooltip-success bg-success flex items-center justify-center gap-2 text-success-content transition-all"
					style="width: {(counts.accepted / counts.total) * 100}%"
					data-tip="{m.paperStatusAccepted()}: {counts.accepted}"
				>
					<i class="fa-sharp-duotone fa-solid fa-check"></i>
					<span class="text-sm font-medium" class:blur-sm={blur} class:select-none={blur}
						>{counts.accepted}</span
					>
				</div>
			{/if}
		</div>
		<!-- Legend -->
		<div class="flex gap-4 text-sm text-base-content/70 mt-2">
			<span class="flex items-center gap-1">
				<span class="inline-block w-3 h-3 bg-warning rounded-field"></span>
				{m.paperStatusSubmitted()}
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block w-3 h-3 bg-info rounded-field"></span>
				{m.paperStatusRevised()}
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block w-3 h-3 bg-error rounded-field"></span>
				{m.paperStatusChangesRequested()}
			</span>
			<span class="flex items-center gap-1">
				<span class="inline-block w-3 h-3 bg-success rounded-field"></span>
				{m.paperStatusAccepted()}
			</span>
		</div>
	</div>
{/if}
