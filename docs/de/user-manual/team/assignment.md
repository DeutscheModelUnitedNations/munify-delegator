---
title: Zuteilung
description: Bewerbungen sichten, Rollen verteilen, die Zuteilung übernehmen und freigeben
---

# Zuteilung

Unter **Zuteilung** verteilt die Teilnehmendenbetreuung die Plätze der Konferenz: Nationen und Nichtstaatliche Akteure an Delegationen, Einzelrollen an Einzelteilnehmende. Öffnen können die Seite die Projektleitung und die Teilnehmendenbetreuung.

Die Arbeit verteilt sich auf die Reiter **Einführung**, **Sichtung**, **Gewichtung**, **Einzelteilnehmende**, **Zuteilung** und **Abschluss**. Du kannst jederzeit zwischen ihnen wechseln und in beliebiger Reihenfolge arbeiten. Oben rechts zeigt die Seite immer, wie viele Änderungen geplant sind (**6 geplante Änderungen**, ein Klick führt zum Abschluss) und ob die Zuteilung **Freigegeben** oder **Nicht freigegeben** ist.

## Entwurf, Übernehmen, Freigabe

Die Zuteilung läuft in drei getrennten Schritten:

1. **Entwurf**: Alles, was du in den Reitern planst, liegt als Entwurf auf den echten Bewerbungen. Er verändert an den Anmeldungen nichts, das ganze Team sieht und bearbeitet ihn gemeinsam, und du kannst ihn jederzeit verwerfen.
2. **Übernehmen**: Im Reiter **Abschluss** schreibst du den Entwurf in die Anmeldungen. Erst dann werden Delegationen aufgeteilt und zusammengelegt und Rollen vergeben oder entzogen. Danach ist der Entwurf leer, Bewertungen und Gewichtung bleiben erhalten.
3. **Freigabe**: Die Freigabe entscheidet nur darüber, ob Teilnehmende und Betreuende ihre Rollen sehen. Bis dahin sehen sie auf ihrem [Dashboard](../participant/dashboard) nur, dass die Zuteilung noch läuft. Mit der Freigabe werden keine E-Mails verschickt, die Ergebnismails bietet dir die Seite danach an.

