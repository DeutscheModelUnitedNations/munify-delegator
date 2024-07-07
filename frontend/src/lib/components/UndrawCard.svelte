<script lang="ts">
	interface Props {
		titel: string;
		img: string;
		btnText: string;
		btnLink: string;
	}

	let { titel, img, btnText, btnLink }: Props = $props();
</script>

<div class="card bg-base-100 w-full max-w-96 shadow-lg">
	<figure class="bg-slate-100 flex justify-center items-center p-6 h-60">
		<img src={img} alt="Illustration" class="w-full h-full" />
	</figure>
	<div class="card-body">
		<h2 class="card-title">{titel}</h2>
		<div class="flex-1">
			<slot />
		</div>
		<div class="card-actions justify-end mt-4">
			<a class="btn btn-primary" href={btnLink}>{btnText}</a>
		</div>
	</div>
</div>
