<script lang="ts">
	import { downloadNsaCards } from '#lib/api/nsaCards';
	import { m } from '#lib/paraglide/messages';
	import DownloadButton from './DownloadButton.svelte';

	let { conferenceId }: { conferenceId: string } = $props();
</script>

<DownloadButton
	onclick={() => downloadNsaCards(conferenceId)}
	title={m.nsaCardsDownload()}
	icon="fa-sharp-duotone fa-solid fa-address-card"
/>