:::tip Erst die Sitzplanung
Welche Rollen es mit wie vielen Plätzen gibt, legst du vorher in der [Sitzplanung](./configuration#seat-planning) und bei den [Gremien](./configuration#committees-and-seats) fest. Die Zuteilung verteilt nur, was dort angelegt ist.
:::

## Sichtung {#sighting}

In der **Sichtung** gehst du alle Bewerbungen nacheinander durch, Delegationen und Einzelteilnehmende in einem Stapel. Ein Fortschrittsbalken zeigt, wie viele schon gesichtet sind (**10 von 250 gesichtet**).

![Die Sichtung mit einer Bewerbungskarte, Sternen, Markierung, Notiz und der Leiste aller Bewerbungen darunter](shot:team/assignment-sighting)

Jede Karte zeigt die Bewerbung: bei einer Delegation ihren Codenamen, die Mitglieder mit Alter und früheren Konferenzteilnahmen, Schulen, Betreuende, die gewünschten Rollen in ihrer Reihenfolge, **Motivation** und **Erfahrung**. Ein rotes Warnzeichen hinter einem Namen verweist auf eine Notiz der Teilnehmendenbetreuung, etwa zu früherem Verhalten, auch aus einem als dieselbe Person bestätigten älteren Konto. Ein Klick auf einen Namen öffnet die Personenkarte.

### Bewerten

Oben rechts auf der Karte bewertest du die Bewerbung:

- Sterne: 1 bis 5 Sterne, auch halbe. Unbewertete Bewerbungen gelten als **Noch nicht gesichtet**.
- **Markieren**: hebt eine Bewerbung hervor, die dir auffällt. Wie stark eine Markierung zählt, legst du in der [Gewichtung](#weighting) fest.
- **Muss einen Platz bekommen**: Die automatische Verteilung setzt diese Bewerbung vor allen anderen, und der Abschluss warnt, wenn sie leer ausginge.
- **Ausschließen**: Ausgeschlossene Bewerbungen bekommen von der automatischen Verteilung keine Rolle und tauchen in den Listen der Zuteilung nur auf Wunsch auf.

**Muss einen Platz bekommen** und **Ausschließen** schließen sich gegenseitig aus: Setzt du das eine, wird das andere entfernt. Darunter hältst du im Feld **Notiz** fest, was dem Team wichtig ist. Die Notiz wird gespeichert, sobald du das Feld verlässt, alles andere sofort, für das ganze Team.

### Durch die Bewerbungen gehen

Unter der Karte zeigt eine Leiste die Bewerbungen um die aktuelle herum, farbig nach Status, und ein Schieberegler springt an jede Stelle im Stapel. Mit **Zurück**, **Weiter** und **Nächste ungesichtete** blätterst du per Klick.

:::tip Tastenkürzel

- **←** und **→**: vorherige und nächste Bewerbung
- **N**: nächste ungesichtete Bewerbung
- **1** bis **5**: Sterne vergeben
- **Strg/⌘ + D**: Bewertung entfernen

Die Tasten wirken nicht, während du in ein Feld tippst.
:::

### Filtern und suchen

Mit dem Feld **Status** beschränkst du den Stapel auf **Alle**, **Noch nicht gesichtet**, **Bewertet**, **Markiert**, **Ausgeschlossen** oder **Mit Notiz**. Das Schulfeld daneben filtert nach einer Schule oder nach **Keine Schule**. Eine Delegation passt, wenn eine ihrer Personen die Schule hat.

Die Suche durchsucht Namen, Codenamen und IDs, Schulen, die Texte der Bewerbung, Mitglieder, Betreuende, deren E-Mail-Adressen und die Notizen. Sie zeigt die besten Treffer, ein Klick (oder Enter für den ersten) öffnet die Bewerbung im Stapel.

## Gewichtung {#weighting}

Die automatische Verteilung sucht für alle offenen Gruppen einer Größe gleichzeitig die Verteilung mit den geringsten Gesamtkosten (Ungarische Methode). In der **Gewichtung** legst du fest, wie Wünsche, Bewertungen, Markierungen und Erfahrung in diese Kosten eingehen. Niedrigere Kosten sind besser.

- **Bewertung**
  - **Durchschnittliche Bewertung**: ab welcher Sternzahl eine Bewerbung als besser oder schlechter als der Durchschnitt gilt. Unbewertete Bewerbungen werden so behandelt, als hätten sie genau diese Bewertung. Standard ist 2,5.
  - **Wie stark die Bewertung zählt**: wie viele Kostenpunkte jeder Stern Abstand zum Durchschnitt ausmacht. Bei 0 wird die Bewertung ignoriert.
- **Markierungen**
  - **Bonus für Markierungen**: wird von den Kosten markierter Bewerbungen abgezogen. Ein negativer Wert wirkt gegen sie. Standard ist 0, Markierungen haben also zunächst keinen Einfluss.
  - **Wirkung des Markierungsbonus**: Bei **Nur Platzvergabe** entscheidet der Bonus nur, wer leer ausgeht, wenn es mehr Gruppen als Rollen gibt. Bei **Platzvergabe und Gewicht der Wünsche** zählen zusätzlich die Wünsche markierter Gruppen bei umkämpften Rollen stärker.
- **Erfahrung**
  - **Modifikator für erfahrene Teilnehmende**: wird auf die Kosten von Gruppen aufgeschlagen, deren Mitglieder schon bei einer früheren Konferenz einen Platz hatten, anteilig nach deren Zahl. Positive Werte benachteiligen erfahrene Gruppen, negative bevorzugen sie.
  - **Wirkung des Modifikators**: dieselbe Wahl wie bei den Markierungen.

Die Wünsche selbst gehen immer ein: Ein weiter hinten gewünschter Platz kostet deutlich mehr als ein Erstwunsch, und eine nicht gewünschte Rolle vergibt die Verteilung erst, wenn kein Wunsch mehr frei ist.

Neben dem Formular zeigen die **Beispielkosten**, was einige typische Bewerbungen mit deinen Werten kosten würden, und **Was diese Einstellungen bewirken** beschreibt die Wirkung in Worten. **Auf Standard zurücksetzen** füllt die Standardwerte ein. Gespeichert wird erst mit **Speichern**.

## Einzelteilnehmende {#single-participants}

Im Reiter **Einzelteilnehmende** verteilst du die Einzelrollen, etwa die Konferenzpresse. Links stehen die Einzelteilnehmenden ohne Rolle, rechts die Einzelrollen mit ihren Plätzen.

- Ziehe eine Person auf eine Rolle, um sie ihr zu geben, oder zurück in den Pool, um sie ihr wieder zu nehmen. Personen, die sich nicht auf diese Rolle beworben haben, stehen oben in der Rolle und sind hervorgehoben.
- Ziehe eine Person auf **Zu Delegation machen**, damit sie eine eigene Delegation wird. Im Reiter [Zuteilung](#delegations) kann sie dann eine Nation oder einen Nichtstaatlichen Akteur bekommen. **Zurücknehmen** macht das rückgängig.
- **Automatisch zuteilen** verteilt alle Einzelteilnehmenden ohne Rolle auf die freien Plätze der Einzelrollen. Dabei bekommt jede Person nur eine Rolle, auf die sie sich beworben hat. Ist keine davon frei, bleibt sie ohne Rolle. Wer leer ausgeht, wenn eine Rolle zu viele Bewerbungen hat, entscheiden Bewertung, Markierung und Erfahrung. Ausgeschlossene Bewerbungen bleiben außen vor, solche mit **Muss einen Platz bekommen** kommen zuerst. Von Hand geplante Rollen bleiben, wie sie sind.

## Zuteilung {#delegations}

Im Reiter **Zuteilung** verteilst du Nationen und Nichtstaatliche Akteure an Delegationen.

![Die Zuteilung mit den Gruppengrößen oben, dem Pool ohne Rolle links und den Rollen mit ihren Plätzen rechts](shot:team/assignment-delegations)

### Gruppengröße und Pool

Oben wählst du die **Gruppengröße**. Das Board zeigt dann links unter **Ohne Rolle** die Gruppen mit so vielen Personen, die noch keine Rolle haben, und rechts die Rollen mit genau so vielen Plätzen. Ein Punkt an einer Größe zeigt, dass dort noch Rollen frei sind, grün ist eine Größe, deren Rollen alle vergeben sind.

Der Pool steht in der Reihenfolge: zuerst Bewerbungen mit **Muss einen Platz bekommen**, dann die bewerteten von der besten abwärts, dann der Rest. Die Suche im Pool durchsucht Name, Schule, Codename und Texte und weist auf Treffer in anderen Gruppengrößen hin. Ausgeschlossene Bewerbungen zeigt der Schalter **Ausgeschlossene zeigen**.

Jede Karte zeigt die Personen, ihre Schulen, die Bewertung, Markierungen und die Wünsche. Der gewünschte Platz, auf dem die Gruppe gerade liegt, ist grün markiert, eine nicht gewünschte Rolle gelb mit Warnzeichen. Solche Gruppen stehen in der Rolle oben. Der Pfeil auf der Karte öffnet die Bewerbung in der Sichtung.

### Von Hand zuteilen

Ziehe eine Gruppe auf eine Rolle, um sie ihr zu geben, oder zurück in den Pool, um sie ihr zu nehmen. Eine Rolle nimmt eine Gruppe nur auf, wenn sie genug freie Plätze hat (**2 / 3 Plätze**). Sonst meldet das Board **Diese Rolle hat nicht genug freie Plätze.** Wie viele Plätze eine Nation hat, ergibt sich aus der [Sitzplanung](./configuration#seat-planning).

Landen mehrere Gruppen auf derselben Rolle, legt die Übernahme sie zu einer Delegation zusammen: in die Delegation, die die Rolle schon hat, sonst in die größte, die ganz dorthin geht, sonst in eine neue.

### Delegationen aufteilen

Passt eine Delegation nicht zu den freien Rollen, teile sie mit **Aufteilen** auf ihrer Karte. Im Dialog ziehst du jedes Mitglied in einen Teil, fügst mit **Teil hinzufügen** weitere hinzu oder teilst mit den runden Knöpfen unten in gleich große Teile. Jedes Mitglied muss in genau einem Teil sein, und es braucht mindestens zwei Teile.

Jeder Teil erscheint danach als eigene Gruppe seiner Größe und wird einzeln zugeteilt. Beim Übernehmen werden aus den Teilen eigene Delegationen. **Aufteilung zurücknehmen** auf einem Teil führt die Delegation wieder zusammen. Tritt nach dem Aufteilen jemand der Delegation bei, warnt das Board, dass er keinem Teil zugeordnet ist. Teile die Delegation dann erneut auf.

### Automatisch zuteilen

**Automatisch zuteilen (3)** verteilt alle offenen Gruppen der gewählten Größe in einem Durchgang nach der [Gewichtung](#weighting). Dabei gilt:

- Sie vergibt nur Rollen mit **genau** so vielen freien Plätzen, wie die Gruppe Mitglieder hat. Eine Rolle, die eine Gruppe nur teilweise füllen würde, teilst du von Hand zu.
- Wünsche gehen vor: Die Verteilung setzt so viele Gruppen wie möglich auf einen ihrer Wünsche. Nur was übrig bleibt, geht an Gruppen ohne freien Wunsch.
- Bewerbungen mit **Muss einen Platz bekommen** bekommen vor allen anderen einen Platz, sobald eine Rolle passt. Welche, folgt weiter ihren Wünschen.
- Ausgeschlossene Bewerbungen bekommen keine Rolle.

Das Ergebnis landet im Entwurf wie eine Zuteilung von Hand, du kannst es also prüfen und ändern. **Rollen mit 3 Plätzen zurücksetzen** nimmt im Entwurf allen Gruppen ihre Rolle wieder ab, die auf einer Rolle dieser Platzzahl liegen.

### Schulregeln

Unter dem Pool zeigt **Schulregeln**, wo der Entwurf die Regeln der Konferenz zu Schulen verletzt. Die Bewerbenden einer Betreuungsperson von derselben Schule bekommen bis zu einer Gruppengröße von 16 alle einen Platz oder niemand. Zu ihnen zählen alle Mitglieder derselben Schule in Delegationen, in denen die Betreuungsperson mit mindestens einer Person verknüpft ist. Personen einer Auslandsschule bekommen höchstens 12 garantierte Plätze pro Schule, gezählt wird jede Person nach ihrer eigenen Schule. Alle Auslandsschulen zusammen bekommen höchstens 20 % aller Plätze der Konferenz als garantierte Plätze. Das Board warnt bei Gruppen, von denen nur ein Teil einen Platz bekäme oder ausgeschlossen ist, und bei Auslandsschulen mit zu vielen garantierten Plätzen, einzeln oder zusammen. Es verhindert die Zuteilung aber nicht. Die Grenzen stellst du in den [Konferenzeinstellungen](./configuration) ein, leer schaltet eine Regel ab.

## Abschluss und Freigabe {#finish-and-release}

Im **Abschluss** prüfst du, was der Entwurf bewirkt, übernimmst ihn und gibst die Zuteilung frei.

![Der Abschluss mit den geplanten Änderungen und der Freigabe](shot:team/assignment-finish)

### Geplante Änderungen prüfen

Unter **Geplante Änderungen** zählt die Seite **Rollenänderungen**, **Zusammenlegungen**, **Neue Delegationen**, **Aufgelöste Delegationen** und **Einzelrollen** und listet jede betroffene Gruppe mit **Bisher** und **Neu**. Markiert sind Teile einer Aufteilung, Einzelpersonen als Delegation und Gruppen, die **wird zusammengelegt**.

Darüber stehen Probleme und Warnungen:

- **Diese Probleme verhindern die Übernahme**: eine Rolle mit mehr Personen als Plätzen, eine Aufteilung, die Mitglieder ohne Teil zurücklässt, oder eine Delegation, die aufgelöst würde, aber schon Paper eingereicht hat.
- Warnungen, die die Übernahme nicht verhindern: eine Einzelrolle, die öfter vergeben ist, als sie Plätze hat, Bewerbungen mit **Muss einen Platz bekommen**, die leer ausgingen (für die ganze Konferenz geprüft, nicht nur für das Board), **Alle Plätze wären vergeben**, **Gruppen werden geteilt** und **Zu viele garantierte Plätze an Auslandsschulen**.

:::tip Ein paar Plätze frei lassen
Ein paar freie Plätze helfen bei Unvorhergesehenem und lassen sich später über die Warteliste füllen. Wer von der Warteliste nachrückt, bekommt nach der Freigabe die E-Mail **Von der Warteliste nachgerückt**.
:::

### Übernehmen

**Zuteilung übernehmen** schreibt den Entwurf in einem Schritt in die Anmeldungen. Der Dialog zeigt vorher die Warnungen noch einmal und wie viele Plätze danach frei sind. Beim Übernehmen:

- werden Delegationen aufgeteilt, zusammengelegt oder aus umgewandelten Einzelteilnehmenden neu angelegt. Mitglieder werden dabei verschoben, nicht neu angelegt, Betreuung und Status bleiben also erhalten.
- werden Rollen vergeben und entzogen. Mitglieder, deren Rolle sich ändert, verlieren ihr bisheriges Gremium.
- werden Delegationen, die dabei leer werden, gelöscht.
- wird der Entwurf geleert. Bewertungen und Gewichtung bleiben.

Ändern sich die Bewerbungen während der Übernahme, bricht sie ab und du übernimmst erneut. **Entwurf verwerfen** löscht alle geplanten Änderungen, ohne etwas zu übernehmen.

### Freigeben

Die Karte ganz unten zeigt, ob die Zuteilung freigegeben ist. Solange sie es nicht ist, gelten Teilnehmende weder als angenommen noch als abgelehnt. Nach einer Übernahme erinnert sie dich an die Freigabe.

**Zuteilung freigeben** macht die übernommenen Rollen für Teilnehmende und Betreuende sichtbar, und wer keinen Platz erhalten hat, gilt als abgelehnt. **Zuteilung verbergen** nimmt die Freigabe zurück. Bereits verschickte E-Mails lassen sich aber nicht zurückholen. Ist die Zuteilung freigegeben, werden spätere Änderungen sichtbar, sobald du sie übernimmst.

:::caution Der Entwurf ist nie sichtbar
Teilnehmende sehen immer nur, was übernommen und freigegeben ist. Planst du nach der Freigabe weiter, ändert sich für sie erst mit der nächsten Übernahme etwas.
:::

### Ergebnismails

Weder Übernehmen noch Freigeben verschickt E-Mails. Nach der Freigabe, und nach jeder Übernahme einer schon freigegebenen Zuteilung, fragt die Seite **E-Mails jetzt verschicken?** und listet, was fällig geworden ist: **Zusage**, **Absage**, **Übersicht für Betreuende** und **Von der Warteliste nachgerückt**. Mit **12 E-Mails jetzt verschicken** gehen sie sofort raus. Mit **Später** verschickst oder überspringst du sie später in den Konferenzeinstellungen unter „E-Mails“. Arten, die dort auf automatisch stehen, gehen spätestens mit dem nächsten Lauf raus.
