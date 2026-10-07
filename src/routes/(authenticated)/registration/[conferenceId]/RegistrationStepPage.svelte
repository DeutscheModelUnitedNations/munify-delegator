<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';

	/**
	 * The frame of a single-step registration page: title and description above the step's own
	 * content, and a way back to the conference's registration overview below it.
	 */
	interface Props {
		conferenceId: string;
		title: string;
		description: string;
		children: Snippet;
	}

	let { conferenceId, title, description, children }: Props = $props();
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<main class="flex h-full w-full flex-1 flex-col items-center py-16 text-center">
		<h1 class="mb-3 text-3xl tracking-wider uppercase">{title}</h1>
		<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
			<div class="flex flex-col items-center">
				<p class="max-ch-sm mb-10">
					{description}
				</p>

				{@render children()}

				<a class="btn btn-warning mt-16" href={resolve(`/registration/${conferenceId}`)}
					>{m.back()}</a
				>
			</div>
		</div>
	</main>
</div>
