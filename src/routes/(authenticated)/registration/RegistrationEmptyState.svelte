<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { configPublic } from '$config/public';
</script>

<section class="mx-auto flex max-w-3xl flex-col items-center gap-12 py-12 text-center">
	<svg
		width="260"
		height="150"
		viewBox="0 0 260 150"
		fill="none"
		stroke-width="2"
		stroke-linejoin="round"
		stroke-linecap="round"
		class="stroke-base-content max-w-full"
		aria-hidden="true"
	>
		<path d="M20 138h220" class="stroke-base-300" />
		<path d="M58 138L84 34h92l26 104" class="fill-base-100" />
		<path d="M84 34l-10 104" class="stroke-base-300" />
		<path d="M106 82h48" class="stroke-base-content/40" stroke-dasharray="6 6" />
		<path d="M114 100h32" class="stroke-base-content/40" stroke-dasharray="4 6" />
		<circle cx="130" cy="58" r="8" class="stroke-primary" />
	</svg>

	<div class="flex flex-col items-center gap-4">
		<span class="text-primary text-sm font-semibold tracking-widest uppercase">
			{m.registration()}
		</span>
		<h1 class="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
			{m.noConferenceOpenForRegistration()}
		</h1>
		<p class="text-base-content/70 max-ch-md text-lg">
			{m.noConferenceOpenForRegistrationText()}
		</p>
	</div>

	<div class="grid w-full gap-4 text-left sm:grid-cols-2">
		<a
			href={resolve('/dashboard')}
			class="border-base-300 hover:border-primary flex flex-col gap-2 border p-6 transition-colors"
		>
			<span class="flex items-center justify-between text-xl font-semibold">
				{m.emptyStateDashboardTitle()}
				<i class="fa-duotone fa-arrow-right text-primary"></i>
			</span>
			<span class="text-base-content/70">{m.emptyStateDashboardText()}</span>
		</a>
		<a
			href="mailto:{configPublic.PUBLIC_SUPPORT_EMAIL}"
			class="border-base-300 hover:border-primary flex flex-col gap-2 border p-6 transition-colors"
		>
			<span class="flex items-center justify-between text-xl font-semibold">
				{m.emptyStateSupportTitle()}
				<i class="fa-duotone fa-envelope text-primary"></i>
			</span>
			<span class="text-base-content/70">
				{m.emptyStateSupportText({ email: configPublic.PUBLIC_SUPPORT_EMAIL })}
			</span>
		</a>
	</div>

	<a class="btn btn-outline" href={resolve('/')}>
		<i class="fa-duotone fa-arrow-left"></i>
		{m.backToHome()}
	</a>
</section>
