<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { page } from '$app/state';
	import QrCode from '#lib/components/QrCode.svelte';
	import { downloadQrPng } from '#lib/helpers/qrStyle';
	import { supervisorConnectionLink } from '#lib/helpers/supervisorLink';
	import EntryCode from '../Common/EntryCode.svelte';

	interface Props {
		conferenceId: string;
		supervisorId: string;
	}

	let { conferenceId, supervisorId }: Props = $props();

	const [supervisor, conference] = $derived(
		await Promise.all([
			client.liveQuery.conferenceSupervisor({
				__args: { id: supervisorId },
				connectionCode: true
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, emblemFile: { url: true } })
		])
	);
	const emblemUrl = $derived(conference.emblemFile?.url ?? undefined);

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

	const downloadQr = () => {
		const promise = downloadQrPng({
			data: connectionLink,
			logoUrl: emblemUrl,
			filename: `qr-${supervisor.connectionCode}.png`
		});
		toast.promise(promise, genericPromiseToastMessages);
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
		<div class="w-40 shrink-0 rounded-box bg-base-300 p-1">
			<QrCode data={connectionLink} logoUrl={emblemUrl} label={m.supervisorLinkQrLabel()} />
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
			<button class="btn btn-ghost btn-sm self-start" type="button" onclick={downloadQr}>
				<i aria-hidden="true" class="ph-duotone ph-download-simple"></i>
				{m.downloadQrCode()}
			</button>
		</div>
	</div>

	<EntryCode
		entryCode={supervisor.connectionCode}
		referralLink={connectionLink}
		userHasRotationPermission={true}
		rotationFn={rotate}
	/>
</DashboardSection>
