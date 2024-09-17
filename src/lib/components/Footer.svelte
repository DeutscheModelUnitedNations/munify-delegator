<script lang="ts">
	import dmunLogo from '$assets/logo/dmun_logo.png';
	import { dynamicPublicConfig } from '$config/public';
	import { env } from '$env/dynamic/public';
</script>

<footer class="footer footer-center bg-base-200 text-base-content rounded-xl p-10 mt-10">
	<nav class="flex flex-wrap flex-col justify-center md:flex-row gap-4">
		<a class="link link-hover" href="/">Startseite</a>
		<a class="link link-hover" href="/registration">Anmeldung</a>
		<a class="link link-hover" href="/dashboard">Deine Konferenzen</a>
		<a class="link link-hover" href="/my-account">Profilverwaltung</a>
		<a class="link link-hover" href="https://dmun.de/impressum" target="_blank"
			>Impressum & Datenschutzerklärung</a
		>
		<a class="link link-hover" href="management">Administration</a>
	</nav>
	<nav>
		<div class="grid grid-flow-col gap-4" id="socials">
			<a>
				<i class="fa-brands fa-instagram text-3xl"></i>
			</a>
			<a>
				<i class="fa-brands fa-twitter text-3xl"></i>
			</a>
			<a>
				<i class="fa-brands fa-facebook text-3xl"></i>
			</a>
			<a href="https://github.com/deutschemodelunitednations">
				<i class="fa-brands fa-github text-3xl"></i>
			</a>
		</div>
	</nav>
	<aside>
		<p>A Service by</p>
		<img src={dmunLogo} alt="DMUN Logo" class="w-40 dark:invert dark:hue-rotate-180" />
		<p>
			Copyright © {new Date().getFullYear()} - All rights reserved by Deutsche Model United Nations
			e.V.
		</p>
		<p>
			Version:
			{#if !dynamicPublicConfig.VERSION || dynamicPublicConfig.VERSION.length === 0}
				nightly
			{:else}
				{dynamicPublicConfig.VERSION}
			{/if}
			SHA:
			{#if !dynamicPublicConfig.SHA || dynamicPublicConfig.SHA.length === 0}
				unknown
			{:else}
				{dynamicPublicConfig.SHA}
			{/if}
		</p>
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
