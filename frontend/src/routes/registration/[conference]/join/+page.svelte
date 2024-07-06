<script lang="ts">
	import InputCodeStep from './InputCodeStep.svelte';
	import ReviewJoinStep from './ReviewJoinStep.svelte';
	import { fly } from 'svelte/transition';
	import Steps from '$lib/components/RegistrationSteps.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let step = 1;
	let code = data.code ?? '';
</script>

<div class="w-full min-h-screen flex flex-col items-center p-4">
	<header>
		<Steps
			currentStep={step}
			steps={[
				{ titel: 'Code eingeben' },
				{
					titel: 'Überprüfen'
				}
			]}
		/>
	</header>
	<main class="w-full h-full flex-1 flex flex-col items-center py-16 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">Delegation beitreten</h1>
		{#if step === 1}
			<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
				<InputCodeStep
					{code}
					changeCode={(code) => {
						code = code;
					}}
					changeStep={(s) => {
						step = s;
					}}
				/>
			</div>
		{:else if step === 2}
			<div in:fly={{ x: 50, duration: 300, delay: 300 }} out:fly={{ x: 50, duration: 300 }}>
				<ReviewJoinStep
					{code}
					changeStep={(s) => {
						step = s;
					}}
				/>
			</div>
		{/if}
	</main>
</div>
