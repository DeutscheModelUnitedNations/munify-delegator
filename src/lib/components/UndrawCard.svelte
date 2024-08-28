<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		img: string;
		btnText: string;
		btnLink: string;
		children: Snippet;
	}

	let { title, img, btnText, btnLink, children }: Props = $props();
</script>

<div
	class="card bg-base-100 dark:bg-base-200 w-full max-w-96 shadow-lg hover:scale-[1.01] transition-all duration-300"
>
	<figure class="bg-base-200 dark:bg-base-content flex justify-center items-center p-6 h-60">
		<img src={img} alt="Illustration" class="w-full h-full" />
	</figure>
	<div class="card-body">
		<h2 class="card-title">{title}</h2>
		<div class="flex-1">
			{@render children()}
		</div>
		<div class="card-actions justify-end mt-4">
			<a class="btn btn-primary" href={btnLink}>{btnText}</a>
		</div>
	</div>
</div>
