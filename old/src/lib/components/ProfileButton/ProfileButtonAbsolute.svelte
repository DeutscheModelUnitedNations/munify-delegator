<script lang="ts">
	import ProfileButton from './ProfileButton.svelte';
</script>

<div class="dropdown dropdown-end fixed right-4 top-4 z-10 sm:right-10 sm:top-10">
	<div tabindex="-1" class="btn btn-square">
		<i class="fa-duotone fa-user text-xl"></i>
	</div>
	<ProfileButton />
</div>
