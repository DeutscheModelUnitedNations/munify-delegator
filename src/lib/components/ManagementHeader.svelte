<script lang="ts">
	let { title }: { title: string } = $props();
</script>

<div class="navbar bg-base-200 px-4 py-2 rounded-2xl shadow-lg gap-2">
	<label for="my-drawer" class="btn btn-square btn-ghost drawer-button lg:hidden">
		<i class="fa-solid fa-bars text-xl"></i>
	</label>
	<div class="grow">
		<h1 class="lg:text-2xl lg:font-light">{title}</h1>
	</div>
	<!-- dropdown -->
	<div class="dropdown-end dropdown z-10">
		<div tabindex="0" class="btn btn-square btn-ghost">
			<i class="fa-duotone fa-user text-xl"></i>
		</div>
		<ul tabindex="0" class="menu dropdown-content mt-3 w-52 rounded-box bg-base-100 p-2 shadow-2xl">
			<li>
				<a>
					<i class="fa-duotone fa-user w-4" />
					Profilverwaltung
				</a>
			</li>
			<li>
				<a>
					<i class="fa-duotone fa-sign-out w-4" />
					Logout
				</a>
			</li>
		</ul>
	</div>
	<!-- /dropdown -->
</div>
