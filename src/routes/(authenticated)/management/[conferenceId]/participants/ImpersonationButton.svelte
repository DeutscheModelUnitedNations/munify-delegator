<script lang="ts">
	import { goto } from '$app/navigation';
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import toast from 'svelte-french-toast';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	const StartImpersonationMutation = graphql(`
		mutation StartImpersonation($targetUserId: String!) {
			startImpersonation(targetUserId: $targetUserId)
		}
	`);

	const startImpersonation = async () => {
		try {
			toast
				.promise(
					StartImpersonationMutation.mutate({ targetUserId: userId }),
					genericPromiseToastMessages
				)
				.then(() => {
					goto('/dashboard').then(() => window.location.reload());
				})
				.catch((error) => {
					console.error('Failed to stop impersonation:', error);
				});
		} catch (error) {
			console.error('Failed to start impersonation:', error);
			toast.error(m.impersonationFailed({ error: 'Could not start Impersonation' }));
			alert('Fehler beim Starten der Impersonation.');
		}
	};
</script>

<button class="btn" onclick={startImpersonation}>
	<i class="fa-duotone fa-user-secret"></i>
	<span class="ml-2">{m.impersonation()}</span>
</button>
