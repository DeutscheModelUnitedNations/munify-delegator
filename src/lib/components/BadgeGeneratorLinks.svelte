<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { PUBLIC_BADGE_GENERATOR_URL } from '$app/env/public';
	import { toast } from 'svelte-sonner';
	import { downloadCSV } from '#lib/utils/downloadHelpers.js';
	import { badgeHeader, badgeRow, type Badge } from '#lib/helpers/badgeCsv.js';

	interface Props {
		/** The rows of the file, read when it is asked for */
		badges: () => Badge[] | Promise<Badge[]>;
		/** Without the extension */
		filename: string;
		label: string;
		/** `tile` fits the download grids, `inline` a toolbar or a dropdown */
		variant?: 'tile' | 'inline';
		/** Shows how the file is used on the generator's site */
		showHint?: boolean;
	}

	let { badges, filename, label, variant = 'inline', showHint = false }: Props = $props();

	let busy = $state(false);

	async function download() {
		busy = true;
		try {
			const rows = (await badges()).map(badgeRow);
			// The generator decodes UTF-8 and expects commas, whatever the CSV settings say.
			downloadCSV(badgeHeader, rows, `${filename}.csv`, ',', 'utf-8');
		} catch (error) {
			console.error('Badge CSV failed', error);
			toast.error(m.genericToastError());
		} finally {
			busy = false;
		}
	}
</script>

{#if variant === 'tile'}
	<div class="join min-w-0">
		<button
			class="join-item group bg-base-200/60 hover:bg-primary/10 border-base-300 hover:border-primary/40 focus-visible:outline-primary flex min-w-0 flex-1 cursor-pointer items-center gap-3 border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
			disabled={busy}
			onclick={download}
		>
			<span
				class="bg-primary/10 text-primary group-hover:bg-primary/20 rounded-field flex size-8 shrink-0 items-center justify-center transition-colors"
			>
				{#if busy}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<i class="fa-sharp-duotone fa-solid fa-file-csv text-base"></i>
				{/if}
			</span>
			<span class="min-w-0 flex-1 truncate">{label}</span>
			<i
				class="fa-sharp-duotone fa-solid fa-arrow-down-to-line text-base-content/30 group-hover:text-primary shrink-0 text-xs transition-colors"
			></i>
		</button>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- an external site -->
		<a
			href={PUBLIC_BADGE_GENERATOR_URL}
			class="join-item btn btn-ghost bg-base-200/60 border-base-300 hover:bg-primary/10 h-auto border px-3"
			target="_blank"
			rel="noopener noreferrer"
			title={m.badgeGeneratorOpen()}
			aria-label={m.badgeGeneratorOpen()}
		>
			<i class="fa-sharp-duotone fa-solid fa-arrow-up-right-from-square"></i>
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
{:else}
	<!-- Stacked, full width: side by side, the two labels overflow a dropdown in German -->
	<div class="flex flex-col gap-2">
		<button class="btn btn-sm btn-outline w-full" disabled={busy} onclick={download}>
			{#if busy}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<i class="fa-sharp-duotone fa-solid fa-file-csv"></i>
			{/if}
			{label}
		</button>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- an external site -->
		<a
			href={PUBLIC_BADGE_GENERATOR_URL}
			class="btn btn-sm btn-ghost w-full"
			target="_blank"
			rel="noopener noreferrer"
		>
			{m.badgeGeneratorOpen()}
			<i class="fa-sharp-duotone fa-solid fa-arrow-up-right-from-square"></i>
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{#if showHint}
			<p class="text-base-content/60 text-xs">{m.badgeGeneratorHint()}</p>
		{/if}
	</div>
{/if}
