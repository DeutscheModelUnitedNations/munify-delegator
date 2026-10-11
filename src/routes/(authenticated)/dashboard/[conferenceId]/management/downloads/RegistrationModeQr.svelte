<script lang="ts">
	import { buildNametagQrPdf } from '$lib/api/nametagQrPdf';
	import { downloadPdf } from '$lib/api/nametagSheetsPdf';
	import { m } from '$lib/paraglide/messages';
	import { loadSheetAssets } from '../checkIn/nametagSheets';
	import DownloadButton from './DownloadButton.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	/** A sheet whose QR code opens the participant's registration mode screen. */
	async function download() {
		const assets = await loadSheetAssets(conferenceId);
		downloadPdf(
			await buildNametagQrPdf({
				url: `${location.origin}/dashboard/${conferenceId}/registration-mode`,
				prompt: m.registrationModeQrPrompt(),
				...assets
			}),
			'registration-mode-qr.pdf'
		);
	}
</script>

<DownloadButton
	onclick={download}
	title={m.registrationModeQrDownload()}
	icon="fa-sharp-duotone fa-solid fa-qrcode"
/>
