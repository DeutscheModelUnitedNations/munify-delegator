<script lang="ts">
	import ProfileButton from './ProfileButton.svelte';
	let { logoutUrl }: { logoutUrl: string } = $props();
</script>

<div class="dropdown-end dropdown z-10">
	<div tabindex="-1" class="btn btn-square btn-ghost">
		<i class="fa-duotone fa-user text-xl"></i>
	</div>
	<ProfileButton {logoutUrl} />
</div>
