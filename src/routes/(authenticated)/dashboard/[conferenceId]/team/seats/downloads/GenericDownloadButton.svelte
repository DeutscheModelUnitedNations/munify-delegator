<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		tip: string;
		getData: () => Promise<void>;
	}

	let { tip, getData }: Props = $props();

	let loading = $state(false);

	const downloadCommitteeData = async () => {
		loading = true;
		await getData();
		loading = false;
	};
</script>

<div class="tooltip tooltip-right" data-tip={m.downloadParticipantData({ group: tip })}>
	<button class="btn btn-sm" aria-label={m.a11yDownloadData()} onclick={downloadCommitteeData}>
		<i class="fa-sharp-duotone fa-solid {loading ? 'fa-spinner fa-spin' : 'fa-download'}"></i>
	</button>
</div>
