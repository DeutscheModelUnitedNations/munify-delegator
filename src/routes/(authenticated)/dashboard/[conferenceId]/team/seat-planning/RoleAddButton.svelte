<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		disabled: boolean;
		onclick: () => void;
	}

	let { disabled, onclick }: Props = $props();
</script>

<button class="btn btn-primary btn-sm btn-square" aria-label={m.add()} {disabled} {onclick}>
	<i class="fa-sharp-duotone fa-solid fa-plus"></i>
</button>
