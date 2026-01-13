<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	let recipients: Array<{ id: string; label: string }> = [];
	let selectedRecipient = '';
	let subject = '';
	let body = '';
	let error = '';

	async function loadRecipients() {
		const res = await fetch('./search');
		if (res.ok) recipients = await res.json();
	}

	onMount(() => {
		loadRecipients();
	});

	async function send(e: Event) {
		e.preventDefault();
		error = '';
		const res = await fetch('./send', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ recipientId: selectedRecipient, subject, body })
		});
		if (res.ok) {
			const data = await res.json();
			// redirect to history
			location.href = '../history';
		} else {
			error = 'Failed to send message';
		}
	}
</script>

<h2>Compose Message</h2>
{#if error}<div class="error">{error}</div>{/if}
<form on:submit|preventDefault={send}>
	<label
		>Recipient
		<select bind:value={selectedRecipient} required>
			<option value="">-- choose recipient --</option>
			{#each recipients as r}
				<option value={r.id}>{r.label}</option>
			{/each}
		</select>
	</label>
	<label
		>Subject
		<input type="text" bind:value={subject} maxlength="200" required />
	</label>
	<label
		>Message
		<textarea bind:value={body} maxlength="2000" required></textarea>
	</label>
	<button type="submit">Send</button>
</form>
