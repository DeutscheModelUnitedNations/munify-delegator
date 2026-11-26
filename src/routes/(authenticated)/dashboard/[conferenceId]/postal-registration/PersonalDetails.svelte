<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import type { PostalDetails } from './postalDetails';

	/** What the documents print about the person. */
	let { details }: { details: PostalDetails } = $props();
</script>

<div class="bg-base-200 grid grid-cols-[auto_1fr] items-center gap-4 rounded-box p-4">
	<i aria-hidden="true" class="ph-duotone ph-user"></i>
	<div>
		{details.givenName}
		{details.familyName}
	</div>
	<i aria-hidden="true" class="ph-duotone ph-house"></i>
	<div>
		{details.street}
		{details.apartment ? `, ${details.apartment}` : ''}<br />
		{details.zip}
		{details.city}<br />
		{details.country}
	</div>
	<i aria-hidden="true" class="ph-duotone ph-cake"></i>
	<div>
		{details.birthday ? new Date(details.birthday).toLocaleDateString(getLocale()) : ''}
	</div>
</div>
