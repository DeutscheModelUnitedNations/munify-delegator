<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { setAuthHeader } from '$lib/services/authenticatedHeaderStatus.svelte';
	import NavMenu from './NavMenu/NavMenu.svelte';
	import NavMenuButton from './NavMenu/NavMenuButton.svelte';

	interface Props {
		expanded?: boolean;
		subtitle?: string;
		navigateBackHref?: string;
	}

	let { expanded = $bindable(true), subtitle, navigateBackHref }: Props = $props();
</script>

<div class="pl-2 pr-4">
	<div
		class="flex flex-col justify-between overflow-hidden rounded-xl bg-base-200 duration-300 {expanded
			? 'h-full w-60'
			: 'h-0 w-0 items-center sm:h-full sm:w-16'}"
	>
		<div class="flex-col {expanded ? 'px-6 pt-4' : 'hidden items-center p-1 sm:flex'}">
			<div class="flex flex-col justify-center">
				<i class="fa-duotone fa-id-card-clip mb-4 text-3xl"></i>
				<div class="text-md overflow-hidden font-normal duration-200 {expanded ? 'w-full' : 'w-0'}">
					MUNify
				</div>
				<div class="overflow-hidden text-2xl font-bold duration-200 {expanded ? 'w-full' : 'w-0'}">
					DELEGATOR
				</div>
				{#if subtitle}
					<div class="text-md font-normal">{subtitle}</div>
				{/if}
			</div>
			<div class={expanded ? 'mt-8 ' : 'hidden sm:flex'}>
				<slot />
			</div>
		</div>

		<NavMenu small={!expanded}>
			<div class={expanded ? 'px-3' : 'hidden sm:block'}>
				{#if navigateBackHref}
					<NavMenuButton
						href={navigateBackHref}
						icon="fa-arrow-left"
						title={m.back()}
						small={!expanded}
					/>
				{/if}
				<NavMenuButton href="/" icon="fa-home" title={m.home()} small={!expanded} />
			</div>
			<li class="mt-3 flex {expanded ? 'w-5' : 'w-full'} items-center">
				<button
					class="flex items-center"
					onclick={() => {
						expanded = !expanded;
						setAuthHeader({
							openNavCallback: () => {
								expanded = !expanded;
							}
						});
					}}
					aria-label="Toggle menu expand state"
				>
					<i class="fa-duotone fa-bars w-5 text-center {expanded ? 'rotate-180' : ''} duration-300"
					></i>
				</button>
			</li>
		</NavMenu>
	</div>
</div>
