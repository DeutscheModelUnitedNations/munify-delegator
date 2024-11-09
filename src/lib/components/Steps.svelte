<script lang="ts">
	interface Props {
		steps: Step[];
		currentStep: number;
	}
	interface Step {
		title: string;
	}

	let { steps, currentStep = 1 }: Props = $props();
</script>

<div class="min-w-60 rounded-2xl bg-base-100 p-4 shadow-lg">
	<ul class="steps">
		{#each steps as step, i}
			<li
				class="step {i + 1 <= currentStep && 'step-primary'} {i + 2 <= currentStep &&
					'check'} mx-2 text-xs sm:text-base"
			>
				{step.title}
			</li>
		{/each}
	</ul>
</div>

<style>
	.check::after {
		content: '\f00c' !important;
		font-family: FontAwesome;
	}
</style>
