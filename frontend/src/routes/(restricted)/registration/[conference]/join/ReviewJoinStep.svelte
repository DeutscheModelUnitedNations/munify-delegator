<script lang="ts">
	import ReviewTable from '$lib/components/ReviewTable.svelte';

	interface Props {
		code: string;
		changeStep: (step: number) => void;
	}

	let { code, changeStep }: Props = $props();

	let testData = {
		conference: 'MUN-SH 2025',
		delegationId: '1234ABCD',
		institution: 'Gymnasium Musterstadt',
		headDelegate: 'Max Mustermann',
		numDelegates: 5
	};
</script>

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
	<button
		class="btn btn-warning"
		onclick={() => {
			changeStep(1);
		}}>Zurück</button
	>
	<button
		class="btn btn-primary"
		onclick={() => {
			alert('#TODO');
		}}>Bestätigen</button
	>
</div>
