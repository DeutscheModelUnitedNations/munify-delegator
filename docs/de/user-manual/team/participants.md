---
title: Teilnehmende, Warteliste und Schulen
description: Die Teilnehmendentabelle, die Teilnehmendenkarte, Plätze vergeben, die Warteliste und die Schulen einer Konferenz
---

# Teilnehmende, Warteliste und Schulen

Diese Seite zeigt, wie die Teilnehmendenbetreuung mit den Menschen einer Konferenz arbeitet: wer angemeldet ist, was bei einer Person noch offen ist, wer einen Platz bekommt und von welcher Schule alle kommen. Die Seiten **Teilnehmende**, **Warteliste**, **Plätze** und **Schulen** findest du im Team-Bereich oben in der Navigation. Öffnen dürfen sie die **Projektleitung** und die **Teilnehmendenbetreuung**.

Wie Filter, Gruppen, Spalten und gespeicherte Ansichten in den Tabellen funktionieren, steht unter [Tabellen](./overview#tables) und [Gespeicherte Ansichten](./overview#saved-views). Hier geht es um das, was diese Tabellen zeigen, und um das, was du mit den Personen tust.

## Die Teilnehmendentabelle {#participants-table}

Die Seite **Teilnehmende** listet jede Person, die in der Konferenz eine Rolle hat, mit einer Zeile pro Person. Die Spalte **Teilnahmeart** sagt, als was sie dabei ist:

| Teilnahmeart             | Wer das ist                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Delegationsmitglied**  | Mitglied einer Delegation, egal ob die Delegation sich schon beworben hat oder eine Rolle hat                 |
| **Einzelteilnehmer\*in** | Person mit einer Einzelbewerbung oder einer Einzelrolle                                                       |
| **Betreuer\*in**         | Betreuende, die sich angemeldet haben                                                                         |
| **Teammitglied**         | Mitglied des Konferenzteams                                                                                   |
| **Warteliste**           | Person auf der Warteliste, die in der Konferenz sonst nicht angemeldet ist und noch keinen Platz bekommen hat |

Wer sich beworben hat, keinen Platz bekam und dann auf die Warteliste ging, behält die Zeile der Anmeldung. Ob die Person wartet, zeigt dann die Spalte **Auf der Warteliste**.

### Spalten und Status

Sichtbar sind anfangs Name, **E-Mail**, **Teilnahmeart**, **Nation**, **Gremium**, **Beitragszahlung**, **Postalische Anmeldung**, **Anwesenheit** und **Zugelassen**. Weitere Spalten blendest du über die Spaltenauswahl ein, etwa **Schule / Institution**, **Delegationsleiter\*in**, **Zugewiesene Rolle** (bei Einzelteilnehmenden), **Anwesenheitsplanung** (bei Betreuenden), **Dokumentennummer**, **Zugangsausweis-Nr.**, **Konferenzalter** oder **Geburtstag während der Konferenz**.

- **Nation** zeigt den Staat oder den nichtstaatlichen Akteur der Delegation, **Gremium** das Gremium des Mitglieds.
- **Zugelassen** heißt: Die Person hat einen Platz. Bei Delegationsmitgliedern hat die Delegation eine Rolle, bei Einzelteilnehmenden die Person selbst, Betreuende zählen, sobald eine von ihnen betreute Person einen Platz hat, das Team zählt immer. Das Team sieht das, sobald die Zuteilung [übernommen](./assignment#finish-and-release) ist. Teilnehmende sehen ihre Rolle erst nach der Freigabe.
- **Beitragszahlung**, **Teilnahmebedingungen**, **Einwilligung der Erziehungsberechtigten** und **Fotostatus** (die Einwilligung Bildnutzung) stehen auf **Erledigt**, **Ausstehend** oder **Problem**. Für Volljährige zeigt die Einwilligung der Erziehungsberechtigten **Nicht erforderlich**.
- **Postalische Anmeldung** fasst die Unterlagen zusammen: **Problem**, sobald eine davon ein Problem hat, **Erledigt**, wenn Teilnahmebedingungen, Bildnutzung und bei Minderjährigen die Einwilligung der Erziehungsberechtigten erledigt sind, sonst **Ausstehend**.
- **Offene Probleme** markiert zugelassene Personen außerhalb des Teams, bei denen Beitragszahlung oder postalische Anmeldung noch nicht erledigt ist.
- **Auf der Warteliste seit** und **Von der Warteliste nachgerückt am** zeigen, wann die Person sich eingetragen und wann sie von der Warteliste einen Platz bekommen hat.
- **Teilnahmen** zählt, wie oft die Person in irgendeiner Konferenz einen Platz hatte.

Bei Teammitgliedern bleiben Stadt, Land, Geschlecht und Ernährungsweise leer, außer für die **Projektleitung**.

### Ansichten

Vor der **Vorbereitung** zeigt die Tabelle alle, ab der Vorbereitung nur noch die zugelassenen Personen, sortiert nach Nachname. Zwei geteilte Ansichten bringt DELEGATOR mit:

- **Warteliste**: alle, die noch auf einen Platz warten, in der Reihenfolge, in der sie sich eingetragen haben.
- **Offene Probleme**: zugelassene Personen, deren Zahlung oder Unterlagen noch nicht vollständig sind.

### Auswahl und Export

Mit den Kästchen am Zeilenanfang wählst du Zeilen aus. Über der Tabelle steht dann **3 ausgewählt** mit dem Hinweis **Der Export enthält nur die Auswahl.**, und **Auswahl aufheben** leert die Auswahl. Weitere Sammelaktionen gibt es nicht. **Exportieren** lädt die sichtbaren Spalten als **CSV** oder **JSON** herunter oder öffnet **Drucken**. Ohne Auswahl enthält der Export alle Zeilen, auf die Suche und Filter passen, nicht nur die aktuelle Seite.

Ein Klick auf eine Zeile öffnet die [Teilnehmendenkarte](#user-card) der Person.

## Die Teilnehmendenkarte {#user-card}

Die Teilnehmendenkarte bündelt alles, was die Konferenz über eine Person weiß. Sie öffnet sich als Seitenleiste, wenn du in der Teilnehmendentabelle, der Warteliste, auf der Seite **Plätze**, auf der Seite einer Schule oder in der Befehlspalette (Strg+K) auf eine Person klickst. Die Adresse im Browser enthält dann die Person, ein kopierter Link öffnet also dieselbe Karte. **In neuem Tab öffnen** zeigt die Karte als eigene Seite **Teilnehmendenkartei**.

Gehört die Person nicht zur angezeigten Konferenz, steht oben ein Hinweis, dass die Daten zu ihrem Konto gehören und nicht zu dieser Konferenz.

### Kopf der Karte

Oben stehen Name, Pronomen und ein Abzeichen, wie weit die Person gekommen ist: **Warteliste**, **Angemeldet, nicht beworben**, **Beworben**, **Kein Platz erhalten**, **Platz erhalten** oder **Teilgenommen**. Darunter siehst du ihre Rolle in der Konferenz und ihre E-Mail-Adresse und Telefonnummer zum Schreiben, Anrufen oder Kopieren.

- **Mögliches Doppelkonto** und **Bestätigtes Doppelkonto** führen zur Seite [Plausibilität](./maintenance#duplicates), auf der ihr entscheidet, ob zwei Konten derselben Person gehören.
- Die Statusleiste zeigt **Beitragszahlung**, **Verbindliche Anmeldung**, bei Minderjährigen die **Einwilligung der Erziehungsberechtigten**, die **Einwilligung Bildnutzung**, den Zugangsausweis und die **Anwesenheit**. Ein Klick öffnet den Reiter, in dem du den Wert änderst.
- **Globale Notizen** stehen gelb hervorgehoben im Kopf, damit sie niemand übersieht. Notizen auf Konten, die als dieselbe Person bestätigt sind, erscheinen darunter als **Notiz auf dem verknüpften Konto (…)**.

Rechts oben findest du die Aktionen:

- **Namensschild generieren** (nur wenn die Person etwas hat, das auf einem Namensschild steht) öffnet **Namensschild und Länderschild**: **Vorausgefüllt im Badge-Generator öffnen** oder **CSV herunterladen**.
- **Stellvertretung** meldet dich als diese Person an, wenn du das darfst. Mehr dazu unter [Stellvertretung](./overview#impersonation).
- Unter **Weitere Aktionen**: **Notizen bearbeiten**, **User-ID kopieren** und **Teilnehmende\*n entfernen** (siehe [Teilnahme entfernen](#removing-a-participation)).

:::note Globale Notizen
Notizen gehören zum Konto, nicht zur Konferenz. Sie sind in allen Konferenzen da, in denen die Person später mitmacht. Lesen und schreiben darf sie nur die Teilnehmendenbetreuung und Projektleitung einer Konferenz, in der die Person angemeldet ist oder wartet. Die Person selbst sieht sie nie, und Notizen über Mitglieder des Teams liest niemand aus dem Team. Schreib zu jeder Notiz Datum, Konferenz und wer sie verfasst hat.
:::

### Die Reiter

Welche Reiter eine Karte hat, hängt davon ab, wie die Person dabei ist. Die Karte öffnet vor und in der Bewerbungsphase auf **Bewerbung**, in der Vorbereitung auf **Formalitäten** und während und nach der Konferenz auf **Zugang & Anwesenheit**. Wechselst du zu einer anderen Person, bleibt der Reiter offen, den du zuletzt gewählt hast, wenn sie ihn auch hat.

| Reiter                     | Wann er erscheint                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Person**                 | immer                                                                                   |
| **Bewerbung**              | bei einer Anmeldung oder einem Eintrag auf der Warteliste                               |
| **Platz**                  | bei einer Anmeldung oder einer Rolle im Team                                            |
| **Formalitäten**           | sobald die Person einen Teilnahmestatus hat                                             |
| **Zugang & Anwesenheit**   | mit Teilnahmestatus und Platz (Betreuende: sobald eine betreute Person einen Platz hat) |
| **Umfragen**, **Kalender** | mit Platz, nicht im Team                                                                |
| **Papiere**                | bei Delegationsmitgliedern                                                              |
| **Konferenzen**            | immer                                                                                   |

#### Person

**Bürgerlicher Name**, **Persönliche Daten** (Geburtsdatum, Geschlecht, Pronomen, Ernährungsweise) und **Kontakt** (E-Mail, Telefonnummer, Adresse, Notfallkontakte), jeweils mit einem Knopf zum Kopieren. Darunter stehen die **Schule der Person** und das **Konto**: **Anmeldename**, **Sprache der E-Mails**, **Konto angelegt** und die **Newsletter**, die die Person abonniert hat.

Die Angaben der Person ändert nur sie selbst in ihrem Konto. **Bearbeiten** siehst du nur auf deiner eigenen Karte oder als Administrator\*in. Die E-Mail-Adresse kommt vom Anmeldekonto und lässt sich hier nicht ändern. Namen und Geburtsdatum korrigiert die Teilnehmendenbetreuung beim Einlass im [Scanner](./formalities#scanner).

**Schule ändern** neben der Schule wählt eine bestehende Schule, trägt eine neue ein oder entfernt sie. Das ist die Schule dieser Person in dieser Konferenz. Sie zählt in den Zahlen pro Schule und in den [Schulregeln](./assignment) der Zuteilung. Der Name der Schule führt zu [ihrer Seite](#schools).

#### Bewerbung

Was die Person eingereicht hat und was das Team daraus gemacht hat:

- Bei einem Delegationsmitglied die Delegation mit Eintrittscode, den **Schulen der Mitglieder**, der Liste **Beworbene Rollen** sowie **Motivation** und **Erfahrung**. Die Aktionen dazu stehen unter [Delegationen](#delegations).
- Bei Einzelteilnehmenden die beworbenen Rollen und Texte und, in der Bewerbungsphase, **Bewerbungsstatus zurücksetzen**.
- Bei Betreuenden der **Verbindungscode** (siehe [Betreuende](#supervisors)).
- Die **Sichtung**: Sterne, Markierungen und Notiz aus der [Sichtung](./assignment#sighting), nur zum Ansehen. Der Knopf **Sichtung** öffnet die Bewerbung dort.
- Der Eintrag auf der **Warteliste**: seit wann, mit welcher Schule, Motivation, Erfahrung und **Wünsche**. Wartet die Person noch, führt **Platz zuweisen** zur Seite **Plätze** (siehe [Einen Platz von der Warteliste vergeben](#seating-from-the-waiting-list)).

#### Platz

Was die Person in der Konferenz hat: die Rolle ihrer Delegation und ihr Gremium, ihre Einzelrolle, die Personen, die sie betreut, oder ihre Rolle im Team. Bei Delegationsmitgliedern und Einzelteilnehmenden stehen hier außerdem ihre **Betreuer\*innen**. Die Aktionen beschreiben die Abschnitte [Delegationen](#delegations) und [Betreuende](#supervisors).

#### Formalitäten

Alles, was vor der Konferenz erledigt sein muss. Wie Zahlungen und die postalische Anmeldung ablaufen, steht unter [Zahlungen](./formalities#payments) und [Postalische Anmeldung](./formalities#postal-registration).

- **Beitragszahlung**: der Status (**Ausstehend**, **Problem**, **Erledigt**) und die **Zahlungsreferenzen** der Person, auch wer für sie bezahlt hat.
- **Unterlagen**: **Verbindliche Anmeldung**, **Einwilligung der Erziehungsberechtigten** (nur bei Minderjährigen am ersten Konferenztag, nie bei Betreuenden), **Einwilligung Bildnutzung**, je mit **Ausstehend**, **Problem** oder **Erledigt**, dazu der **Fotostatus** (**Noch nicht festgelegt**, **Keine Fotos erlaubt**, **Teilweise erlaubt – Einwilligung im Einzelnen prüfen**, **Fotos uneingeschränkt erlaubt**) und die **Dokumentennummer** der Unterlagen. **Nächste Nummer speichern** vergibt die Nummer nach der höchsten der Konferenz. **Dokumente für postalische Anmeldung herunterladen** erzeugt die Unterlagen der Person als PDF.
- **Teilnahmezertifikat** mit **Zertifikat herunterladen**.
- **E-Mails zum Verschicken** und **E-Mails** (siehe unten).

:::warning Status ändern macht E-Mails fällig
Ist die Zuteilung freigegeben und hat die Person einen Platz, macht ein Status E-Mails fällig: **Erledigt** bei der Zahlung die Bestätigung des Zahlungseingangs, vollständige Unterlagen die Bestätigung der postalischen Anmeldung, und **Problem** bei Zahlung, Teilnahmebedingungen, Bildnutzung oder Einwilligung der Erziehungsberechtigten je eine E-Mail zu diesem Problem. Sie gehen beim nächsten automatischen Lauf raus, wenn diese Art auf **Automatisch verschicken** steht. Sonst warten sie auf der Seite [E-Mails](./communication#emails) und hier in der Karte.
:::

**E-Mails zum Verschicken** zeigt der Teilnehmendenbetreuung, was die Person gerade bekommen sollte, mit **Wird automatisch verschickt** oder **Ausgeschaltet** und wann sie zuletzt verschickt wurde. **Verschicken** (bzw. **Erneut verschicken**) fragt **Diese E-Mail verschicken?** und schickt sie sofort, in der Sprache der Person und mit dem Text der Konferenz. Das hilft, wenn eine E-Mail ausgeschaltet ist, nicht angekommen ist, oder eine Erinnerung schon früher rausgehen soll. Eine von Hand verschickte E-Mail gilt als verschickt, nur eine Erinnerung geht zu ihrem Termin trotzdem noch automatisch raus. **E-Mails** darunter listet jede E-Mail, die die Konferenz der Person geschickt hat oder schicken wollte, auch fehlgeschlagene.

#### Zugang & Anwesenheit

- **Anwesenheit**: **Anwesend** oder **Abwesend**. Nach der Konferenz bekommt nur, wer anwesend war, ein Zertifikat, und erst dann wird die E-Mail zum Zertifikat fällig.
- **Zugangsausweis-Nr.**: die Nummer des Zugangsausweises, gespeichert mit **Speichern** (Diskettensymbol). Trägt schon eine andere Person diese Nummer, lehnt DELEGATOR ab.
- **Ausweis gefunden** schickt der Person nach **Benachrichtigung senden?** sofort eine E-Mail, dass ihr Zugangsausweis bei der Teilnehmendenbetreuung auf sie wartet. Jede Bestätigung schickt sie erneut.
- **NSA-Karte** (nur bei Mitgliedern eines nichtstaatlichen Akteurs): **Drucken** erzeugt die Karte mit ihrer aktuellen Nummer. **Neue Karte** und dann **Frühere Karten ungültig machen** ist für eine verlorene Karte: Die neue bekommt die nächste Nummer, frühere Karten lassen sich nicht mehr scannen.
- **Anwesenheitsprotokoll**: jeder Scan der Person mit Check-in, Zeit und wer gescannt hat. **Anwesenheitseintrag löschen** entfernt einen Scan. Mehr dazu unter [Check-in](./formalities#check-in).

#### Umfragen, Kalender, Papiere

- **Umfragen**: die Antworten der Person auf die [Umfragen](./communication#surveys). Du kannst für sie antworten oder mit **Antwort zurückziehen** die Antwort löschen. Die Teilnehmendenbetreuung darf dabei auch volle Optionen wählen und nach der Frist antworten.
- **Kalender**: der Zeitplan, wie die Person ihn sieht, mit den Terminen ihrer Umfrageauswahl.
- **Papiere**: die Papiere der Person mit **Versionen** und **Bewertungen**, und **Zum Papier-Hub** (siehe [Papier-Hub](./paper-hub)).

#### Konferenzen

Alle anderen Konferenzen, in denen die Person dabei war, mit Rolle und Zeitraum. Konten, die als dieselbe Person bestätigt sind, bringen ihre Konferenzen mit, gekennzeichnet mit **als …** und dem Namen des anderen Kontos. Der Name einer Konferenz öffnet die Karte der Person in dieser Konferenz.

### Teilnahme entfernen {#removing-a-participation}

**Teilnehmende\*n entfernen** unter **Weitere Aktionen** gibt es nur für Delegationsmitglieder, Einzelteilnehmende und Betreuende. Zur Bestätigung tippst du den vollständigen Namen ein, wie er im Fenster steht, und klickst **Unwiderruflich entfernen**.

DELEGATOR löscht dann die Delegationsmitgliedschaft, die Einzelanmeldung oder die Betreuung der Person in dieser Konferenz und ihren Teilnahmestatus mit allen Formalitäten. Nennen Papiere oder Zahlungen die Person, bleibt ihr Teilnahmestatus, damit diese Unterlagen ihr zugeordnet bleiben. Das Konto, die globalen Notizen und ein Eintrag auf der Warteliste bleiben.

:::warning Delegationsmitglieder lieber über die Delegation entfernen
**Teilnehmende\*n entfernen** bestimmt keine neue Delegationsleitung und löscht keine leere Delegation. Für Delegationsmitglieder nimm deshalb **Mitglied entfernen** im Reiter **Platz** (siehe [Delegationen](#delegations)).
:::

## Delegationen, Einzelteilnehmende und Betreuende {#delegations}

Eine Delegation hat keine eigene Karte. Du bearbeitest sie in der Karte eines ihrer Mitglieder, in den Reitern **Bewerbung** und **Platz**.

Im Reiter **Bewerbung**:

- **Eintrittscode** mit Knopf zum Kopieren. **Code erneuern** vergibt nach einer Rückfrage einen neuen Code, der alte funktioniert dann nicht mehr.
- **Beworbene Rollen**: Mit **Nach vorne** änderst du die Reihenfolge der Wünsche, mit **Löschen** entfernst du einen Wunsch.
- **Bewerbungsstatus zurücksetzen** (nur in der **Bewerbungsphase**) nimmt die abgeschlossene Bewerbung zurück. Die Delegation kann sie dann wieder ändern und neu abschließen.
- **Delegation löschen** löscht die Delegation nach einer Rückfrage mitsamt Mitgliedschaften, Rollenwünschen und Papieren. Die Teilnahmestatus der Mitglieder bleiben.

:::warning Delegation löschen
Das lässt sich nicht rückgängig machen. Alle Mitglieder verlieren ihre Anmeldung, und die Papiere der Delegation sind weg. Geht nur eine Person, entferne nur sie.
:::

Im Reiter **Platz**:

- Die Rolle der Delegation und das Gremium der Person, oder **Noch keine Zuteilung** mit **Bewerbung abgeschlossen** bzw. **Bewerbung noch nicht abgeschlossen**.
- **Gremienzuteilung** (nur bei Staaten): Für jedes Mitglied wählst du ein Gremium, in dem der Staat sitzt. Ist das Gremium für die Delegation schon voll, tauscht DELEGATOR: Das Mitglied, dessen Platz am längsten nicht geändert wurde, bekommt den Platz, den die Person verlässt. **Zurücksetzen** nimmt allen Mitgliedern ihr Gremium, **Fertig** schließt das Fenster.
- **Delegationsleiter\*in**: Wähle ein anderes Mitglied und klicke **Bestätigen**.
- **Delegationsmitglieder**: Mit **Mitglied entfernen** nimmst du eine Person aus der Delegation. War sie Delegationsleitung, übernimmt ein anderes Mitglied. Ist danach niemand mehr übrig, wird die Delegation gelöscht. Rollenwünsche, für die die Delegation nun zu klein ist, fallen weg.
- **Zur Betreuung machen**: Ist ein Mitglied am ersten Konferenztag zu alt für eine Delegation, aber alt genug, sie zu betreuen, zeigt die Karte einen Hinweis mit diesem Knopf. Die Person verlässt die Delegation (mit neuer Delegationsleitung bzw. Löschen einer leeren Delegation), wird als Betreuer\*in angemeldet, die selbst teilnimmt, und betreut alle übrigen Mitglieder. Wer sie bisher betreut hat, betreut sie danach nicht mehr.

Rolle und Gremium einer Delegation wechselst du auf der Seite [Plätze](#seats) oder in der [Zuteilung](./assignment).

### Einzelteilnehmende {#single-participants}

Im Reiter **Bewerbung** stehen die beworbenen Rollen und die Texte, in der Bewerbungsphase mit **Bewerbungsstatus zurücksetzen**. Im Reiter **Platz** steht die Einzelrolle oder **Noch keine Zuteilung**.

### Betreuende {#supervisors}

- Im Reiter **Bewerbung** steht der **Verbindungscode**, mit dem sich Schüler\*innen mit der Betreuung verbinden. **Code erneuern** vergibt einen neuen Code. Wer schon verbunden ist, bleibt verbunden.
- Im Reiter **Platz** schaltest du, ob die Person selbst zur Konferenz kommt (**Betreuer\*in plant eigene Anwesenheit**). Darunter stehen unter **Delegationen** die betreuten Delegationen mit Eintrittscode und Mitgliedern und unter **Einzelteilnehmende** die betreuten Einzelpersonen. **Betreuung entfernen** löst eine Verbindung nach einer Rückfrage.
- In der Karte einer Schülerin oder eines Schülers verbindest du im Reiter **Platz** mit **Betreuung hinzufügen** eine Betreuung: Suche sie in der Liste und klicke auf **+**. Betreuende und Teammitglieder lassen sich nicht betreuen.

Eine neue Verbindung macht zwei E-Mails fällig: an die Betreuung, wer dazugekommen ist, und an die Schülerin oder den Schüler, wer sie betreut. Ab dann sieht die Betreuung die Daten und den Stand der Person.

## Plätze vergeben und tauschen {#seats}

Die Seite **Plätze** zeigt alle Rollen der Konferenz mit ihren Plätzen: die Staaten mit einer Spalte pro Gremium, die nichtstaatlichen Akteure, die Einzelrollen unter **Einzelteilnehmer\*innen** und die **Betreuer\*innen**. Initialen stehen für eine Person auf einem Platz, ein Klick öffnet ihre Karte. Das Personensymbol **Delegationsmitglieder** am Ende einer Zeile zeigt die Mitglieder der Delegation, ihre Schulen und den Eintrittscode. Neue Rollen legst du in der [Sitzplanung](./configuration#seat-planning) an.

### Jemanden auf einen Platz setzen

1. Klicke auf einen freien Platz (**+**, Tooltip **Teilnehmer\*in hinzufügen**).
2. Gib im Fenster **Email oder UserID** ein oder einen Teil des Namens, und wähle die Person aus den Vorschlägen. **Bereits in dieser Konferenz** warnt, wenn sie schon dabei ist. Darunter siehst du, auf welchen Platz sie kommt.
3. Klicke **Teilnehmende\*n hinzufügen**.

Was dann passiert, hängt vom Platz ab:

- **Staat oder nichtstaatlicher Akteur**: Die Person kommt in die Delegation mit dieser Rolle, beim Staat in das gewählte Gremium. Gibt es die Delegation noch nicht, legt DELEGATOR sie an, und die Person wird Delegationsleitung. War die Person schon in einer Delegation oder als Einzelperson angemeldet, verliert sie diese Anmeldung vorher, eine Delegationsmitgliedschaft so, als hätte sie die Delegation verlassen. DELEGATOR lehnt ab, wenn die Rolle keinen Platz mehr hat (**Die Rolle hat keinen freien Platz mehr: Die Delegation mit dieser Rolle ist schon vollständig.**), wenn das Gremium für die Delegation voll ist (**Der Ausschuss hat für diese Delegation keinen freien Platz mehr.**) oder wenn die Person Betreuer\*in oder im Team ist.
- **Einzelrolle**: Die Person wird Einzelteilnehmer\*in mit dieser Rolle. Wer in der Konferenz schon irgendwie angemeldet ist, auch mit einer Bewerbung ohne Platz, wird abgelehnt (**Die Person hat in der Konferenz bereits eine andere Rolle und kann nicht als Einzelteilnehmer\*in eingetragen werden.**).
- **Betreuer\*in**: Die Person wird als Betreuung angemeldet. Im Fenster wählst du, ob sie selbst teilnimmt. Wer schon dabei ist, wird abgelehnt.

Steht die Person auf der Warteliste, bekommt ihr Eintrag das Datum, an dem sie den Platz bekam, und ihre Schule von der Warteliste wird ihre Schule in der Konferenz.

Ein gelber Platz mit Warnsymbol heißt: In der Delegation hat noch jemand kein Gremium. Eine gestrichelte Sanduhr (**Gremienzuteilung**) heißt: Die Delegation ist voll, aber ihre Gremien sind noch nicht verteilt.

### Plätze tauschen

1. Schalte oben **Plätze tauschen** ein.
2. Klicke auf eine Person in einer Delegation und dann auf eine andere Person (**Mit … tauschen**) oder auf einen freien Platz (**Hierher verschieben**).
3. Das Fenster zeigt, wer wohin geht. Ist eine Delegationsleitung betroffen, legst du unter **Delegationsleitung danach** fest, wer jede Delegation danach leitet.
4. Klicke **Bestätigen**.

Getauscht werden Delegation und Gremium. Die Person behält ihren Teilnahmestatus, ihre Betreuung und ihre Schule. Ist der Platz inzwischen besetzt, lehnt DELEGATOR ab (**Dieser Platz ist bereits besetzt.**), und du kannst es erneut versuchen. Tauschen geht nur zwischen Delegationsmitgliedern.

:::note Wer was sieht
Was du hier änderst, gilt sofort. Teilnehmende sehen Rolle und Gremium aber erst, wenn die Zuteilung [freigegeben](./assignment#finish-and-release) ist. Eine Änderung an einer einzelnen Person fragt nicht nach E-Mails. Was sie fällig macht, wartet auf der Seite [E-Mails](./communication#emails), in der Karte der Person oder auf den automatischen Versand.
:::

## Die Warteliste {#waiting-list}

Auf die Warteliste tragen sich Personen selbst ein, wenn die Konferenz in der **Vorbereitung** ist ([so sieht es für sie aus](../participant/registration#the-waiting-list)). Wer sich beworben hat, kann das erst, wenn die Zuteilung freigegeben ist und die Person keinen Platz bekommen hat. Wer einen Platz hat, kann sich nicht eintragen. Jede Person, die wartet, bekommt eine Bestätigung per E-Mail, sobald diese Art verschickt wird.

### Die Tabelle

Die Seite **Warteliste** zeigt anfangs alle, die noch warten und nicht verborgen sind, in der Reihenfolge, in der sie sich eingetragen haben. **Platz** ist ihre Position in dieser Reihenfolge. Verborgene und schon platzierte Einträge haben keine Position. Weitere Spalten sind **Zeitstempel** (wann eingetragen), **Platz erhalten am**, **Platz erhalten**, die Kontaktdaten, **Konferenzalter**, **Teilnahmen**, **Schule / Institution**, die Texte **Motivation**, **Erfahrung** und **Spezielle Wünsche** sowie **Versteckt**. Ein Klick auf eine Zeile öffnet die Karte der Person.

Am Ende jeder Zeile stehen drei Knöpfe:

- **Platz zuweisen** führt zur Seite **Plätze**, um der Person einen Platz zu geben.
- **Verbergen** bzw. **Anzeigen** nimmt den Eintrag aus der Liste, die ihr abarbeitet, oder holt ihn zurück. Die Person bleibt auf der Warteliste. Verbirg Einträge, die ihr vorerst nicht berücksichtigt, statt sie zu löschen.
- **Löschen** nimmt die Person nach **Bist du sicher?** von der Warteliste.

Verborgene und platzierte Einträge zeigt die Tabelle, wenn du die Filter **Versteckt** bzw. **Platz erhalten** änderst.

### Einen Platz von der Warteliste vergeben {#seating-from-the-waiting-list}

1. Klicke in der Warteliste bei der Person auf **Platz zuweisen** (oder in ihrer Karte im Reiter **Bewerbung**).
2. Die Seite **Plätze** öffnet sich mit dem Hinweis **Person zuweisen:** und dem Namen. Die **+** der freien Plätze sind hervorgehoben.
3. Klicke auf den freien Platz. Im Fenster ist die Person schon ausgewählt.
4. Klicke **Teilnehmende\*n hinzufügen**.

Danach:

- Der Eintrag auf der Warteliste bekommt das Datum (**Platz erhalten am**, in der Teilnehmendentabelle **Von der Warteliste nachgerückt am**) und verschwindet aus der Liste der Wartenden. Bekommt die Person später noch einmal einen anderen Platz, bleibt das erste Datum.
- Die Schule von der Warteliste wird die Schule der Person in der Konferenz.
- Eine frühere Bewerbung ohne Platz in einer Delegation oder als Einzelperson wird bei einem Delegationsplatz entfernt.
- Sobald die Zuteilung freigegeben ist, sieht die Person ihre Rolle, und die E-Mail **Von der Warteliste nachgerückt** wird statt der normalen Zusage fällig. Sie geht automatisch raus, wenn diese Art eingeschaltet ist, sonst schickst du sie auf der Seite [E-Mails](./communication#emails) oder in der Karte.

## Schulen {#schools}

Eine Schule gilt für alle Konferenzen. Jede Person nennt in jeder Konferenz ihre eigene Schule, auch innerhalb einer Delegation. Wer wartet, nennt sie auf der Warteliste. Delegationen haben keine eigene Schule, ihre Schulen sind die ihrer Mitglieder. Die Schule ist immer freiwillig.

### Die Schultabelle

Die Seite **Schulen** listet jede Schule aller Konferenzen, anfangs nach Teilnehmenden in dieser Konferenz sortiert. Für diese Konferenz zählt sie **Delegationen**, **Teilnehmende** (Delegationsmitglieder und Einzelteilnehmende), **Beworben**, **Mit Platz**, **Betreuer\*innen** und **Warteliste**, über alle Konferenzen **Konferenzen** und **Teilnehmende gesamt**. **Auslandsschule** zeigt, ob die Schule eine Auslandsschule ist. Ein Klick auf eine Zeile öffnet die Seite der Schule.

### Die Seite einer Schule

- **Kennzahlen**: wie viele Konferenzen, **Teilnehmende insgesamt**, **Zusagequote** und **Anwesenheitsquote**, und für jede Konferenz Delegationen, Teilnehmende, Beworben, Mit Platz, **Anwesend**, Betreuende, Warteliste und **Von der Warteliste**. Eine andere Konferenz kannst du öffnen, wenn du dort Teilnehmendenbetreuung oder Projektleitung bist.
- Die Angaben der Schule: Name, **Auslandsschule**, Adresse, **Ansprechperson** (etwa die betreuende Lehrkraft oder das Sekretariat) und **Notizen**. Notizen sieht nur das Team, auch bei späteren Konferenzen.
- **Personen in dieser Konferenz**: wer die Schule hier angibt, mit Teilnahmeart, Stand (**Bewerbung ausstehend**, **Beworben**, **Mit Platz**) und **Anwesend**. Ein Klick öffnet die Karte.

### Wer was darf

| Was                                                   | Wer                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Name, Ort und **Auslandsschule** lesen                | alle, denn Bewerbende wählen ihre Schule aus der Liste                                                         |
| Adresse, Ansprechperson, Notizen und Kennzahlen lesen | Teilnehmendenbetreuung und Projektleitung irgendeiner Konferenz                                                |
| Eine Schule ändern                                    | Teilnehmendenbetreuung und Projektleitung einer Konferenz, in der jemand die Schule angibt oder mit ihr wartet |
| Eine Schule löschen                                   | dieselben, solange niemand aus einer anderen Konferenz die Schule angibt                                       |

Darfst du eine Schule nur ansehen, steht über dem Formular ein Hinweis, und die Felder sind gesperrt.

### Auslandsschulen

Personen einer Auslandsschule können vor der regulären Zuteilung einen garantierten Platz bekommen. Gezählt werden die Personen in Bewerbungen, die in der [Sichtung](./assignment#sighting) mit **Muss einen Platz bekommen** markiert sind. Die Konferenz begrenzt das pro Auslandsschule und für alle Auslandsschulen zusammen ([Grenzen der Schulregeln](./configuration#stages)). Die Zuteilung warnt, wenn ein Entwurf die Grenzen überschreitet, und blockiert nichts.

### Doppelte Schulen zusammenführen und löschen

Dieselbe Schule unter zwei Schreibweisen führst du auf der Seite [Aufräumen](./maintenance#cleanup) zusammen. Dabei bekommen alle Personen und Wartelisteneinträge **aller** Konferenzen, die eine der Schulen nennen, die zusammengeführte Schule. Leere Angaben wie Adresse oder Ansprechperson füllt DELEGATOR aus den anderen Schulen, die Notizen aller Schulen werden aneinandergehängt, und war eine davon Auslandsschule, ist es die zusammengeführte auch. Die anderen Schulen werden gelöscht. Du brauchst dafür das Recht, jede der Schulen zu ändern.

**Schule löschen** auf der Seite einer Schule ist für einen Tippfehler, den niemand braucht. Alle, die die Schule angegeben haben, stehen danach ohne Schule da.

:::warning Lieber zusammenführen als löschen
Löschen lässt sich nicht rückgängig machen, und die Personen verlieren ihre Schule. Ist es nur eine andere Schreibweise, führe die Schulen zusammen.
:::

## Typische Abläufe {#workflows}

### Jemand sagt kurz vor der Konferenz ab

1. Öffne die Karte der Person, die absagt.
2. Ist sie Delegationsmitglied, klicke im Reiter **Platz** bei ihr auf **Mitglied entfernen**. Eine neue Delegationsleitung wird bestimmt, eine leere Delegation gelöscht. Sonst nimm **Teilnehmende\*n entfernen** unter **Weitere Aktionen**.
3. Öffne die **Warteliste**. Die erste Zeile (**Platz** 1) wartet am längsten.
4. Lies in ihrer Karte Motivation und **Wünsche** und klicke **Platz zuweisen**.
5. Setze sie auf den frei gewordenen Platz, wie unter [Einen Platz von der Warteliste vergeben](#seating-from-the-waiting-list) beschrieben.
6. Schick ihr die E-Mail **Von der Warteliste nachgerückt**, wenn sie nicht automatisch rausgeht, und denke bei einer neuen Delegationsleitung an die [Gremienzuteilung](#delegations).

### Jemand wechselt die Delegation

1. Öffne die Seite **Plätze** und schalte **Plätze tauschen** ein.
2. Klicke auf die Person und dann auf die Person, mit der sie tauscht, oder auf einen freien Platz der neuen Delegation.
3. Lege unter **Delegationsleitung danach** fest, wer die Delegationen leitet, und klicke **Bestätigen**.

Teilnahmestatus, Betreuung und Schule bleiben bei der Person. Ohne **Plätze tauschen** geht es auch über den freien Platz und **Teilnehmende\*n hinzufügen**. Die alte Mitgliedschaft endet dann wie ein Austritt, mit neuer Delegationsleitung und dem Löschen einer leeren Delegation.

### Angaben einer Person korrigieren

- Name, Kontakt, Adresse, Ernährungsweise und Notfallkontakte ändert die Person selbst in ihrem Konto. Bitte sie darum. Administrator\*innen können sie auch in der Karte mit **Bearbeiten** ändern.
- Namen und Geburtsdatum korrigiert die Teilnehmendenbetreuung beim Einlass im [Scanner](./formalities#scanner).
- Die Schule änderst du im Reiter **Person** mit **Schule ändern**.
- Status und Unterlagen änderst du im Reiter **Formalitäten**. Denk daran, dass das [E-Mails fällig machen](#user-card) kann.

### Einer Betreuung fehlen Schüler\*innen

1. Öffne die Karte der Betreuung. Im Reiter **Platz** stehen die Delegationen und Einzelteilnehmenden, die sie schon betreut.
2. Fehlt jemand, schick der Betreuung ihren **Verbindungscode** aus dem Reiter **Bewerbung**, damit die Schüler\*innen sich selbst verbinden.
3. Oder öffne die Karte der Schülerin oder des Schülers, klicke im Reiter **Platz** auf **Betreuung hinzufügen** und wähle die Betreuung mit **+**.
4. Prüfe in der Karte der Betreuung, dass alle dort stehen.

Bei einer Delegation verbindest du jedes Mitglied einzeln. Jede Verbindung macht die beiden E-Mails an Betreuung und Schüler\*in fällig.
