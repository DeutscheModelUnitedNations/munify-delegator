<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import svg500 from '#assets/undraw/500.svg';
	import svg404 from '#assets/undraw/404.svg';
	import svgquestion from '#assets/undraw/question.svg';
	import access_denied from '#assets/undraw/access_denied.svg';

	import { page } from '$app/state';

	const pictures: Partial<Record<number, string>> = {
		404: svg404,
		500: svg500,
		403: access_denied
	};

	const errorTexts: Partial<Record<number, () => string>> = {
		400: m.http400,
		403: m.http403,
		404: m.http404,
		500: m.http500
	};

	const getPicture = (e: number) => pictures[e] ?? svgquestion;

	const getErrorText = (e: number) => (errorTexts[e] ?? m.httpGenericError)();
</script>

<main class="flex h-screen w-full flex-col items-center justify-center gap-10 p-4">
	<img src={getPicture(page.status)} alt="" class="w-full max-w-xs" />
	<h1 class="text-center text-3xl">{getErrorText(page.status)}</h1>
	<p>{page.error?.message}</p>
	<a href="/" class="btn btn-primary">{m.backToHome()}</a>
</main>
