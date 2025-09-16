<script lang="ts">
	interface Props {
		steps: Step[];
		currentStep: number;
	}
	interface Step {
		title: string;
	}

	let { steps, currentStep = 0 }: Props = $props();
</script>

<div class="min-w-60 rounded-2xl bg-base-100 p-4 shadow-lg">
	<ul class="steps">
		{#each steps as step, i}
			<li class="step {i <= currentStep && 'step-primary'} mx-2 text-xs sm:text-base">
				{step.title}
			</li>
		{/each}
	</ul>
</div>
