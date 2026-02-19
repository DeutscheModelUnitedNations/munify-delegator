<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';

	const conferenceId = $derived(page.params.conferenceId);
	const basePath = $derived(`/dashboard/${conferenceId}/messaging`);
</script>

<div class="flex flex-col gap-6">
	<!-- Hero Section with Animated Background -->
	<section class="relative overflow-hidden rounded-box bg-base-200 p-8">
		<!-- Animated Background Blobs -->
		<div
			class="floating-blob pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-r from-violet-400/30 to-purple-400/30 blur-3xl"
			style="animation-delay: 0s;"
			aria-hidden="true"
		></div>
		<div
			class="floating-blob pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-r from-blue-400/30 to-cyan-400/30 blur-3xl"
			style="animation-delay: 5s;"
			aria-hidden="true"
		></div>
		<div
			class="floating-blob pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-gradient-to-r from-pink-400/20 to-rose-400/20 blur-3xl"
			style="animation-delay: 10s;"
			aria-hidden="true"
		></div>

		<div class="relative z-10 text-center">
			<h1 class="text-4xl font-bold mb-3">{m.messagingCenter()}</h1>
			<p class="max-w-2xl mx-auto text-base-content/70 mb-6">
				{m.messagingDescription()}
			</p>
			<a href={`${basePath}/compose`} class="btn btn-primary btn-lg">
				<i class="fa-solid fa-paper-plane"></i>
				{m.messagingNewMessage()}
			</a>
		</div>
	</section>

	<!-- About Section -->
	<DashboardSection
		icon="circle-info"
		title={m.messagingAboutTitle()}
		description={m.messagingAboutDescription()}
	>
		<div class="flex flex-col gap-4">
			<p class="text-base-content/80">
				<i class="fa-duotone fa-fw fa-envelope mr-1"></i>
				{m.messagingAboutRecipientNotice()}
			</p>
			<div role="alert" class="alert alert-info">
				<i class="fa-duotone fa-circle-exclamation text-lg"></i>
				<span>{m.messagingActivationNotice()}</span>
			</div>
		</div>
	</DashboardSection>

	<!-- Guidelines Section -->
	<DashboardSection
		icon="scale-balanced"
		title={m.messagingGuidelines()}
		description={m.messagingGuidelinesDescription()}
	>
		<ul class="flex flex-col gap-3">
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-handshake text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineRespectful()}</span>
			</li>
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-landmark text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineDiplomaticCode()}</span>
			</li>
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-ban text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineNoSpam()}</span>
			</li>
			<li class="flex items-start gap-3">
				<i class="fa-duotone fa-fw fa-bullseye text-primary mt-0.5"></i>
				<span class="text-base-content/80">{m.messagingGuidelineConcise()}</span>
			</li>
		</ul>
	</DashboardSection>

	<!-- Data Notice -->
	<div role="alert" class="alert alert-warning">
		<i class="fa-duotone fa-shield-halved text-lg"></i>
		<span>{m.messagingDataNotice()}</span>
	</div>

	<!-- Quick Link -->
	<div class="text-center">
		<a href={`${basePath}/history`} class="btn btn-ghost">
			<i class="fa-duotone fa-clock-rotate-left"></i>
			{m.messagingViewSentHistory()}
		</a>
	</div>
</div>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -20px) scale(1.05);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.95);
		}
	}

	.floating-blob {
		animation: float 20s ease-in-out infinite;
	}
</style>
