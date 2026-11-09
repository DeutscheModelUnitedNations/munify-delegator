<script lang="ts">
	import StatusWidget from './StatusWidget.svelte';
	import type { MediaconsentstatusEnum } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		title: string;
		status: MediaconsentstatusEnum;
		changeStatus: (status: MediaconsentstatusEnum) => Promise<void>;
		/** @deprecated Use `hotkeys` instead */
		doneHotkey?: string;
		/** Per-status hotkey mapping */
		hotkeys?: Partial<Record<MediaconsentstatusEnum, string>>;
	}

	let { title, status, changeStatus, doneHotkey, hotkeys: hotkeyMap }: Props = $props();

	const btnClick = async (status: MediaconsentstatusEnum) => {
		await changeStatus(status);
	};
</script>

<StatusWidget
	{title}
	icon="camera-slash"
	activeStatus={status ?? 'NOT_SET'}
	status={[
		{
			value: 'NOT_SET',
			title: m.mediaConsentStatusNotSet(),
			icon: 'ph-clipboard',
			color: 'btn-warning'
		},
		{
			value: 'NOT_ALLOWED',
			title: m.mediaConsentStatusNotAllowed(),
			icon: 'ph-camera-slash',
			color: 'btn-error',
			hotkey: hotkeyMap?.NOT_ALLOWED
		},
		{
			value: 'PARTIALLY_ALLOWED',
			title: m.mediaConsentStatusPartiallyAllowed(),
			icon: 'ph-magnifying-glass',
			color: 'btn-warning',
			hotkey: hotkeyMap?.PARTIALLY_ALLOWED
		},
		{
			value: 'ALLOWED_ALL',
			title: m.mediaConsentStatusAllowedAll(),
			icon: 'ph-camera',
			color: 'btn-success',
			hotkey: hotkeyMap?.ALLOWED_ALL ?? doneHotkey
		}
	]}
	changeStatus={btnClick}
/>
