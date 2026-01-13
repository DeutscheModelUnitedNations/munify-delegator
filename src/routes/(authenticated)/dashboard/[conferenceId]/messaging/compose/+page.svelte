<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	let recipients: Array<{ id: string; label: string }> = [];
	let selectedRecipient = '';
	let subject = '';
	let body = '';
	let error = '';
	let loadingRecipients = true;
	let loadError = '';
	$: conferenceId = $page.params.conferenceId;
	$: basePath = `/dashboard/${conferenceId}/messaging`;
	$: subjectCount = subject.length;
	$: bodyCount = body.length;

	async function loadRecipients() {
		loadError = '';
		loadingRecipients = true;
		const res = await fetch('../search');
		if (res.ok) {
			recipients = await res.json();
		} else {
			loadError = 'Unable to load recipients';
		}
		loadingRecipients = false;
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

<section class="mb-6 rounded-box bg-base-200/70 p-5 sm:p-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<p class="text-xs uppercase tracking-[0.2em] text-base-content/60">Messaging</p>
			<h2 class="text-2xl font-semibold">Compose message</h2>
			<p class="text-sm text-base-content/70">
				Deliver clear, actionable updates to conference participants.
			</p>
		</div>
		<nav class="tabs tabs-boxed bg-base-100/80 p-1">
			<a class="tab" href={basePath}>Overview</a>
			<a class="tab tab-active" href={`${basePath}/compose`} aria-current="page">Compose</a>
			<a class="tab" href={`${basePath}/history`}>History</a>
		</nav>
	</div>
</section>

<div class="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
	<section class="card bg-base-100 shadow-sm">
		<div class="card-body gap-5">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold">Message details</h3>
				<span class="badge badge-outline">Draft</span>
			</div>

			{#if error}
				<div class="alert alert-error">
					<i class="fa-solid fa-triangle-exclamation"></i>
					<span>{error}</span>
				</div>
			{/if}

			<form class="flex flex-col gap-4" on:submit|preventDefault={send}>
				<label class="form-control">
					<div class="label">
						<span class="label-text">Recipient</span>
					</div>
					<select class="select select-bordered" bind:value={selectedRecipient} required>
						<option value="">Choose a recipient</option>
						{#if loadingRecipients}
							<option disabled value="">Loading recipients...</option>
						{:else if loadError}
							<option disabled value="">{loadError}</option>
						{:else}
							{#each recipients as r}
								<option value={r.id}>{r.label}</option>
							{/each}
						{/if}
					</select>
					<div class="label">
						<span class="label-text-alt text-base-content/60">
							Only opted-in recipients appear here.
						</span>
					</div>
				</label>

				<label class="form-control">
					<div class="label">
						<span class="label-text">Subject</span>
						<span class="label-text-alt text-base-content/60">{subjectCount}/200</span>
					</div>
					<input
						class="input input-bordered"
						type="text"
						bind:value={subject}
						maxlength="200"
						placeholder="Agenda update for Thursday"
						required
					/>
				</label>

				<label class="form-control">
					<div class="label">
						<span class="label-text">Message</span>
						<span class="label-text-alt text-base-content/60">{bodyCount}/2000</span>
					</div>
					<textarea
						class="textarea textarea-bordered min-h-36"
						bind:value={body}
						maxlength="2000"
						placeholder="Share the key details, action items, and deadlines."
						required
					></textarea>
				</label>

				<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<p class="text-xs text-base-content/60">
						This message will be logged in the delivery history.
					</p>
					<button class="btn btn-primary" type="submit">
						<i class="fa-solid fa-paper-plane"></i>
						Send message
					</button>
				</div>
			</form>
		</div>
	</section>

	<aside class="card bg-base-100 shadow-sm">
		<div class="card-body gap-4">
			<h3 class="text-lg font-semibold">Message checklist</h3>
			<ul class="space-y-3 text-sm text-base-content/70">
				<li class="flex items-start gap-2">
					<i class="fa-solid fa-circle-check text-success"></i>
					<span>Confirm the recipient is correct for this conference.</span>
				</li>
				<li class="flex items-start gap-2">
					<i class="fa-solid fa-circle-check text-success"></i>
					<span>Include an action and deadline if needed.</span>
				</li>
				<li class="flex items-start gap-2">
					<i class="fa-solid fa-circle-check text-success"></i>
					<span>Keep it short - links are fine for details.</span>
				</li>
			</ul>
			<div class="divider"></div>
			<div class="rounded-box bg-base-200/70 p-4 text-xs text-base-content/70">
				<p class="font-semibold uppercase tracking-wide text-base-content/60">Tip</p>
				<p>Use subject lines like "Committee agenda lock - 18:00" to improve response time.</p>
			</div>
		</div>
	</aside>
</div>
