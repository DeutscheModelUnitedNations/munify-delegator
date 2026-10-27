<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import Kbd from '#lib/components/Kbd.svelte';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		conferenceId: string;
		merging: boolean;
		/** Folds the other schools into `targetId`; resolves to whether it worked. */
		onMerge: (targetId: string, sourceIds: string[]) => Promise<boolean>;
		onSelect: (schools: { id: string; name: string }[]) => void;
	}

	let { conferenceId, merging, onMerge, onSelect }: Props = $props();

	const rows = $derived(
		await client.liveQuery.schoolSuggestions({
			__args: { where: { conferenceId: { eq: conferenceId }, dismissed: { eq: false } } },
			id: true,
			similarity: true,
			variants: { sumParticipants: true, school: { id: true, name: true } }
		})
	);

	// One plain copy per result (see `liveSnapshot`): reading rows and variants one by one would
	// subscribe once per read.
	const suggestions = $derived(
		rows
			.slice()
			.map((row) => ({
				id: row.id,
				similarity: row.similarity,
				variants: row.variants
					.slice()
					.map((variant) => ({
						id: variant.school.id,
						name: variant.school.name,
						sumParticipants: variant.sumParticipants
					}))
					.sort((a, b) => b.sumParticipants - a.sumParticipants)
			}))
			.sort((a, b) => b.similarity - a.similarity || b.variants.length - a.variants.length)
	);

	let analyzing = $state(false);

	async function analyze() {
		analyzing = true;
		try {
			await client.mutate.analyzeSchoolSuggestions({ __args: { conferenceId } });
		} catch (error) {
			toast.error(String(error));
		} finally {
			analyzing = false;
		}
	}

	// The tables hold what the last analysis found, so look again when the page opens.
	$effect(() => {
		if (conferenceId) void analyze();
	});

	let chosen = $state<Record<string, string>>({});
	let index = $state(0);

	function dismiss(id: string) {
		const promise = Promise.resolve(client.mutate.dismissSchoolSuggestion({ __args: { id } }));
		toast.promise(promise, genericPromiseToastMessages);
	}

	/**
	 * Schools merged away on this page. Their suggestions are hidden at once, before the live
	 * update and the next analysis catch up, and a group needs two schools to suggest anything.
	 */
	const mergedAway = new SvelteSet<string>();
	const open = $derived(
		suggestions.filter(
			(suggestion) =>
				suggestion.variants.length > 1 &&
				!suggestion.variants.some((variant) => mergedAway.has(variant.id))
		)
	);
	const position = $derived(Math.min(index, Math.max(open.length - 1, 0)));
	const current = $derived(open[position]);
	const key = $derived(current?.id ?? '');
	const picked = $derived(current?.variants.map(({ id, name }) => ({ id, name })) ?? []);
	/** The school the others go into, by id; the most named one unless another was picked. */
	const target = $derived(chosen[key] ?? current?.variants[0].id ?? '');
	const targetName = $derived(picked.find((school) => school.id === target)?.name ?? '');

	function cycle(step: number) {
		if (open.length < 2) return;
		index = (position + step + open.length) % open.length;
	}

	async function merge() {
		if (!current || merging) return;
		const sources = picked.map((school) => school.id).filter((id) => id !== target);
		if (!(await onMerge(target, sources))) return;
		sources.forEach((id) => mergedAway.add(id));
		// The target's counts changed, and it may now group differently
		await analyze();
	}

	onMount(() => {
		hotkeys('left', () => cycle(-1));
		hotkeys('right', () => cycle(1));
		hotkeys('alt+enter', (event) => {
			event.preventDefault();
			void merge();
		});
	});

	onDestroy(() => {
		hotkeys.unbind('left');
		hotkeys.unbind('right');
		hotkeys.unbind('alt+enter');
	});
</script>

{#if current}
	<div class="bg-base-200 border-base-300 rounded-box mb-6 border">
		<div class="border-base-300 flex items-center gap-2 border-b px-4 py-2">
			<div class="flex-1">
				<span class="font-bold">{m.cleanupSuggestionsTitle()}</span>
				<span class="text-sm opacity-60">{m.cleanupSuggestionsDescription()}</span>
			</div>
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				aria-label={m.cleanupSuggestionsPrevious()}
				disabled={open.length < 2}
				onclick={() => cycle(-1)}
			>
				<i class="fa-sharp-duotone fa-solid fa-chevron-left"></i>
			</button>
			<span class="min-w-12 text-center text-sm tabular-nums">{position + 1} / {open.length}</span>
			<button
				type="button"
				class="btn btn-ghost btn-sm btn-circle"
				aria-label={m.cleanupSuggestionsNext()}
				disabled={open.length < 2}
				onclick={() => cycle(1)}
			>
				<i class="fa-sharp-duotone fa-solid fa-chevron-right"></i>
			</button>
		</div>

		<div class="flex flex-col gap-1 px-4 py-3">
			{#each current.variants as variant (variant.id)}
				<label
					class="hover:bg-base-300 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5"
				>
					<input
						type="radio"
						class="radio radio-primary radio-sm"
						name="suggestionTarget"
						checked={variant.id === target}
						onchange={() => (chosen[key] = variant.id)}
					/>
					<span class="flex-1">{variant.name}</span>
					<span class="text-sm opacity-60">
						{m.cleanupSuggestionsParticipants({ count: variant.sumParticipants })}
					</span>
				</label>
			{/each}
		</div>

		<div class="border-base-300 flex flex-wrap justify-end gap-2 border-t px-4 py-2">
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => dismiss(key)}>
				<i class="fa-sharp-duotone fa-solid fa-eye-slash"></i>
				{m.cleanupSuggestionsDismiss()}
			</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => onSelect(picked)}>
				<i class="fa-sharp-duotone fa-solid fa-pen-to-square"></i>
				{m.cleanupSuggestionsSelect()}
			</button>
			<button
				type="button"
				class="btn btn-primary btn-sm"
				disabled={merging}
				onclick={() => void merge()}
			>
				{#if merging}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<i class="fa-sharp-duotone fa-solid fa-code-merge"></i>
				{/if}
				{m.cleanupSuggestionsMerge({ name: targetName })}
				<Kbd hotkey="alt+enter" size="xs" />
			</button>
		</div>
	</div>
{/if}
