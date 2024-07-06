<script lang="ts">
    export let titel = '';
    export let href = '';
    export let icon = 'fa-question';
    export let active = false;
</script>


<li>
	<a href={href} class={`flex items-center ${active && "active"}`}>
		<i class={`fa-duotone ${icon} w-5`} style={active && "--fa-primary-color: #ffffff"} />
		<div>{titel}</div>
	</a>
</li>