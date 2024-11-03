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

<div class="p-4 bg-base-100 shadow-lg rounded-2xl min-w-60">
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
