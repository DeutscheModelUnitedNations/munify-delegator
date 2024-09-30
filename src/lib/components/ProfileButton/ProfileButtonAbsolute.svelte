<script lang="ts">
	import ProfileButton from './ProfileButton.svelte';
</script>

<div class="dropdown-end dropdown z-10 fixed top-4 right-4 sm:top-10 sm:right-10">
	<div tabindex="-1" class="btn btn-square">
		<i class="fa-duotone fa-user text-xl"></i>
	</div>
	<ProfileButton />
</div>
