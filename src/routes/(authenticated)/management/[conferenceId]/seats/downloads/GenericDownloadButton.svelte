<script lang="ts">
	import { m } from '$lib/paraglide/messages';

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
	<button class="btn btn-sm" aria-label="Download data" onclick={downloadCommitteeData}>
		<i class="fa-duotone {loading ? 'fa-spinner fa-spin' : 'fa-download'}"></i>
	</button>
</div>
