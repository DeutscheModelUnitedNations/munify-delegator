<script lang="ts">
	import { getTableSettings } from '../toolbar/tableSettings.svelte';

	interface Props {
		/** Full FontAwesome class list, e.g. `fa-sharp-duotone fa-solid fa-cloud` */
		icon: string;
		tooltip?: string;
	}

	let { icon, tooltip }: Props = $props();
	const { getTableSize } = getTableSettings();
</script>

<div class="text-center" class:tooltip={!!tooltip} data-tip={tooltip}>
	<i class="{icon} text-{getTableSize()}"></i>
</div>
