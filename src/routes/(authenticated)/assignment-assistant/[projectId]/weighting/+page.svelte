<script lang="ts">
	import { getWeights, setNonWishMalus, setNullRating, setRatingFactor } from '../weights.svelte';
</script>

<div class="prose w-full">
	<h2>Gewichtung für die automatische Zuteilung</h2>
	<p>
		Die automatische Zuteilung erfolgt über die sog. Ungarische Methode, einem gängigen Algorithmus
		für Zuordnungsprobleme. Es ist dabei möglich, die Gewichtung der Bewerbungen zu beeinflussen, um
		die automatische Zuteilung zu steuern.<br />
		Mehr über die genaue Funktionsweise der Ungarischen Methode findest du
		<a href="https://de.wikipedia.org/wiki/Ungarische_Methode" target="_blank">hier</a>.
	</p>
	<p>Es gibt drei Arten, wie die Gewichtung der Bewertungen beeinflusst werden kann:</p>
	<ol>
		<li>Über die Bewertung (0.5-5)</li>
		<li>Über die Markierung</li>
		<li>Über Ausschlüsse</li>
	</ol>

	<h3>Gewichtungsregeln für Bewertung</h3>
	<p>
		Die Bewertung (Sterne) kann entweder nicht vorhanden sein oder einen Wert zwischen 0.5 und 5
		haben, wobei 5 die beste Bewertung und 0.5 die schlechteste Bewertung ist.
	</p>
	<h4>Nullbewertung</h4>
	<p>
		Hier kannst du festlegen, welche Bewertung auf der Skala als "keine Bewertung" gelten soll. Was
		das im Endeffekt bedeutet, ist, dass Bewerbungen mit dieser Bewertung keinen Bonus oder Malus
		erhalten. Der Bonus oder Malus ist also 0.<br />
		Alle Bewerbungen, die keine Bewertung haben, werden automatisch als Nullbewertung gewertet. Den neutralen
		Wert 0 bekommen also alle Bewerbungen, die keine oder diese Bewertung haben.
	</p>
	<input
		type="range"
		min="0.5"
		max="5"
		value={getWeights().nullRating}
		class="range"
		step="0.5"
		onchange={(e: any) => {
			setNullRating(e.target.value);
		}}
	/>
	<div class="flex w-full justify-between px-2 text-xs">
		<span>|</span>
		<span>1</span>
		<span>|</span>
		<span>2</span>
		<span>|</span>
		<span>3</span>
		<span>|</span>
		<span>4</span>
		<span>|</span>
		<span>5</span>
	</div>
	<h4>Multiplikator</h4>
	<p>
		Hier kannst du festlegen, wie stark die Bewertung gewichtet werden soll. Der Multiplikator wird
		mit Wert multipliziert, der herauskommt, wenn die Nullbewertung von der Bewertung (s.o.)
		abgezogen wird. Mit dem Wert 0 kannst du die Funktion deaktivieren.
	</p>
	<input
		class="input input-bordered"
		type="number"
		min="0"
		max="99"
		value={getWeights().ratingFactor}
		pattern="\d*"
		onchange={(e: any) => {
			setRatingFactor(e.target.value);
		}}
	/>
	<p>
		Beispiel 1: Bewertung 3, Nullbewertung 2, Multiplikator 2<br />
		(3 - 2) * 2 = 2<br />
		Der Bewerbung wird also ein Bonus von 2 (also +2) gegeben.
	</p>
	<p>
		Beispiel 2: Bewertung 1, Nullbewertung 3, Multiplikator 4<br />
		(1 - 3) * 4 = -8<br />
		Der Bewerbung wird also ein Malus von 8 (also -8) gegeben.
	</p>

	<h3>Gewichtungsregeln für Markierung</h3>
	<p>Auch deine Markierungen kannst du für die Gewichtung verwenden.</p>
	<h4>Markierungsbonus / -malus</h4>
	<p>
		Hier kannst du festlegen, was für ein Bonus oder Malus eine markierte Bewerbung erhalten soll.
		Der Wert kann positiv oder negativ sein. Der Wert 0 deaktiviert die Funktion.
	</p>
	<input
		class="input input-bordered"
		type="number"
		min="-99"
		max="99"
		value={getWeights().markBonus}
		pattern="\d*"
		onchange={(e: any) => {
			setRatingFactor(e.target.value);
		}}
	/>

	<h3>Gewichtungsregeln für Ausschlüsse</h3>
	<p>
		Wenn du Bewerbungen aus dem Verfahren ausgeschlossen hast, werden diese Standardmäßig nicht
		berücksichtigt.
	</p>

	<h3>Handycap für Nicht-Wünsche</h3>
	<p>
		Hier kannst du bestimmen, wie stark Nicht-Wünsche (also Länder, die nicht gewünscht wurden)
		gewichtet werden sollen. Dabei handelt es sich logischer Weise immer um einen Malus. Der Wert
		kann zwischen -99 und 0 liegen.
	</p>
	<input
		class="input input-bordered"
		type="number"
		min="-99"
		max="0"
		value={getWeights().nonWishMalus}
		pattern="\d*"
		oninput={(e: any) => {
			setNonWishMalus(e.target.value);
		}}
	/>
</div>
