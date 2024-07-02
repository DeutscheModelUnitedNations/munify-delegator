<script lang="ts">
	import UndrawCard from '$lib/components/UndrawCard.svelte';
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<a class="fixed top-4 right-4 btn btn-primary" href="/login">Login</a>
	<hero class="my-20 text-center">
		<h2 class="text-2xl text-black">MUNify</h2>
		<h1 class="text-4xl text-black font-bold">DELEGATOR</h1>
		<p class="text-lg text-black">Ein Service von DMUN</p>
	</hero>

	<main
		class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-10"
	>
		<UndrawCard
			titel="Anmeldung"
			img="/undraw/team-up.svg"
			btnText="Zur Anmeldung"
			btnLink="/registration"
		>
			<p>Melde dich bei einer unserer Konferenzen an, indem du dich bewirbst</p>
		</UndrawCard>

		<UndrawCard
			titel="Deine Konferenzen"
			img="/undraw/progress.svg"
			btnText="Zur Übersicht"
			btnLink="/dashboard"
		>
			<p>Hier findest du alle Konferenzen, bei denen du schon angemeldet bist</p>
		</UndrawCard>
	</main>
</div>
