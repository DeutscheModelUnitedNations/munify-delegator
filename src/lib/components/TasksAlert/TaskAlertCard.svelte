<script lang="ts">
	interface Props {
		severity?: 'default' | 'info' | 'success' | 'warning' | 'error';
		faIcon: string;
		title: string;
		description: string;
		btnText?: string;
		btnLink?: string;
		btnExternal?: boolean;
		btnOnClick?: () => void;
	}

	let {
		severity = 'default',
		title,
		description,
		btnText,
		btnLink,
		btnExternal,
		btnOnClick,
		faIcon
	}: Props = $props();
</script>

<div class="alert alert-{severity}">
	<i
		class="{severity !== 'default' ? 'fas' : 'fa-duotone'} fa-{faIcon.replace(
			'fa-',
			''
		)} mx-4 w-12 text-center text-3xl"
	></i>
	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{title}</h3>
		<p>{@html description}</p>
		{#if btnText}
			{#if btnOnClick}
				<button
					class="btn {severity === 'default' || severity === 'info'
						? 'btn-primary'
						: `btn-${severity}`} mt-4 max-w-sm"
					onclick={btnOnClick}
				>
					{btnText}
				</button>
			{:else}
				<a
					class="btn {severity === 'default' || severity === 'info'
						? 'btn-primary'
						: `btn-neutral`} mt-4 max-w-sm"
					href={btnLink}
					target={btnExternal ? '_blank' : undefined}
				>
					{btnText}
				</a>
			{/if}
		{/if}
	</div>
</div>
