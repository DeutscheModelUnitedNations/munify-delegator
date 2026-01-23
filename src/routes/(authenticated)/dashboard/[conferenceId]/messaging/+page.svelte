<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/stores';
	$: conferenceId = $page.params.conferenceId;
	$: basePath = `/dashboard/${conferenceId}/messaging`;
	$: pathname = $page.url.pathname;
</script>

<!-- Hero Section with Enhanced Background -->
<section
	class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/10 via-blue-500/10 to-pink-500/10 p-8 shadow-xl mb-8"
>
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

	<div class="relative z-10">
		<!-- Header -->
		<div class="mb-8 text-center fade-in-up">
			<div class="inline-block mb-3">
				<span
					class="px-4 py-2 text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent border border-violet-500/20 rounded-full backdrop-blur-sm"
				>
					{m.messagingConferenceMessaging()}
				</span>
			</div>
			<h1
				class="text-5xl font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-4 sm:text-6xl"
			>
				{m.messagingCenter()}
			</h1>
			<p class="max-w-3xl mx-auto text-lg text-base-content/80 leading-relaxed">
				{m.messagingDescription()}
			</p>
		</div>

		<!-- Navigation Tabs -->
		<div class="flex justify-center mb-6 fade-in-up" style="animation-delay: 0.1s;">
			<nav
				class="inline-flex gap-2 bg-base-100/80 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-base-300/50"
			>
				<a
					class="px-6 py-3 rounded-xl font-medium transition-all duration-300 {pathname === basePath
						? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg'
						: 'text-base-content/70 hover:bg-base-200/80'}"
					href={basePath}
					aria-current={pathname === basePath ? 'page' : undefined}
				>
					<i class="fa-solid fa-grid-2 mr-2"></i>
					{m.messagingOverview()}
				</a>
				<a
					class="px-6 py-3 rounded-xl font-medium transition-all duration-300 {pathname.startsWith(
						`${basePath}/compose`
					)
						? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg'
						: 'text-base-content/70 hover:bg-base-200/80'}"
					href={`${basePath}/compose`}
					aria-current={pathname.startsWith(`${basePath}/compose`) ? 'page' : undefined}
				>
					<i class="fa-solid fa-pen mr-2"></i>
					{m.messageCompose()}
				</a>
				<a
					class="px-6 py-3 rounded-xl font-medium transition-all duration-300 {pathname.startsWith(
						`${basePath}/history`
					)
						? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg'
						: 'text-base-content/70 hover:bg-base-200/80'}"
					href={`${basePath}/history`}
					aria-current={pathname.startsWith(`${basePath}/history`) ? 'page' : undefined}
				>
					<i class="fa-solid fa-clock-rotate-left mr-2"></i>
					{m.messageHistory()}
				</a>
			</nav>
		</div>

		<!-- Primary Action Buttons -->
		<div class="flex flex-wrap justify-center gap-4 fade-in-up" style="animation-delay: 0.2s;">
			<a
				href={`${basePath}/compose`}
				class="btn btn-lg bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 border-0 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
			>
				<i class="fa-solid fa-paper-plane text-lg"></i>
				{m.messagingNewMessage()}
			</a>
			<a
				href={`${basePath}/history`}
				class="btn btn-lg btn-outline border-2 border-violet-500/50 hover:bg-violet-500/10 hover:border-violet-500 transition-all duration-300"
			>
				<i class="fa-solid fa-clock-rotate-left text-lg"></i>
				{m.messageSentLog()}
			</a>
		</div>
	</div>
</section>

