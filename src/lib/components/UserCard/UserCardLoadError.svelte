<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		onretry: () => void;
	}

	let { onretry }: Props = $props();
</script>

<div role="alert" class="alert alert-error alert-soft">
	<i class="fa-duotone fa-cloud-exclamation"></i>
	<span>{m.userCardLoadError()}</span>
	<button class="btn btn-sm" onclick={onretry}>
		<i class="fa-duotone fa-rotate-right"></i>
		{m.retry()}
	</button>
</div>
