<script lang="ts">
	import CardInfoSectionWithIcons from './CardInfoSectionWithIcons.svelte';
	import { languageTag } from '$lib/paraglide/runtime.js';

	interface ConferenceCardProps {
		id: string;
		titel: string;
		location: string;
		start: Date;
		end: Date;
		website: string;
		image: string;
		baseSlug: string;
		btnText: string;
	}

	let {
		id,
		titel,
		location = '',
		start,
		end,
		website,
		image = '',
		baseSlug,
		btnText = 'Anmelden'
	}: ConferenceCardProps = $props();

	const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
</script>

<div class="carousel-item card bg-base-100 dark:bg-base-200 max-w-96 w-[90%] shadow-xl">
	<figure>
		<img src={image} alt="Conference Picture" />
	</figure>
	<div class="card-body">
		<h2 class="card-title">{titel}</h2>
		<CardInfoSectionWithIcons
			items={[
				{ icon: 'fa-map-marker-alt', text: location },
				{
					icon: 'fa-calendar',
					text:
						start && end
							? `${start.toLocaleDateString(languageTag(), dateOptions)} - ${end.toLocaleDateString(languageTag(), dateOptions)}`
							: 'Datum unbekannt'
				},
				{ icon: 'fa-globe', text: website, link: website }
			]}
		/>
		<div class="card-actions justify-end mt-4">
			<a href={`${baseSlug}/${id}`} class="btn btn-primary">
				{btnText}
				<i class="fas fa-arrow-right" />
			</a>
		</div>
	</div>
</div>
