<script lang="ts">
	import { onMount } from 'svelte';
	let messages: Array<any> = [];

	async function load() {
		const res = await fetch('./list');
		if (res.ok) messages = await res.json();
	}
	onMount(load);
</script>

<h2>Sent Messages</h2>
<table>
	<thead><tr><th>Recipient</th><th>Subject</th><th>Sent</th><th>Status</th></tr></thead>
	<tbody>
		{#each messages as m}
			<tr>
				<td>{m.recipientLabel}</td>
				<td>{m.subject}</td>
				<td>{m.sentAt}</td>
				<td>{m.status}</td>
			</tr>
		{/each}
	</tbody>
</table>
