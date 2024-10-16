<script lang="ts">
	import dmunLogo from '$assets/logo/dmun_logo.png';
	import { dynamicPublicConfig } from '$config/public';
	import * as m from '$lib/paraglide/messages.js';
</script>

<footer class="footer footer-center mt-10 rounded-xl bg-base-200 p-10 text-base-content">
	<nav class="flex flex-col flex-wrap justify-center gap-4 md:flex-row">
		<a class="link-hover link" href="/">{m.home()}</a>
		<a class="link-hover link" href="/registration">{m.registration()}</a>
		<a class="link-hover link" href="/dashboard">{m.dashboard()}</a>
		<a class="link-hover link" href="/my-account">{m.myAccount()}</a>
		<a class="link-hover link" href="https://dmun.de/impressum" target="_blank"
			>{@html m.imprintAndPrivacy()}</a
		>
		<a class="link-hover link" href="management">{m.admininstration()}</a>
	</nav>
	<nav>
		<div class="grid grid-flow-col gap-4" id="socials">
			<a href="https://www.instagram.com/dmun_ev/" aria-label="Instagram">
				<i class="fa-brands fa-instagram text-3xl"></i>
			</a>
			<a href="https://x.com/DMUN_eV" aria-label="X / Twitter">
				<i class="fa-brands fa-x-twitter text-3xl"></i>
			</a>
			<a href="https://www.facebook.com/deutschemodelunitednations/" aria-label="Facebook">
				<i class="fa-brands fa-facebook text-3xl"></i>
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
		<img src={dmunLogo} alt="DMUN Logo" class="w-40 dark:hue-rotate-180 dark:invert" />
		<p>
			Copyright © {new Date().getFullYear() !== 2024 ? '2024–' : ''}{new Date().getFullYear()} - {m.allRightsReservedby()}
			Deutsche Model United Nations e.V.
		</p>
		<div class="flex flex-col gap-4 sm:flex-row sm:gap-8">
			<div class="flex flex-col sm:flex-row sm:gap-2">
				<div>{m.version()}:</div>
				<div class="font-mono">
					{#if !dynamicPublicConfig.VERSION || dynamicPublicConfig.VERSION.length === 0}
						nightly
					{:else}
						{dynamicPublicConfig.VERSION}
					{/if}
				</div>
			</div>
			<div class="flex max-w-[15ch] flex-col sm:flex-row sm:gap-2 md:max-w-max">
				<div>{m.sha()}:</div>
				<div class="overflow-hidden overflow-ellipsis font-mono">
					{#if !dynamicPublicConfig.SHA || dynamicPublicConfig.SHA.length === 0}
						unknown
					{:else}
						{dynamicPublicConfig.SHA}
					{/if}
				</div>
			</div>
		</div>
	</aside>
</footer>

<style>
	#socials a {
		transition: transform 0.3s;
	}
	#socials a:hover {
		transform: scale(1.2);
	}
</style>
