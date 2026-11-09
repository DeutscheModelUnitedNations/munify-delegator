<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		/** Loads again, usually the failed boundary's `reset`. */
		onretry: () => void;
	}

	let { onretry }: Props = $props();
</script>

<div role="alert" class="alert alert-error">
	<i class="ph-duotone ph-warning"></i>
	<span>{m.httpGenericError()}</span>
	<button class="btn btn-sm" onclick={onretry}>
		<i class="ph-duotone ph-arrow-clockwise"></i>
		{m.retry()}
	</button>
</div>
