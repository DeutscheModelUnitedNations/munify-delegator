<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import Footer from '$lib/components/Footer.svelte';
	import svg500 from '$assets/undraw/500.svg';
	import svg404 from '$assets/undraw/404.svg';
	import svgquestion from '$assets/undraw/question.svg';
	import access_denied from '$assets/undraw/access_denied.svg';

	import { page } from '$app/stores';

	const getPicture = (e: number) => {
		switch (e) {
			case 404:
				return svg404;
			case 500:
				return svg500;
			case 403:
				return access_denied;
			default:
				return svgquestion;
		}
	};

	const getErrorText = (e: number) => {
		switch (e) {
			case 400:
				return m.http400();
			case 403:
				return m.http403();
			case 404:
				return m.http404();
			case 500:
				return m.http500();
			default:
				return m.httpGenericError();
		}
	};
</script>

<main class="h-screen w-full flex flex-col justify-center items-center gap-10 p-4">
	<img src={getPicture($page.status)} alt="404" class="w-1/2" />
	<h1 class="text-3xl text-center">{getErrorText($page.status)}</h1>
	<p>{$page.error?.message}</p>
</main>
<div class="w-full p-4">
	<Footer />
</div>
