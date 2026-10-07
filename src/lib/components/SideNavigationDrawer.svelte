<script lang="ts">
	import { setHeaderStatus } from '$lib/state/authenticatedHeaderStatus.svelte';
	import { isMobileOrTablet } from '$lib/utils/detectMobile';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		expanded?: boolean;
		children: Snippet;
	}

	let { expanded = $bindable(!isMobileOrTablet()), children }: Props = $props();

	onMount(() => {
		if (isMobileOrTablet()) {
			expanded = false;
		}
	});

	$effect(() => {
		if (!expanded) {
			setHeaderStatus({
				openNavCallback: () => {
					expanded = !expanded;
				}
			});
		}
	});
</script>

{#if expanded}
	<button
		aria-label="Close navigation drawer"
		aria-hidden="true"
		class="fixed top-0 left-0 z-10 h-full w-full bg-black opacity-40 sm:hidden"
		onclick={() => (expanded = false)}
	></button>
{/if}

<div class="fixed top-0 left-0 z-20 h-full py-4 pl-3 sm:static sm:h-auto sm:py-0 sm:pl-0">
	<div
		class="bg-base-100 border-base-300 rounded-box relative flex flex-col overflow-hidden border duration-300 {expanded
			? 'h-full w-60 shadow sm:shadow-none'
			: 'h-0 w-0 items-center sm:h-full sm:w-16'}"
	>
		<div class="flex p-2 {expanded ? 'justify-end' : 'justify-center'}">
			<button
				class="btn btn-ghost btn-circle btn-sm"
				onclick={() => {
					expanded = !expanded;
				}}
				aria-label="Toggle menu expand state"
			>
				<i class="fa-duotone fa-arrow-right text-center {expanded ? 'rotate-180' : ''} duration-300"
				></i>
			</button>
		</div>
		<div class="flex-1 overflow-y-auto {expanded ? 'px-3 pb-4' : 'hidden px-1 pb-2 sm:block'}">
			{@render children()}
		</div>
	</div>
</div>
