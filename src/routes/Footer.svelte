<script lang="ts">
	import dmunLogo from '#assets/logo/dmun-lang.svg';
	import dmunLogoDark from '#assets/logo/dmun-lang-darkmode.svg';
	import { PUBLIC_SHA, PUBLIC_VERSION } from '$app/env/public';
	import ContrastToggle from '#lib/components/ContrastToggle.svelte';
	import LanguageSwitcher from '#lib/components/LanguageSwitcher.svelte';
	import { m } from '#lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { helpForRoute } from '#lib/docs/help';

	// Everyone gets the manual, signed in or not: the page of the route on screen, or its start
	const manualHref = $derived(helpForRoute(page.route.id).manualHref);
</script>

<div class="w-full p-4 print:hidden" style:view-transition-name="app-footer">
	<footer
		class="footer footer-center footer-horizontal bg-base-100 text-base-content rounded-box mt-3 flex flex-col p-10"
	>
		<nav class="flex flex-col flex-wrap justify-center gap-4 md:flex-row">
			<a class="link-hover link" href={resolve('/')}>{m.home()}</a>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- helpForRoute resolves the manual's path, then adds the locale prefix and the section -->
			<a class="link-hover link" href={manualHref}>{m.helpManual()}</a>
			<a class="link-hover link" href="https://dmun.de/legal" target="_blank">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
				{@html m.imprintAndPrivacy()}
			</a>
		</nav>
		<div class="flex flex-wrap items-center justify-center gap-4">
			<LanguageSwitcher />
			<ContrastToggle />
		</div>
		<nav aria-label="Social Media">
			<div class="grid grid-flow-col gap-4" id="socials">
				<a href="https://www.instagram.com/dmun_ev/" aria-label="Instagram">
					<i aria-hidden="true" class="ph ph-instagram-logo text-3xl"></i>
				</a>
				<a href="https://www.youtube.com/user/DeutscheMUNeV" aria-label="YouTube">
					<i aria-hidden="true" class="ph ph-youtube-logo text-3xl"></i>
				</a>
				<a href="https://github.com/deutschemodelunitednations" aria-label="GitHub">
					<i aria-hidden="true" class="ph ph-github-logo text-3xl"></i>
				</a>
			</div>
		</nav>
		<div>
			<p>{m.aServiceBy()}</p>
			<a href="https://dmun.de" target="_blank" class="transition-all duration-300 hover:scale-105">
				<img
					src={dmunLogo}
					alt="DMUN – Deutsche Model United Nations e.V."
					class="w-60 dark:hidden"
				/>
				<img
					src={dmunLogoDark}
					alt="DMUN – Deutsche Model United Nations e.V."
					class="hidden w-60 dark:block"
				/>
			</a>
			<p>
				Copyright © {new Date().getFullYear() !== 2024 ? '2024-' : ''}{new Date().getFullYear()} - {m.allRightsReservedBy()}
				Deutsche Model United Nations e.V.
			</p>
			<div class="flex flex-col gap-4 sm:flex-row sm:gap-8">
				<div class="flex flex-col sm:flex-row sm:gap-2">
					<div>{m.version()}:</div>
					<div class="font-mono">
						{#if !PUBLIC_VERSION || PUBLIC_VERSION.length === 0}
							nightly
						{:else}
							{PUBLIC_VERSION}
						{/if}
					</div>
				</div>
				<div class="flex max-w-[15ch] flex-col sm:flex-row sm:gap-2 md:max-w-max">
					<div>{m.sha()}:</div>
					<div class="overflow-hidden font-mono overflow-ellipsis">
						{#if !PUBLIC_SHA || PUBLIC_SHA.length === 0}
							unknown
						{:else}
							{PUBLIC_SHA}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	#socials a {
		transition: transform 0.3s;
	}
	#socials a:hover {
		transform: scale(1.2);
	}
</style>