<!-- Main Content Stack -->
<div class="flex flex-col gap-8">
	<!-- Quick Actions -->
	<section class="fade-in-up" style="animation-delay: 0.3s;">
		<div
			class="card-hover bg-base-100 rounded-2xl shadow-xl border border-base-300/50 overflow-hidden"
		>
			<div class="p-8">
				<div class="flex items-center gap-3 mb-6">
					<div class="p-3 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl shadow-lg">
						<i class="fa-solid fa-bolt text-white text-xl"></i>
					</div>
					<div>
						<h2
							class="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"
						>
							{m.messagingQuickActions()}
						</h2>
						<p class="text-base-content/60 text-sm">
							{m.messagingStartTargetedMessage()}
						</p>
					</div>
				</div>

				<div class="flex flex-col gap-4">
					<!-- Compose Message Card -->
					<a
						href={`${basePath}/compose`}
						class="action-card group block rounded-xl border-2 border-base-300/50 bg-gradient-to-br from-violet-50/50 to-blue-50/50 dark:from-violet-950/20 dark:to-blue-950/20 p-8 hover:border-violet-500/50 hover:shadow-xl transition-all duration-300"
					>
						<div class="flex flex-col items-center text-center gap-4">
							<div
								class="p-5 bg-gradient-to-br from-violet-500 to-blue-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300"
							>
								<i class="fa-solid fa-pen-nib text-white text-3xl"></i>
							</div>
							<div>
								<h3
									class="text-xl font-bold text-base-content mb-3 group-hover:text-violet-600 transition-colors"
								>
									{m.messageComposeAnnouncement()}
								</h3>
								<p class="text-sm text-base-content/70 leading-relaxed mb-4">
									{m.messageDraftAMessage()}
								</p>
								<div class="inline-flex items-center text-violet-600 font-semibold text-sm">
									<span>Get Started</span>
									<i
										class="fa-solid fa-arrow-right ml-2 group-hover:translate-x-2 transition-transform"
									></i>
								</div>
							</div>
						</div>
					</a>

					<!-- Review Sent Card -->
					<a
						href={`${basePath}/history`}
						class="action-card group block rounded-xl border-2 border-base-300/50 bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-950/20 dark:to-rose-950/20 p-8 hover:border-pink-500/50 hover:shadow-xl transition-all duration-300"
					>
						<div class="flex flex-col items-center text-center gap-4">
							<div
								class="p-5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300"
							>
								<i class="fa-solid fa-inbox text-white text-3xl"></i>
							</div>
							<div>
								<h3
									class="text-xl font-bold text-base-content mb-3 group-hover:text-pink-600 transition-colors"
								>
									{m.messageReviewSent()}
								</h3>
								<p class="text-sm text-base-content/70 leading-relaxed mb-4">
									{m.messagingCheckDeliveryStatus()}
								</p>
								<div class="inline-flex items-center text-pink-600 font-semibold text-sm">
									<span>View History</span>
									<i
										class="fa-solid fa-arrow-right ml-2 group-hover:translate-x-2 transition-transform"
									></i>
								</div>
							</div>
						</div>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Guidelines Sidebar -->
	<aside class="fade-in-up" style="animation-delay: 0.4s;">
		<div
			class="sticky top-6 card-hover bg-base-100 rounded-2xl shadow-xl border border-base-300/50 overflow-hidden"
		>
			<div class="p-8">
				<div class="flex items-center gap-3 mb-6">
					<div
						class="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg icon-pulse"
					>
						<i class="fa-solid fa-lightbulb text-white text-xl"></i>
					</div>
					<h2
						class="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
					>
						{m.messagingGuidelines()}
					</h2>
				</div>

				<ul class="space-y-4">
					<li
						class="flex items-start gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
					>
						<div
							class="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
						>
							1
						</div>
						<span class="text-sm text-base-content/80 leading-relaxed"
							>{m.messagingGuidelineShort()}</span
						>
					</li>
					<li
						class="flex items-start gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
					>
						<div
							class="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
						>
							2
						</div>
						<span class="text-sm text-base-content/80 leading-relaxed"
							>{m.messagingGuidelineDeadlines()}</span
						>
					</li>
					<li
						class="flex items-start gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors"
					>
						<div
							class="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
						>
							3
						</div>
						<span class="text-sm text-base-content/80 leading-relaxed"
							>{m.messagingGuidelineOptIn()}</span
						>
					</li>
				</ul>

				<div class="mt-6 pt-6 border-t border-base-300">
					<div
						class="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20"
					>
						<i class="fa-solid fa-shield-halved text-blue-600 text-xl"></i>
						<p class="text-xs text-base-content/80 font-medium">
							{m.messagingLogsStored()}
						</p>
					</div>
				</div>
			</div>
		</div>
	</aside>
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

	@keyframes gradient-shift {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}

	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.floating-blob {
		animation: float 20s ease-in-out infinite;
	}

	.gradient-bg {
		background: linear-gradient(
			-45deg,
			rgba(139, 92, 246, 0.15),
			rgba(59, 130, 246, 0.15),
			rgba(236, 72, 153, 0.15),
			rgba(251, 146, 60, 0.15)
		);
		background-size: 400% 400%;
		animation: gradient-shift 15s ease infinite;
	}

	.card-hover {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.card-hover:hover {
		transform: translateY(-4px);
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.action-card {
		position: relative;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.action-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
		transition: left 0.5s ease;
	}

	.action-card:hover::before {
		left: 100%;
	}

	.glass-card {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.fade-in-up {
		animation: fade-in-up 0.6s ease-out forwards;
	}

	.icon-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.05);
		}
	}
</style>
