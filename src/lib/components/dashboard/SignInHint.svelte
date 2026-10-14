<script lang="ts">
	import { resolve } from '$app/paths';
	import undrawSignIn from '$assets/undraw/around_the_world.svg';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';

	/** What a visitor who is not signed in is missing, and the way back to this page after signing in. */
	interface Props {
		title: string;
		text: string;
	}

	let { title, text }: Props = $props();

	const next = $derived(encodeURIComponent(page.url.pathname));
</script>

<div
	class="rounded-box border-primary/30 bg-primary/5 flex flex-col items-center gap-6 border-2 p-6 shadow-sm sm:flex-row"
>
	<img src={undrawSignIn} alt="" class="w-40 shrink-0 sm:w-52" />
	<div class="flex flex-1 flex-col items-center gap-4 text-center sm:items-start sm:text-left">
		<h2 class="text-2xl font-bold tracking-tight">{title}</h2>
		<p class="text-base-content/70 max-w-xl">{text}</p>
		<a class="btn btn-primary gap-2" href={resolve(`/login?next=${next}`)} rel="external">
			<i class="fa-sharp-duotone fa-solid fa-right-to-bracket"></i>
			{m.signIn()}
		</a>
	</div>
</div>
