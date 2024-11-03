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
	class="card bg-base-100 dark:bg-base-200 max-w-96 shadow-lg hover:scale-[1.01] transition-all duration-300"
>
	<div class="card-body">
		<h1 class="card-title">{title}</h1>
		<div class="flex-1">
			<CardInfoSectionWithIcons items={infoItems()} />
		</div>
		<div class="card-actions justify-end mt-4">
			<a class="btn btn-primary" href={link}>{btnText}</a>
		</div>
	</div>
</div>
