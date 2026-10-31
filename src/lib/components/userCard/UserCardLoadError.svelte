<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		/** Loads again, usually the failed boundary's `reset`. */
		onretry: () => void;
	}

	let { onretry }: Props = $props();
</script>

<div role="alert" class="alert alert-error">
	<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
	<span>{m.httpGenericError()}</span>
	<button class="btn btn-sm" onclick={onretry}>
		<i class="fa-sharp-duotone fa-solid fa-rotate-right"></i>
		{m.retry()}
	</button>
</div>
