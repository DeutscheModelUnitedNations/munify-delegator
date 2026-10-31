<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import EmailLogTable from '#lib/components/EmailLogTable.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const entries = $derived(
		await client.liveQuery.emailLogs({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { createdAt: 'desc' },
				limit: 200
			},
			id: true,
			kind: true,
			status: true,
			email: true,
			error: true,
			createdAt: true,
			sentAt: true,
			trigger: true,
			user: { givenName: true, familyName: true },
			sentBy: { givenName: true, familyName: true }
		})
	);
</script>

<section class="flex flex-col gap-2">
	<h3 class="text-lg font-bold">{m.emailSettingsLog()}</h3>
	<p class="text-base-content/70 text-sm">{m.emailSettingsLogDescription()}</p>
	<EmailLogTable {entries} empty={m.emailSettingsLogEmpty()} />
</section>
