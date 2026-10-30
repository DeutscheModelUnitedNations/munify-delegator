<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();
</script>

<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
	<i class="fa-sharp-duotone fa-solid fa-user-xmark text-5xl opacity-60"></i>
	<h2 class="text-xl font-bold">{m.userNotFound()}</h2>
	<p class="max-w-md opacity-70">{m.userCardNotFound({ id: userId })}</p>
</div>
