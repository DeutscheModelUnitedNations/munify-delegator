<!-- TEMPORARY: Migration notice page (remove after migration period) -->
<script lang="ts">
	import { page } from '$app/stores';
	import movingSvg from '$assets/undraw/moving.svg';
	import { m } from '$lib/paraglide/messages';
	import { configPublic } from '$config/public';

	const next = $derived($page.url.searchParams.get('next') || '/');
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4 py-12">
	<div class="flex w-full max-w-[700px] flex-col items-center gap-8">
		<!-- Branding -->
		<div class="text-center">
			<i class="fa-duotone fa-id-card-clip text-base-content mb-2 text-4xl"></i>
			<h2 class="text-base-content text-xl font-thin">MUNify</h2>
			<h1 class="text-base-content text-2xl font-bold tracking-widest uppercase">Delegator</h1>
		</div>

		<!-- Illustration -->
		<img src={movingSvg} alt="" class="w-1/3 max-w-[180px]" />

		<!-- Warning header -->
		<div class="alert alert-warning w-full">
			<i class="fa-solid fa-triangle-exclamation text-2xl"></i>
			<div>
				<h2 class="text-xl font-bold">{m.migrationNoticeTitle()}</h2>
				<p>{m.migrationNoticeSubtitle()}</p>
			</div>
		</div>

		<!-- FAQ sections -->
		<div class="flex w-full flex-col gap-4">
			<div class="bg-base-200 rounded-box p-4">
				<h3 class="mb-2 font-semibold">
					<i class="fa-duotone fa-circle-info text-info mr-2"></i>
					{m.migrationNoticeFaqIdentityProviderTitle()}
				</h3>
				<p class="text-base-content">{m.migrationNoticeFaqIdentityProviderBody()}</p>
			</div>

			<div class="bg-base-200 rounded-box p-4">
				<h3 class="mb-2 font-semibold">
					<i class="fa-duotone fa-key text-success mr-2"></i>
					{m.migrationNoticeFaqEmailPasswordTitle()}
				</h3>
				<p class="text-base-content">{m.migrationNoticeFaqEmailPasswordBody()}</p>
			</div>

			<div class="bg-warning rounded-box p-4">
				<h3 class="mb-2 font-semibold">
					<i class="fa-solid fa-exclamation-triangle fa-beat-fade mr-2"></i>
					{m.migrationNoticeFaqSocialTitle()}
				</h3>
				<p class="text-base-content">
					<i class="fa-brands fa-google mr-1"></i>
					<i class="fa-brands fa-microsoft mr-1"></i>
					<i class="fa-brands fa-github mr-2"></i>

					{m.migrationNoticeFaqSocialBody()}
				</p>
			</div>

			<div class="bg-base-200 rounded-box p-4">
				<h3 class="mb-2 font-semibold">
					<i class="fa-duotone fa-life-ring text-error mr-2"></i>
					{m.migrationNoticeFaqHelpTitle()}
				</h3>
				<p class="text-base-content">
					{@html m.migrationNoticeFaqHelpBody({ email: configPublic.PUBLIC_SUPPORT_EMAIL })}
				</p>
			</div>
		</div>

		<!-- Continue button -->
		<form method="POST" class="w-full max-w-xs">
			<input type="hidden" name="next" value={next} />
			<button type="submit" class="btn btn-primary btn-block">
				<i class="fa-duotone fa-arrow-right"></i>
				{m.migrationNoticeContinue()}
			</button>
		</form>
	</div>
</div>
