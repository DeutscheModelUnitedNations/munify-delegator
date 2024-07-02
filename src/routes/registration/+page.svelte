<script lang="ts">
	import UndrawCard from '$lib/components/UndrawCard.svelte';
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-3xl">Anmeldung</h1>
	</hero>

	<main>
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-10"
		>
			<UndrawCard
				titel="Delegation anlegen"
				img="/undraw/new.svg"
				btnText="Neue Delegation anlegen"
				btnLink="/registration/new-delegation"
			>
				<div class="grid grid-cols-[auto_1fr] gap-2">
					<i class="fa-duotone fa-plus mt-1" />
					<p>
						Hier kannst du als Delegationsleiter*in eine neue Delegation anlegen und Menschen zu der
						Delegation einladen
					</p>
					<i class="fa-duotone fa-podium mt-1" />
					<p>
						<span class="font-bold">Rollen:</span> Delegierte*r eines Staates oder Vertreter*in eines
						Nichtstaatlichen Akteurs
					</p>
				</div>
			</UndrawCard>

			<UndrawCard
				titel="Delegation beitreten"
				img="/undraw/team.svg"
				btnText="Code Eingeben"
				btnLink="/dashboard"
			>
				<div class="grid grid-cols-[auto_1fr] gap-2">
					<i class="fa-duotone fa-arrow-right mt-1" />
					<p>
						Hier kannst du einer Delegation mit einem Code beitreten, den dir der/die
						Delegationsleiter*in ausgestellt hat.
					</p>
					<i class="fa-duotone fa-podium mt-1" />
					<p>
						<span class="font-bold">Rollen:</span> Delegierte*r eines Staates oder Vertreter*in eines
						Nichtstaatlichen Akteurs
					</p>
				</div>
			</UndrawCard>

			<UndrawCard
				titel="Presseteam beitreten"
				img="/undraw/newspaper.svg"
				btnText="Zum Presseteam"
				btnLink="/dashboard"
			>
				<div class="grid grid-cols-[auto_1fr] gap-2">
					<i class="fa-duotone fa-arrow-right mt-1" />
					<p>Hier kannst du dich als Mitglied der Konferenzpresse bewerben.</p>
					<i class="fa-duotone fa-podium mt-1" />
					<p>
						<span class="font-bold">Rollen:</span> Mitglied der Konferenzpresse
					</p>
				</div>
			</UndrawCard>
		</section>
		<section class="mt-20">
			<h1 class="text-3xl">Offene Delegationen</h1>
            <p>Wenn du noch keine Partner*innen für eine Delegation gefunden hast, kannst du dich auch bei einer offenen Delegation bewerben.</p>
			<div class="overflow-x-auto">
				<table class="table">
                    <thead>
                        <tr>
                            <th>Delegationsnummer</th>
                            <th>Delegationsleitung</th>
                            <th>Delegierte</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>Max M.</td>
                            <td>4</td>
                            <td>
                                <a href="/registration/join-delegation/1" class="btn btn-primary">Beitreten</a>
                            </td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>Antje X.</td>
                            <td>2</td>
                            <td>
                                <a href="/registration/join-delegation/2" class="btn btn-primary">Beitreten</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
			</div>
		</section>
	</main>
</div>
