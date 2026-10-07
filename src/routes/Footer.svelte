<script lang="ts">
	import dmunLogo from '$assets/logo/dmun-lang.svg';
	import dmunLogoDark from '$assets/logo/dmun-lang-darkmode.svg';
	import { configPublic } from '$config/public';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
</script>

<div class="w-full p-4 print:hidden">
	<footer
		class="footer footer-center footer-horizontal bg-base-100 text-base-content rounded-box mt-3 flex flex-col p-10"
	>
		<nav class="flex flex-col flex-wrap justify-center gap-4 md:flex-row">
			<a class="link-hover link" href={resolve('/')}>{m.home()}</a>
			<a class="link-hover link" href="https://dmun.de/legal" target="_blank">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
				{@html m.imprintAndPrivacy()}
			</a>
		</nav>
		<div class="flex flex-wrap justify-center gap-4">
			<LanguageSwitcher />
			<ThemeSwitcher />
		</div>
		<nav>
			<div class="grid grid-flow-col gap-4" id="socials">
				<a href="https://www.instagram.com/dmun_ev/" aria-label="Instagram">
					<i class="fa-brands fa-instagram text-3xl"></i>
				</a>
				<a href="https://www.youtube.com/user/DeutscheMUNeV" aria-label="YouTube">
					<i class="fa-brands fa-youtube text-3xl"></i>
				</a>
				<a href="https://github.com/deutschemodelunitednations" aria-label="GitHub">
					<i class="fa-brands fa-github text-3xl"></i>
				</a>
			</div>
		</nav>
		<aside>
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
				Copyright © {new Date().getFullYear() !== 2024 ? '2024-' : ''}{new Date().getFullYear()} - {m.allRightsReservedby()}
				Deutsche Model United Nations e.V.
			</p>
			<div class="flex flex-col gap-4 sm:flex-row sm:gap-8">
				<div class="flex flex-col sm:flex-row sm:gap-2">
					<div>{m.version()}:</div>
					<div class="font-mono">
						{#if !configPublic.PUBLIC_VERSION || configPublic.PUBLIC_VERSION.length === 0}
							nightly
						{:else}
							{configPublic.PUBLIC_VERSION}
						{/if}
					</div>
				</div>
				<div class="flex max-w-[15ch] flex-col sm:flex-row sm:gap-2 md:max-w-max">
					<div>{m.sha()}:</div>
					<div class="overflow-hidden font-mono overflow-ellipsis">
						{#if !configPublic.PUBLIC_SHA || configPublic.PUBLIC_SHA.length === 0}
							unknown
						{:else}
							{configPublic.PUBLIC_SHA}
						{/if}
					</div>
				</div>
			</div>
		</aside>
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
