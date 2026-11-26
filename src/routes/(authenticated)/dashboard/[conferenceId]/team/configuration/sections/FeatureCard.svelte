<!--
	@component
	One feature switch of the settings (`FeatureSettings`): what it does, its toggle, and what it
	still needs with a way to set that up. Turning off is always possible; on only once nothing is
	missing.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	let {
		name,
		title,
		description,
		icon,
		missing,
		setUp,
		checked = $bindable()
	}: {
		/** The form field, which also keys the element ids. */
		name: string;
		title: string;
		description: string;
		icon: string;
		/** What it still needs, as text; empty when nothing. */
		missing: string;
		/** Where the missing things are set up: a link, or a tab of this page. */
		setUp?: { href: string } | { onclick: () => void };
		checked: boolean;
	} = $props();

	const descriptionId = $derived(`feature-${name}-description`);
	const missingId = $derived(`feature-${name}-missing`);
</script>

<li
	class="rounded-box flex flex-col gap-3 border p-4 transition-colors {checked
		? 'border-primary/50 bg-primary/5'
		: 'border-base-300 bg-base-100'}"
>
	<label class="flex cursor-pointer items-start gap-3">
		<i
			aria-hidden="true"
			class="ph-duotone ph-{icon} mt-0.5 shrink-0 text-2xl {checked
				? 'text-primary'
				: 'text-base-content/50'}"
		></i>
		<span class="flex min-w-0 flex-1 flex-col gap-1">
			<span class="font-semibold">{title}</span>
			<span id={descriptionId} class="text-base-content/70 text-sm">{description}</span>
		</span>
		<input
			type="checkbox"
			class="toggle toggle-primary shrink-0"
			{name}
			aria-describedby={missing ? `${descriptionId} ${missingId}` : descriptionId}
			disabled={!checked && !!missing}
			bind:checked
		/>
	</label>
	{#if missing}
		<div class="mt-auto flex flex-wrap items-center gap-2 text-sm">
			<span
				id={missingId}
				class="flex min-w-0 flex-1 items-start gap-1.5 {checked
					? 'text-warning'
					: 'text-base-content/70'}"
			>
				<i
					aria-hidden="true"
					class="ph-duotone {checked ? 'ph-warning' : 'ph-info'} mt-0.5 shrink-0"
				></i>
				<span>
					{checked ? m.featureOnButMissing({ missing }) : m.featureNeeds({ missing })}
				</span>
			</span>
			{#if setUp && 'href' in setUp}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved by the caller -->
				<a class="btn btn-ghost btn-xs" href={setUp.href}>
					{m.featureSetUp()}
					<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
				</a>
			{:else if setUp}
				<button type="button" class="btn btn-ghost btn-xs" onclick={setUp.onclick}>
					{m.featureSetUp()}
					<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
				</button>
			{/if}
		</div>
	{/if}
</li>
