<script lang="ts">
	import ProfileButtonHeaderEmbed from '$lib/components/ProfileButton/ProfileButtonHeaderEmbed.svelte';

	let { title }: { title: string } = $props();
</script>

<div class="navbar gap-2 rounded-2xl bg-base-200 px-4 py-2 shadow-lg">
	<label for="my-drawer" class="btn btn-square btn-ghost drawer-button lg:hidden">
		<i class="fa-solid fa-bars text-xl"></i>
	</label>
	<div class="grow">
		<h1 class="lg:text-2xl lg:font-light">{title}</h1>
	</div>
	<!-- dropdown -->
	<!-- <div class="dropdown dropdown-end z-10">
		<div tabindex="0" class="btn btn-square btn-ghost">
			<div class="indicator">
				<span class="badge indicator-item badge-error badge-xs"></span>
				<i class="fa-duotone fa-bell text-xl" ></i>
			</div>
		</div>
		<ul tabindex="0" class="menu dropdown-content mt-3 w-80 rounded-box bg-base-100 p-2 shadow-2xl">
			<li>
				<a class="gap-4">
					<i class="fa-duotone fa-bell text-xl w-6" ></i>
					<span>
						<b>Neue Aufgabe</b>
						<br />
						Wahl des Seminartagsprogramms
					</span>
				</a>
			</li>
			<li>
				<a class="gap-4">
					<i class="fa-duotone fa-check text-xl w-6" ></i>
					<span>
						<b>Neue Benachrichtigung</b>
						<br />
						Beitragszahlung eingegangen
					</span>
				</a>
			</li>
		</ul> 
	</div> -->
	<!-- /dropdown -->
	<!-- dropdown -->
	<ProfileButtonHeaderEmbed />
	<!-- /dropdown -->
</div>
