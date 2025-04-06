<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import svg500 from '$assets/undraw/500.svg';
	import svg404 from '$assets/undraw/404.svg';
	import svgquestion from '$assets/undraw/question.svg';
	import access_denied from '$assets/undraw/access_denied.svg';

	import { page } from '$app/state';

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

<main class="flex h-screen w-full flex-col items-center justify-center gap-10 p-4">
	<img src={getPicture(page.status)} alt="404" class="w-1/2" />
	<h1 class="text-center text-3xl">{getErrorText(page.status)}</h1>
	<p>{page.error?.message}</p>
</main>
