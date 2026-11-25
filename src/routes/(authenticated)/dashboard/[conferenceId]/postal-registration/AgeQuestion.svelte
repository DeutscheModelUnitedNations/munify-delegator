<script lang="ts">
	import { slide } from 'svelte/transition';
	import { m } from '#lib/paraglide/messages';
	import type { ResolvedPathname } from '$app/types';

	/** Whether the person is of age at the conference, as their birthday says, and if that is right. */
	interface Props {
		age: { ofAge: boolean; text: string; meaning: string };
		/** Their birthday, as it is written. */
		birthday: string;
		/** Where they correct it. */
		profileHref: ResolvedPathname;
		onConfirm: () => void;
	}

	let { age, birthday, profileHref, onConfirm }: Props = $props();

	let wrong = $state(false);
</script>

<div class="alert items-start {age.ofAge ? 'alert-info' : 'alert-warning'}">
	<i aria-hidden="true" class="text-2xl {age.ofAge ? 'ph-fill ph-cake' : 'ph-fill ph-warning'}"></i>
	<div class="flex flex-col gap-1">
		<p class="font-semibold">{age.text}</p>
		<p>{age.meaning}</p>
	</div>
</div>

<div class="mt-4 flex flex-wrap items-center justify-end gap-2">
	<p class="mr-auto font-semibold">{m.postalRegistrationAgeQuestion()}</p>
	<button type="button" class="btn" aria-pressed={wrong} onclick={() => (wrong = !wrong)}>
		{m.postalRegistrationAgeWrong()}
	</button>
	<button type="button" class="btn btn-primary" onclick={onConfirm}>
		{m.postalRegistrationAgeCorrect()}
		<i aria-hidden="true" class="ph-duotone ph-arrow-down"></i>
	</button>
</div>

{#if wrong}
	<div class="mt-4 flex flex-col items-start gap-3" transition:slide={{ duration: 200 }}>
		<p role="status">{m.postalRegistrationAgeWrongHint({ birthday })}</p>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved by the page -->
		<a class="btn" href={profileHref}>
			<i aria-hidden="true" class="ph-fill ph-pencil-simple-line"></i>
			{m.updateProfile()}
		</a>
	</div>
{/if}
