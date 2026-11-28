<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import type { CameraLogEntry } from './cameraIntake';

	interface Props {
		/** The latest first. */
		entries: CameraLogEntry[];
	}

	let { entries }: Props = $props();

	const OUTCOMES: Record<CameraLogEntry['outcome'], () => string> = {
		stored: m.paperCameraStored,
		replaced: m.paperCameraReplaced,
		known: m.paperCameraKnown,
		differs: m.paperCameraNotStored,
		failed: m.paperCameraNotStored
	};

	const problems = $derived(entries.filter(({ problem }) => problem));
	const fine = $derived(entries.filter(({ problem }) => !problem));
</script>

{#snippet line(entry: CameraLogEntry)}
	<li>
		<button
			type="button"
			class="hover:bg-base-200 flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left"
			onclick={() => openUserCard(entry.userId)}
		>
			<i
				aria-hidden="true"
				class="ph-duotone mt-0.5 {entry.problem
					? 'ph-warning text-warning'
					: 'ph-check-circle text-success'}"
			></i>
			<span class="flex min-w-0 flex-col">
				<span class="truncate font-medium">{entry.name}</span>
				<span class="text-base-content/70 text-xs">
					{OUTCOMES[entry.outcome]()}{entry.problem ? ` · ${entry.problem}` : ''}
				</span>
			</span>
		</button>
	</li>
{/snippet}

{#if entries.length > 0}
	<section class="flex flex-col gap-2" aria-label={m.paperCameraLogTitle()}>
		<h3 class="font-semibold">{m.paperCameraLogTitle()}</h3>
		{#if problems.length > 0}
			<ul class="border-warning/40 bg-warning/5 rounded-box flex flex-col border p-1">
				{#each problems as entry (entry.id)}
					{@render line(entry)}
				{/each}
			</ul>
		{/if}
		<ul class="flex flex-col">
			{#each fine as entry (entry.id)}
				{@render line(entry)}
			{/each}
		</ul>
	</section>
{/if}
