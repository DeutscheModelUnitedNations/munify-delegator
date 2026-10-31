<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { escapeHtml } from '#lib/helpers/escapeHtml';
	import { blur } from 'svelte/transition';
	import { verifyCertificate } from './verifyCertificate';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const { fullName, conferenceTitle, conferenceStartDate, conferenceEndDate, sessions } = $derived(
		await verifyCertificate(params.jwt)
	);
</script>

<div class="bg-base-200 flex h-screen w-full flex-col items-center justify-center p-6">
	<div
		class="card bg-base-100 z-10 w-full max-w-md shadow-xl"
		in:blur={{ duration: 1000, delay: 500 }}
	>
		<div class="relative flex w-full flex-col items-center justify-center gap-6 p-10 text-center">
			{#if fullName}
				<h2 class="card-title">{m.certificateIsValid()}</h2>
				<p class="text-lg">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/; the interpolated values are escaped -->
					{@html m.certificateIsValidFor({
						fullName: escapeHtml(fullName),
						conferenceTitle: escapeHtml(conferenceTitle ?? m.unknownConferenceTitle()),
						conferenceStartDate: conferenceStartDate
							? conferenceStartDate.toLocaleDateString(getLocale())
							: m.unknownDate(),
						conferenceEndDate: conferenceEndDate
							? conferenceEndDate.toLocaleDateString(getLocale())
							: m.unknownDate()
					})}
				</p>
				{#if sessions.length > 0}
					<div class="w-full">
						<h3 class="mb-2 text-center font-bold">{m.certificateSessionsHeading()}</h3>
						<ul class="flex flex-col items-center gap-1">
							{#each sessions as session, index (index)}
								<li class="flex items-center gap-2">
									<i class="fa-sharp-duotone fa-solid fa-check text-success" aria-hidden="true"></i>
									<span>{session}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
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
</div>
