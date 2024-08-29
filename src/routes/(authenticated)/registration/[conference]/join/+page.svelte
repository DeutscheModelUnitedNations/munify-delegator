<script lang="ts">
	import ReviewTable from '$lib/components/ReviewTable.svelte';
	import { fly } from 'svelte/transition';
	import Steps from '$lib/components/RegistrationSteps.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let step = $state(1);

	let code = $state(data.code ?? '');

	const stepTemplate = [
		{ titel: 'Code eingeben' },
		{
			titel: 'Überprüfen'
		}
	];

	const nextStep = () => {
		step += 1;
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: 'smooth'
		});
	};

	const prevStep = () => {
		step -= 1;
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: 'smooth'
		});
	};

	let testData = {
		conference: 'MUN-SH 2025',
		delegationId: '1234ABCD',
		institution: 'Gymnasium Musterstadt',
		headDelegate: 'Max Mustermann',
		numDelegates: 5
	};
</script>

<div class="w-full min-h-screen flex flex-col items-center p-4">
	<header>
		<Steps currentStep={step} steps={stepTemplate} />
	</header>
	<main class="w-full h-full flex-1 flex flex-col items-center py-16 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{m.joinDelegation()}</h1>
		<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
			<div class="flex flex-col items-center">
				<p class="mb-10 max-ch-sm">
					{m.pleaseCheckDelegation()}
				</p>
				{#if delegationPreview}
					{#await delegationPreview}
						TODO: Spinner
					{:then delegation}
						{#if delegation}
							<div
								class="flex flex-col items-center mb-10"
								in:fly={{ x: 50, duration: 300, delay: 300 }}
								out:fly={{ x: 50, duration: 300 }}
							>
								<ReviewTable>
									<tr>
										<td>{m.conference()}</td>
										<td>{delegation.conferenceTitle}</td>
									</tr>
									<tr>
										<td>{m.schoolOrInstitution()}</td>
										<td>{delegation.school}</td>
									</tr>
									<tr>
										<td>{m.headDelegate()}</td>
										<td>{delegation.headDelegateFullName}</td>
									</tr>
									<tr>
										<td>{m.amountOfDelegates()}</td>
										<td>{delegation.memberCount}</td>
									</tr>
								</ReviewTable>
								<div class="flex flex-col-reverse sm:flex-row justify-between mt-4 gap-4 sm:gap-10">
									<button
										class="btn btn-primary"
										onclick={() => {
											api.delegation.join.post({
												entryCode: code,
												joinAsSupervisor: false
											});
										}}>{m.confirm()}</button
									>
								</div>
							</div>
						{/if}
					{/await}
				{/if}
				<div class="join">
					<input
						type="text"
						placeholder="Code"
						bind:value={code}
						class="input input-bordered input-lg w-full max-w-xs tracking-[0.8rem] uppercase join-item font-mono"
						oninput={(e) => {
							code = (e.target.value as string).toUpperCase().slice(0, 6);
						}}
					/>
				</div>
			</div>
		{:else if step === 2}
			<div in:fly={{ x: 50, duration: 300, delay: 300 }} out:fly={{ x: 50, duration: 300 }}>
				<p class="mb-10">Überprüfe die Angaben und bestätige den Beitritt zur Delegation.</p>
				<ReviewTable>
					<tr>
						<td>Konferenz</td>
						<td>{testData.conference}</td>
					</tr>
					<tr>
						<td>Delegations-ID</td>
						<td>{testData.delegationId}</td>
					</tr>
					<tr>
						<td>Schule oder Institution</td>
						<td>{testData.institution}</td>
					</tr>
					<tr>
						<td>Delegationsleiter*in</td>
						<td>{testData.headDelegate}</td>
					</tr>
					<tr>
						<td>Anzahl der Delegierten</td>
						<td>{testData.numDelegates}</td>
					</tr>
				</ReviewTable>
				<div class="flex flex-col-reverse sm:flex-row justify-between mt-4 gap-4 sm:gap-10">
					<button class="btn btn-warning" onclick={prevStep}>Zurück</button>
					<button
						class="btn btn-primary"
						onclick={() => {
							alert('#TODO');
						}}>Bestätigen</button
					>
				</div>
			</div>
		{/if}
	</main>
</div>
