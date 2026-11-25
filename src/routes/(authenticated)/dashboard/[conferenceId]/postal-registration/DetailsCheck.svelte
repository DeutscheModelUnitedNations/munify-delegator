<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { ResolvedPathname } from '$app/types';
	import PersonalDetails from './PersonalDetails.svelte';
	import type { PostalDetails } from './postalDetails';

	/** The person checks what the documents print about them. */
	interface Props {
		details: PostalDetails;
		/** Whether nothing the documents need is missing. */
		complete: boolean;
		profileHref: ResolvedPathname;
		onConfirm: () => void;
	}

	let { details, complete, profileHref, onConfirm }: Props = $props();
</script>

{#if complete}
	<p class="mb-4">{m.checkYourAddressAndBirthday()}</p>
	<PersonalDetails {details} />
{:else}
	<div role="alert" class="alert alert-warning">
		<i aria-hidden="true" class="ph-fill ph-warning text-2xl"></i>
		<span>{m.completeAddressAndBirthdayForPostalRegistration()}</span>
	</div>
{/if}

<div class="mt-4 flex flex-wrap justify-end gap-2">
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved by the page -->
	<a class="btn {complete ? 'btn-ghost' : 'btn-primary'}" href={profileHref}>
		<i aria-hidden="true" class="ph-fill ph-pencil-simple-line"></i>
		{m.updateProfile()}
	</a>
	{#if complete}
		<button type="button" class="btn btn-primary" onclick={onConfirm}>
			{m.postalRegistrationDetailsCorrect()}
			<i aria-hidden="true" class="ph-duotone ph-arrow-down"></i>
		</button>
	{/if}
</div>
