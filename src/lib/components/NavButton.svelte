<script lang="ts">
	interface Props {
		title: string;
		href: string;
		icon: string;
		active?: boolean;
	}

	let { title, href, icon, active = false }: Props = $props();
</script>

<li>
	<a {href} class={`flex items-center ${active && 'active'}`}>
		<i class="fa-{active ? 'solid' : 'duotone'} {icon} w-5"></i>
		<div>{title}</div>
	</a>
</li>
