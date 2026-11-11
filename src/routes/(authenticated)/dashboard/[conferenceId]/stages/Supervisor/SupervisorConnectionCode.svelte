<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { page } from '$app/state';
	import { qr } from '@svelte-put/qr/svg';
	import { supervisorConnectionLink } from '#lib/helpers/supervisorLink';
	import EntryCode from '../Common/EntryCode.svelte';

	interface Props {
		conferenceId: string;
		supervisorId: string;
	}

	let { conferenceId, supervisorId }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			connectionCode: true
		})
	);

	const connectionLink = $derived(
		supervisorConnectionLink({
			origin: page.url.origin,
			conferenceId,
			connectionCode: supervisor.connectionCode
		})
	);

	const copyLink = async () => {
		await navigator.clipboard.writeText(connectionLink);
		toast.success(m.linkCopied());
	};

	const rotate = async () => {
		const promise = client.mutate.rotateSupervisorConnectionCode({
			__args: { id: supervisorId },
			id: true,
			connectionCode: true
		});
		toast.promise(promise, { ...genericPromiseToastMessages, success: m.codeRotated() });
		await promise;
	};
</script>

<DashboardSection
	icon="users-three"
	title={m.connectWithStudents()}
	description={m.connectWithStudentsDescription()}
>
	<div
		class="bg-base-200 border-base-300 flex flex-col items-center gap-4 rounded-box border p-4 sm:flex-row sm:items-start"
	>
		<!-- White behind the code in either theme, or phone cameras struggle to read it -->
		<div class="shrink-0 rounded-box bg-white p-2">
			<svg
				use:qr={{ data: connectionLink, shape: 'circle' }}
				class="size-40"
				role="img"
				aria-label={m.supervisorLinkQrLabel()}
			/>
		</div>
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<h3 class="font-bold">{m.supervisorLinkTitle()}</h3>
			<p class="text-sm text-base-content/70">{m.supervisorLinkDescription()}</p>
			<div class="join w-full">
				<input
					type="text"
					class="input join-item w-full font-mono text-xs"
					readonly
					value={connectionLink}
					aria-label={m.supervisorLinkTitle()}
					onfocus={(e) => e.currentTarget.select()}
				/>
				<button class="btn btn-primary join-item" type="button" onclick={copyLink}>
					<i aria-hidden="true" class="ph-duotone ph-clipboard"></i>
					{m.copyLink()}
				</button>
			</div>
		</div>
	</div>

	<EntryCode
		entryCode={supervisor.connectionCode}
		referralLink={connectionLink}
		userHasRotationPermission={true}
		rotationFn={rotate}
	/>
</DashboardSection>
