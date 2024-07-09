<script lang="ts">
	interface Props {
		titel: string;
		href: string;
		icon: string;
		active?: boolean;
	}

	let { titel, href, icon, active = false }: Props = $props();
</script>

<li>
	<a {href} class={`flex items-center ${active && 'active'}`}>
		<i class={`fa-duotone ${icon} w-5`} style={active && '--fa-primary-color: #ffffff'} />
		<div>{titel}</div>
	</a>
</li>
