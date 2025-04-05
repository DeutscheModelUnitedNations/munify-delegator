<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { blur } from 'svelte/transition';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let { fullName, conferenceTitle, conferenceStartDate, conferenceEndDate } = data;

	let loading = $state(true);

	$effect(() => {
		loading = false;
	});
</script>

<div class="flex h-screen w-full flex-col items-center justify-center bg-base-200 p-6">
	{#if !loading}
		<div
			class="card z-10 w-full max-w-md bg-base-100 shadow-xl"
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
					<i class="fas fa-check-circle text-4xl text-success"></i>
					<i
						class="fas fa-seal absolute right-0 top-0 -translate-x-1/2 -translate-y-1/2 text-6xl text-primary"
					></i>
				{:else}
					<h2 class="card-title">{m.certificateIsNotValid()}</h2>
					<p class="text-lg">
						{m.certificateIsNotValidText()}
					</p>
					<i class="fas fa-xmark-circle text-4xl text-error"></i>
					<i
						class="fas fa-seal-exclamation absolute right-0 top-0 -translate-x-1/2 -translate-y-1/2 text-6xl text-error"
					></i>
				{/if}
			</div>
		</div>
	{/if}
	<div class="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center">
		<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
	</div>
</div>
