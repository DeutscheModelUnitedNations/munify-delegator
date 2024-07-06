<script lang="ts">
	import LL from '$i18n/i18n-svelte';
	import { locale } from '$i18n/i18n-svelte';

	export let titel: string;
</script>

<div class="navbar bg-base-100 px-4 py-2 rounded-2xl shadow-lg gap-2">
	<label for="my-drawer" class="btn btn-square btn-ghost drawer-button lg:hidden">
		<i class="fa-solid fa-bars text-xl"></i>
	</label>
	<div class="grow">
		<h1 class="lg:text-2xl lg:font-light">{titel}</h1>
	</div>
	<!-- dropdown -->
	<div class="dropdown dropdown-end z-10">
		<div tabindex="0" class="btn btn-square btn-ghost">
			<div class="indicator">
				<span class="badge indicator-item badge-error badge-xs"></span>
				<i class="fa-duotone fa-bell text-xl" />
			</div>
		</div>
		<ul tabindex="0" class="menu dropdown-content mt-3 w-80 rounded-box bg-base-100 p-2 shadow-2xl">
			<li>
				<a class="gap-4">
					<i class="fa-duotone fa-bell text-xl w-6" />
					<span>
						<b>Neue Aufgabe</b>
						<br />
						Wahl des Seminartagsprogramms
					</span>
				</a>
			</li>
			<li>
				<a class="gap-4">
					<i class="fa-duotone fa-check text-xl w-6" />
					<span>
						<b>Neue Benachrichtigung</b>
						<br />
						Beitragszahlung eingegangen
					</span>
				</a>
			</li>
		</ul>
	</div>
	<!-- /dropdown -->
	<!-- dropdown -->
	<div class="dropdown-end dropdown z-10">
		<div tabindex="0" class="btn btn-square btn-ghost">
			<i class="fa-duotone fa-user text-xl"></i>
		</div>
		<ul tabindex="0" class="menu dropdown-content mt-3 w-52 rounded-box bg-base-100 p-2 shadow-2xl">
			<li>
				<a>
					<i class="fa-duotone fa-user w-4" />
					{$LL.profileOptions.PROFILE()}{$locale}
				</a>
			</li>
			<li>
				<a>
					<label class="swap swap-rotate w-4">
						<input type="checkbox" class="theme-controller" value="synthwave" id="theme-checkbox" />
						<i class="fa-duotone fa-sun swap-off" />
						<i class="fa-duotone fa-moon swap-on" />
					</label>
					{$LL.profileOptions.SWITCH_THEME()}
				</a>
			</li>
			<li>
				<a>
					<i class="fa-duotone fa-sign-out w-4" />
					{$LL.profileOptions.LOGOUT()}
				</a>
			</li>
		</ul>
	</div>
	<!-- /dropdown -->
</div>
