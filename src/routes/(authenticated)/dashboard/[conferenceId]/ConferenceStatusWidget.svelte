<script lang="ts">
	import StatusCube from '$lib/components/StatusCubes/StatusCube.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		conferenceId: string;
		userId: string;
	}

	let { conferenceId, userId }: Props = $props();

	let loading = $state(true);
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.personalStatus()}</h2>
	<p>{m.personalStatusDescription()}</p>
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
		<StatusCube status="DONE" task={m.registration()} faIcon="user-plus" />
		<StatusCube status="PROBLEM" task={m.payment()} faIcon="hand-holding-circle-dollar" />
		<StatusCube status="PENDING" task={m.userAgreement()} faIcon="file-contract" />
		<StatusCube status="PENDING" task={m.guardianAgreement()} faIcon="family" />
		<StatusCube status="PENDING" task={m.mediaAgreement()} faIcon="photo-film" />
	</div>

	<h3 class="text-lg font-bold">{m.takeAction()}</h3>
	<div class="flex w-full flex-col gap-4 md:flex-row">
		<a href="./{conferenceId}/payment" class="btn btn-primary btn-lg w-full md:w-auto">
			<i class="fas fa-hand-holding-circle-dollar"></i>
			<h4>{m.payment()}</h4>
		</a>
		<a href="./{conferenceId}/postalRegistration" class="btn btn-primary btn-lg w-full md:w-auto">
			<i class="fas fa-envelopes-bulk"></i>
			<h4>{m.postalRegistration()}</h4>
		</a>
	</div>
</section>
