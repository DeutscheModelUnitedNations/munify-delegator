<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { blur } from 'svelte/transition';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let { fullName, conferenceTitle, conferenceStartDate, conferenceEndDate } = data;

	let loading = $state(true);

	$effect(() => {
		loading = false;
	});
</script>

<div class="bg-base-200 flex h-screen w-full flex-col items-center justify-center p-6">
	{#if !loading}
		<div
			class="card bg-base-100 z-10 w-full max-w-md shadow-xl"
			in:blur={{ duration: 1000, delay: 500 }}
		>
			<div class="relative flex w-full flex-col items-center justify-center gap-6 p-10 text-center">
				{#if fullName}
					<h2 class="card-title">{m.certificateIsValid()}</h2>
					<p class="text-lg">
						{@html m.certificateIsValidFor({
							fullName,
							conferenceTitle: conferenceTitle ?? m.unknownConferenceTitle(),
							conferenceStartDate: conferenceStartDate
								? conferenceStartDate.toLocaleDateString()
								: m.unknownDate(),
							conferenceEndDate: conferenceEndDate
								? conferenceEndDate.toLocaleDateString()
								: m.unknownDate()
						})}
					</p>
					<i class="fas fa-check-circle text-success text-4xl"></i>
					<i
						class="fas fa-seal text-primary absolute top-0 right-0 -translate-x-1/2 -translate-y-1/2 text-6xl"
					></i>
				{:else}
					<h2 class="card-title">{m.certificateIsNotValid()}</h2>
					<p class="text-lg">
						{m.certificateIsNotValidText()}
					</p>
					<i class="fas fa-xmark-circle text-error text-4xl"></i>
					<i
						class="fas fa-seal-exclamation text-error absolute top-0 right-0 -translate-x-1/2 -translate-y-1/2 text-6xl"
					></i>
				{/if}
			</div>
		</div>
	{/if}
	<div class="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
		<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
	</div>
</div>
