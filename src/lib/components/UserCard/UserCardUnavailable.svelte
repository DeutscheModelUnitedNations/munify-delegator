<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import UserCardLoadError from './UserCardLoadError.svelte';

	interface Props {
		/** The request failed; otherwise it succeeded but there is no user with this ID */
		failed: boolean;
		userId: string;
		onretry: () => void;
	}

	let { failed, userId, onretry }: Props = $props();
</script>

<div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
	{#if failed}
		<i class="fa-duotone fa-cloud-exclamation text-error text-5xl"></i>
		<h2 class="text-xl font-bold">{m.httpGenericError()}</h2>
		<div class="max-w-md">
			<UserCardLoadError {onretry} />
		</div>
	{:else}
		<i class="fa-duotone fa-user-xmark text-5xl opacity-60"></i>
		<h2 class="text-xl font-bold">{m.userNotFound()}</h2>
		<p class="max-w-md opacity-70">
			{m.userCardNotFound({ id: userId })}
		</p>
	{/if}
</div>
