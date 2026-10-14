<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** Whether the registration has been completed, and what is still missing if not. */
	interface Props {
		applied: boolean;
		/** What still has to happen, shown while the registration is incomplete. */
		pendingText: string;
	}

	let { applied, pendingText }: Props = $props();
</script>

{#if !applied}
	<section role="alert" class="alert alert-warning w-full">
		<i class="fas fa-exclamation-triangle text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.completeSignupWarningHeading()}</p>
			<p class="mt-2">
				{pendingText}
			</p>
		</div>
	</section>
{:else}
	<section role="alert" class="alert alert-success w-full">
		<i class="fas fa-circle-check text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.completeSignupSuccess()}</p>
			<p class="mt-2">
				{m.completeSignupSuccessDescription()}
			</p>
		</div>
	</section>
{/if}
