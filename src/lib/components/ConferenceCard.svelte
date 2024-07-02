<script lang="ts">
	import { locale } from '$i18n/i18n-svelte';

    export let id = '';
	export let titel = '';
	export let location = '';
	export let start: Date;
    export let end: Date;
	export let imageSrc = '';
</script>

<div class="carousel-item card bg-base-100 max-w-96 w-[90%] shadow-xl">
	<figure>
		<img
			src={imageSrc}
			alt="Conference Picture"
		/>
	</figure>
	<div class="card-body">
		<h2 class="card-title">{titel}</h2>
		<p>
			<i class="fa-duotone fa-map-marker-alt w-6 text-center" />
			{location}
		</p>
		<p>
			<i class="fa-duotone fa-calendar w-6 text-center" />
            {start.toLocaleDateString($locale)} - {end.toLocaleDateString($locale)}
		</p>
		<p>
			<i class="fa-duotone fa-comments w-6 text-center" />
			Deutsch
		</p>
		<div class="card-actions justify-end mt-4">
			<a href={`/dashboard/${id}`} class="btn btn-primary">Zur Konferenz<i class="fas fa-arrow-right" /></a>
		</div>
	</div>
</div>
