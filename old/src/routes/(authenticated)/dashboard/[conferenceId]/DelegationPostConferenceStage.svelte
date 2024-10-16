<script lang="ts">
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
</script>

<div role="alert" class="alert alert-info">
	<i class="fas fa-clock text-2xl"></i>
	<span>Diese Konferenz hat bereits stattgefunden. Schön, dass du dabei warst!</span>
</div>
<section>
	<RoleWidget countryCode="de" />
</section>
<section class="flex flex-col flex-wrap gap-4 md:flex-row">
	<UndrawCard
		title="Feedback"
		img="/undraw/feedback.svg"
		btnText="Feedback geben"
		btnLink="/feedback"
	>
		<p>Wir freuen uns über dein Feedback zur Konferenz</p>
	</UndrawCard>
	<UndrawCard
		title="Teilnahmebestätigung"
		img="/undraw/certificate.svg"
		btnText="Bestätigung herunterladen"
		btnLink="/feedback"
	>
		<p>Hier kannst du deine Teilnahmebestätigung herunterladen</p>
	</UndrawCard>
</section>
