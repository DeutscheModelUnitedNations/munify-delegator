<script lang="ts">
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';

	interface Props {
		title: string;
		description: string;
		fontAwesomeIcon: string;
		link: string;
		btnText?: string;
	}

	let { title, description, fontAwesomeIcon, link, btnText = 'Bewerben' }: Props = $props();

	const infoItems = () => {
		return [{ fontAwesomeIcon, text: description }];
	};
</script>

<div
	class="card max-w-96 bg-base-100 shadow-lg transition-all duration-300 hover:scale-[1.01] dark:bg-base-200"
>
	<div class="card-body">
		<h1 class="card-title">{title}</h1>
		<div class="flex-1">
			<CardInfoSectionWithIcons items={infoItems()} />
		</div>
		<div class="card-actions mt-4 justify-end">
			<a class="btn btn-primary" href={link}>{btnText}</a>
		</div>
	</div>
</div>
