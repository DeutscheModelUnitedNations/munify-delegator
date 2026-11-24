<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { dev } from '$app/env';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import Tabs from '#lib/components/tabs/Tabs.svelte';
	import Tab from '#lib/components/tabs/Tab.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	/**
	 * The account is one place with a tab per part: the profile, the notifications of whoever is on a
	 * conference's team, and the scanners of whoever manages a conference's participants (nobody else has
	 * anything to set up there).
	 */
	const onNotifications = $derived(page.route.id === '/(authenticated)/my-account/notifications');
	const onScanners = $derived(page.route.id === '/(authenticated)/my-account/scanners');
	let onTeam = $state(false);
	let canUseScanners = $state(false);

	$effect(() => {
		void client.query
			.myNotificationSettings({ conferenceId: true })
			.then((conferences) => {
				onTeam = conferences.length > 0;
			})
			// an impersonated or expired session: the tab just stays away
			.catch(() => undefined);
		void client.query
			.myScanners({ allowed: true })
			.then(({ allowed }) => {
				canUseScanners = allowed;
			})
			.catch(() => undefined);
	});
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.myAccount()}</title>
</svelte:head>

<div class="flex w-full flex-col items-center">
	{#if onTeam || onNotifications || onScanners}
		<div class="w-full max-w-3xl pt-4 sm:pt-6">
			<Tabs>
				<Tab
					title={m.profileStatus()}
					icon="user"
					href={resolve('my-account')}
					active={!onNotifications && !onScanners}
				/>
				<Tab
					title={m.notifications()}
					icon="bell"
					href={resolve('my-account/notifications')}
					active={onNotifications}
				/>
				{#if canUseScanners || onScanners}
					<Tab
						title={m.scanners()}
						icon="printer"
						href={resolve('my-account/scanners')}
						active={onScanners}
					/>
				{/if}
			</Tabs>
		</div>
	{/if}
	{@render children()}
</div>
