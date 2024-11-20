<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import { isMobileOrTablet } from '$lib/services/detectMobile';
	import NavMenu from './NavMenu/NavMenu.svelte';
	import NavMenuButton from './NavMenu/NavMenuButton.svelte';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		expanded?: boolean;
		subtitle?: string;
		navigateBackHref?: string;
		enableDefaultNavigationButtons?: boolean;
		children: Snippet;
	}

	let {
		expanded = $bindable(!isMobileOrTablet()),
		subtitle,
		navigateBackHref,
		enableDefaultNavigationButtons = true,
		children
	}: Props = $props();

	onMount(() => {
		if(isMobileOrTablet()) {
			expanded = false
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
		class="fixed left-0 top-0 z-10 h-full w-full bg-black opacity-40 sm:hidden"
		onclick={() => (expanded = false)}
	></button>
{/if}

<div class="fixed left-0 top-0 z-20 h-full py-4 pl-3 sm:static sm:h-auto sm:py-0 sm:pl-0">
	<div
		class="relative flex flex-col overflow-hidden rounded-xl bg-base-200 duration-300 {expanded
			? 'h-full w-60 shadow sm:shadow-none'
			: 'h-0 w-0 items-center sm:h-full sm:w-16'}"
	>
		<button
			class="btn right-2 top-2 z-10 flex items-center p-3 {expanded ? 'absolute' : ''}"
			onclick={() => {
				expanded = !expanded;
			}}
			aria-label="Toggle menu expand state"
		>
			<i class="fa-duotone fa-arrow-right text-center {expanded ? 'rotate-180' : ''} duration-300"
			></i>
		</button>
		<div class="flex-col {expanded ? 'px-6 pt-4' : 'hidden items-center p-1 sm:flex'}">
			<div class="flex flex-col justify-center">
				<i class="fa-duotone fa-id-card-clip mb-4 text-3xl"></i>
				<div
					class="text-md overflow-hidden font-normal duration-200 {expanded
						? 'h-6 w-full'
						: 'h-0 w-0'}"
				>
					MUNify
				</div>
				<div
					class="overflow-hidden text-2xl font-bold duration-200 {expanded
						? 'h-9 w-full'
						: 'h-0 w-0'}"
				>
					DELEGATOR
				</div>
				{#if subtitle}
					<div class="text-md font-normal">{subtitle}</div>
				{/if}
			</div>
			<div class={expanded ? 'mt-8 ' : 'hidden sm:flex'}>
				{@render children()}
			</div>
		</div>

		{#if enableDefaultNavigationButtons}
			<NavMenu>
				<div class={expanded ? 'px-3' : 'hidden sm:block'}>
					{#if navigateBackHref}
						<NavMenuButton
							href={navigateBackHref}
							icon="fa-arrow-left"
							title={m.back()}
							bind:expanded
						/>
					{/if}
					<NavMenuButton href="/" icon="fa-home" title={m.home()} bind:expanded />
				</div>
			</NavMenu>
		{/if}
	</div>
</div>
