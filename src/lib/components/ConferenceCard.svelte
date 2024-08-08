<script lang="ts">
	import CardInfoSectionWithIcons from './CardInfoSectionWithIcons.svelte';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { onMount } from 'svelte';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';

	interface ConferenceCardProps {
		id: string;
		location?: string;
		start?: Date;
		end?: Date;
		website?: string;
		image?: Uint8Array;
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

<div class="carousel-item card bg-base-100 dark:bg-base-200 max-w-96 w-[90%] shadow-xl hover:scale-[1.01] transition-all duration-300">
	<figure>
		<img src={defaultImage} alt="Conference" />
	</figure>
	<div class="card-body">
		<h2 class="card-title">{title}</h2>
		<CardInfoSectionWithIcons
			items={[
				{ icon: 'fa-map-marker-alt', text: location ?? 'Ort unbekannt' },
				{
					icon: 'fa-calendar',
					text:
						start && end
							? `${start.toLocaleDateString(languageTag(), dateOptions)} - ${end.toLocaleDateString(languageTag(), dateOptions)}`
							: 'Datum unbekannt'
				},
				{ icon: 'fa-globe', text: website ?? "", link: website ?? "https://dmun.de" }
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
