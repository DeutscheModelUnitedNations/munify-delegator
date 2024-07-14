<script lang="ts">
	import CardInfoSectionWithIcons from './CardInfoSectionWithIcons.svelte';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { onMount } from 'svelte';
	import defaultImage from '$static/dmun-stock/bw1.jpg';

	interface ConferenceCardProps {
		id: string;
		location: string | null;
		start: Date | null;
		end: Date | null;
		website: string | null;
		image: Uint8Array | null;
		title: string;
		baseSlug: string;
		btnText: string;
	}

	let {
		id,
		image,
		title,
		location = '',
		start,
		end,
		website,
		baseSlug,
		btnText = 'Anmelden'
	}: ConferenceCardProps = $props();

	let imageSrc = $state<string>();
	onMount(() => {
		if (image) {
			const blob = new Blob([image], { type: 'image/jpeg' });
			imageSrc = URL.createObjectURL(blob);

			return () => {
				URL.revokeObjectURL(imageSrc as string);
			};
		}
	});

	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};
</script>

<div class="carousel-item card bg-base-100 dark:bg-base-200 max-w-96 w-[90%] shadow-xl">
	<figure>
		<img src={imageSrc ?? defaultImage} alt="Conference" />
	</figure>
	<div class="card-body">
		<h2 class="card-title">{title}</h2>
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
				<i class="fas fa-arrow-right"></i>
			</a>
		</div>
	</div>
</div>
