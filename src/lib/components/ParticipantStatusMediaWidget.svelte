<script lang="ts">
	import hotkeys from 'hotkeys-js';
	import StatusWidget from './StatusWidget.svelte';
	import { type MediaConsentStatus$options } from '$houdini';

	interface Props {
		title: string;
		status: MediaConsentStatus$options;
		changeStatus: (status: MediaConsentStatus$options) => Promise<void>;
		doneHotkey?: string;
	}

	let { title, status, changeStatus, doneHotkey }: Props = $props();

	const btnClick = async (status: MediaConsentStatus$options) => {
		await changeStatus(status);
	};

	$effect(() => {
		if (doneHotkey) {
			hotkeys(doneHotkey ?? '', (event, handler) => {
				event.preventDefault();
				btnClick('ALLOWED_ALL');
			});
		}
	});
</script>

<StatusWidget
	{title}
	faIcon="camera-slash"
	activeStatus={status ?? 'NOT_SET'}
	status={[
		{
			value: 'NOT_SET',
			faIcon: 'fa-clipboard-question',
			color: 'btn-warning'
		},
		{
			value: 'NOT_ALLOWED',
			faIcon: 'fa-camera-slash',
			color: 'btn-error'
		},
		{
			value: 'PARTIALLY_ALLOWED',
			faIcon: 'fa-magnifying-glass',
			color: 'btn-warning'
		},
		{
			value: 'ALLOWED_ALL',
			faIcon: 'fa-camera',
			color: 'btn-success',
			hotkey: doneHotkey
		}
	]}
	changeStatus={btnClick}
/>
