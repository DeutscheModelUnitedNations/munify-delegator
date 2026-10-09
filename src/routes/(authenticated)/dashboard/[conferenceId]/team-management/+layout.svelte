<script lang="ts">
	import type { LayoutProps } from './$types';
	import ManagementShell from '../management/ManagementShell.svelte';
	import Tabs from '$lib/components/tabs/Tabs.svelte';
	import Tab from '$lib/components/tabs/Tab.svelte';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	let { children, params }: LayoutProps = $props();

	const conferenceId = $derived(params.conferenceId);
	const base = $derived(`/dashboard/${conferenceId}/team-management` as const);
	const onInvitations = $derived(page.url.pathname.startsWith(`${base}/invitations`));
</script>

<ManagementShell {conferenceId}>
	<div class="px-6 pt-6">
		<Tabs>
			<Tab title={m.teamMembers()} icon="users" active={!onInvitations} href={`${base}/members`} />
			<Tab
				title={m.pendingInvitations()}
				icon="envelope"
				active={onInvitations}
				href={`${base}/invitations`}
			/>
		</Tabs>
	</div>

	{@render children()}
</ManagementShell>
