<script lang="ts">
	import { fly } from 'svelte/transition';
	import Steps from '$lib/components/RegistrationSteps.svelte';
	import ReviewTable from '$lib/components/ReviewTable.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let step = 1;

	const testData = {
		conference: 'MUN-SH 2025',
		institution: 'Gymnasium Musterstadt',
		motivation:
			'Wir möchten unsere Pöbelrolle von MUN-SH 2024 als Nordkorea fortführen und uns dieses Jahr auf Russland bewerben.',
		experience:
			'Wir haben bereits an MUN-SH 2024 teilgenommen und konnten dort als Delegierte Nordkoreas restlos überzeugen.'
	};

	const testCode = '1234abcd';

	const getReferralLink = () => {
		return `http://${data.frontendURL}/registration/${data.conferenceId}/join?code=${testCode}`;
	};
</script>

<div class="w-full min-h-screen flex flex-col items-center p-4">
	<header>
		<Steps
			currentStep={step}
			steps={[
				{ titel: 'Infos' },
				{ titel: 'Fragebogen' },
				{ titel: 'Überprüfen' },
				{ titel: 'Einladen' }
			]}
		/>
	</header>
	<main class="w-full h-full flex-1 flex flex-col items-center py-16 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">Delegation erstellen</h1>
		{#if step === 1}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-6"
			>
				<p class="max-ch-md">
					Sie sind im Begriff, eine Delegation anzulegen. Nachdem Sie eine Delegation angelegt
					haben, können Sie Delegationspartner*innen einladen und sich geschlossen als Delegierte
					auf einen Staat oder als Vertreter*innen einer/eines Nichtstaatlichen Aktuer*in bewerben.
				</p>
				<p class="max-ch-md">
					Sie werden automatisch als Delegationsleiter*in eingetragen. Sie können auch eine
					betreuende Person eintragen, die Sie bei der Organisation der Delegation unterstützt.
				</p>
				<p class="max-ch-md">
					Bitte beachten Sie, dass Sie sich nicht alleine auf eine Delegation bewerben können. Wenn
					Sie sich alleine bewerben möchten, schauen Sie <a href="." class="link underline">hier</a>
					nach Einzelplätzen, auf die Sie sich bewerben können. Außerdem hilft Ihnen die Teilnehmendenbetreuung
					sehr gerne bei der Vermittlung von Delegationspartner*innen. Den Kontakt finden Sie auf der
					Website der jeweiligen Konferenz.
				</p>
				<button class="btn btn-lg btn-primary" on:click={() => (step = 2)}>Weiter</button>
				<a class="btn btn-warning" href=".">Zurück</a>
			</div>
		{:else if step === 2}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-4"
			>
				<p class="max-ch-sm">
					Bitte beantworten Sie zunächst die folgenden Fragen. Sie können die Antworten vor
					Abschluss der Anmeldung noch ändern.
				</p>
				<form
					class="contents"
					on:submit={(e) => {
						e.preventDefault();
						step = 3;
					}}
				>
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text max-ch-sm text-left"
								>Von welcher Schule / Institution kommt Sie (bzw. die Mehrheit Ihrer Delegation)?</span
							>
						</div>
						<input type="text" placeholder="Type here" class="input input-bordered w-full" />
					</label>
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text max-ch-sm text-left"
								>Warum bewirbt sich Ihre Delegation bei der Konferenz</span
							>
						</div>
						<textarea placeholder="Type here" class="textarea textarea-bordered w-full" />
					</label>
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text max-ch-sm text-left"
								>Über wie viel Erfahrung mit politischen Planspielen wie Model United Nations
								verfügt ihre Delegation?</span
							>
						</div>
						<textarea placeholder="Type here" class="textarea textarea-bordered w-full" />
					</label>
					<button class="btn btn-lg btn-primary" role="submit">Weiter</button>
				</form>
				<button
					class="btn btn-warning"
					on:click={() => {
						step = 1;
					}}>Zurück</button
				>
			</div>
		{:else if step === 3}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-4 items-center"
			>
				<p class="max-ch-sm">Bitte Überprüfen Sie noch einmal Ihre Angaben.</p>

				<ReviewTable>
					<tr>
						<td>Konferenz</td>
						<td class="max-ch-sm">{testData.conference}</td>
					</tr>
					<tr>
						<td>Schule oder Institution</td>
						<td class="max-ch-sm">{testData.institution}</td>
					</tr>
					<tr>
						<td>Motivation</td>
						<td class="max-ch-sm">{testData.motivation}</td>
					</tr>
					<tr>
						<td>Erfahrung</td>
						<td class="max-ch-sm">{testData.experience}</td>
					</tr>
				</ReviewTable>
				<button
					class="btn btn-lg btn-primary w-full"
					on:click={() => {
						step = 4;
					}}>Delegation erstellen</button
				>
				<button
					class="btn btn-warning w-full"
					on:click={() => {
						step = 2;
					}}>Zurück</button
				>
			</div>
		{:else if step === 4}
			<div
				in:fly={{ x: 50, duration: 300, delay: 300 }}
				out:fly={{ x: -50, duration: 300 }}
				class="flex flex-col gap-4 items-center w-full sm:w-auto"
			>
				<div role="alert" class="alert alert-success flex justify-center">
					<i class="fas fa-check" />
					<span>Delegation erfolgreich erstellt</span>
				</div>
				<p class="max-ch-sm">
					Nun müssen Sie nur noch Delegationspartner*innen einladen. Dafür können Sie den Menschen,
					die Sie einladen möchten, den folgenden Link senden:
				</p>
				<div class="flex items-center border-2 border-dashed border-primary rounded-lg p-2 w-full">
					<p class="flex-1 overflow-x-auto">
						{getReferralLink()}
					</p>
					<button
						class="btn btn-ghost btn-primary"
						on:click={() => {
							navigator.clipboard.writeText(getReferralLink());
							alert('Link kopiert');
						}}
						><i class="fa-duotone fa-clipboard text-xl" />
					</button>
				</div>
				<p class="max-ch-sm">
					Oder teile mit Ihnen den folgenden Code, mit dem sie sich auf dieser Website anmelden
					können:
				</p>
				<div class="flex items-center border-2 border-dashed border-primary rounded-lg p-2 w-full">
					<p class="flex-1 overflow-x-auto uppercase font-mono text-xl tracking-[0.6rem]">
						{testCode}
					</p>
					<button
						class="btn btn-ghost btn-primary"
						on:click={() => {
							navigator.clipboard.writeText(testCode);
							alert('Code kopiert');
						}}
						><i class="fa-duotone fa-clipboard text-xl" />
					</button>
				</div>
				<a class="btn btn-lg btn-primary w-full mt-10" href="/dashboard">Zum Dashboard</a>
			</div>
		{/if}
	</main>
</div>
