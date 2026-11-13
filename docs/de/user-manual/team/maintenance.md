---
title: Statistiken und Wartung
description: Statistiken, Plausibilitätsprüfung, mögliche Doppelkonten, Aufräumen, Helfer, Import und Downloads im Team-Bereich
---

# Statistiken und Wartung

Diese Seite beschreibt die Werkzeuge, mit denen das Team den Zustand einer Konferenz überblickt und ihre Daten pflegt. Die **Statistiken** stehen oben in der Navigation und sind für jedes Teammitglied offen. **Plausibilität**, **Aufräumen**, **Helfer**, **Import** und **Downloads** stehen unter **Wartung** und öffnen nur die **Projektleitung** und die **Teilnehmendenbetreuung** (und Administrator\*innen des Systems). Der **KI-Zugang** steht ebenfalls unter **Wartung** und hat eine [eigene Seite](./ai-access).

## Statistiken {#statistics}

Die Seite **Statistiken** zeigt Zahlen und Diagramme über die ganze Konferenz. Keine Zahl nennt eine Person.

### Wie aktuell die Zahlen sind

Die Zahlen werden nicht bei jedem Aufruf neu berechnet. Der Server rechnet sie regelmäßig im Hintergrund neu, unter dem Filter steht, von wann sie sind (**Stand … Uhr, wird alle 5 Minuten aktualisiert**). Was du gerade geändert hast, erscheint also erst nach der nächsten Aktualisierung. Neu laden hilft nicht früher. Bleibt die Uhrzeit stehen, läuft die Aktualisierung auf dem Server nicht. Wende dich dann an die Administration.

### Der Filter

Oben links wählst du unter **Filter**, welche Anmeldungen ein Großteil der Karten zählt:

- **Alle**: jede Anmeldung, beworben oder nicht.
- **Beworben** und **Nicht beworben**: nur Anmeldungen, die ihre Bewerbung abgeschickt haben, oder nur die anderen.
- **Angenommen**: Beworbene mit einer Rolle. Ein Delegationsmitglied zählt mit der Rolle seiner Delegation, ein Staat oder ein nichtstaatlicher Akteur gilt beides als Rolle.
- **Abgelehnt**: Beworbene ohne Rolle. Bevor eine Zuteilung angewendet ist, sind das also alle Beworbenen.

Betreuer\*innen zählen nach den Personen, die sie betreuen: als beworben, wenn eine davon sich beworben hat, und mit Rolle, wenn eine beworbene davon eine Rolle hat. Der Filter merkt sich deine Wahl in diesem Browser.

Immer die ganze Konferenz zeigen, egal was der Filter sagt: **Betreuer\*innen-Übersicht**, **Warteliste**, **Post- & Zahlungsfortschritt**, **Gremien-Auslastung**, **Paper-Übersicht** und das Diagramm **Gremienzuweisung**.

### Die Karten

- **Tage bis zur Konferenz** und **Tage bis Bewerbungsschluss**: gezählt bis zum Konferenzbeginn und bis zum Ende der Bewerbungsphase, ohne Kulanzzeitraum.
- **Bewerbungen gesamt**: alle Anmeldungen samt Betreuer\*innen, dazu **Beworben**, **Angenommen**, **Abgelehnt** und **Nicht beworben**.
- **Rollenübersicht**: wie viele Personen **Mit Rolle** und **Ohne Rolle** sind und wie viele Delegationen eine Rolle haben (**Delegationen zugewiesen**), getrennt nach **Delegationsmitglieder** und **Einzelteilnehmende**. **Gremienzuweisung** zählt Mitglieder beworbener Staatendelegationen **Mit Gremium** und **Ohne Gremium**. Nichtstaatliche Akteure fehlen dort, da nur Staaten Sitze in Gremien haben.
- **Betreuer\*innen-Übersicht**: Eine Betreuungsperson gilt als **Angenommen**, sobald eine betreute Person eine Rolle hat. **Plant Anwesenheit** heißt, dass sie selbst zur Konferenz kommen will. Die **Detaillierte Aufschlüsselung** kombiniert beides.
- **Warteliste**: Einträge insgesamt, davon **Zugewiesen** (mit Platz) und **Nicht zugewiesen**, dazu **Sichtbar** und **Versteckt**.
- **Teilnehmerverteilung**: Delegationsmitglieder, Einzelteilnehmende und Betreuer\*innen.
- **Einzelteilnehmer\*innen**: für jede Einzelrolle, wie viele sich auf sie beworben haben. Gezählt werden die Wünsche, nicht die zugeteilten Rollen.
- **Post- & Zahlungsfortschritt**: der Stand der [postalischen Anmeldung](./formalities#postal-registration) und der [Beitragszahlung](./formalities#payments) als **Erledigt**, **Ausstehend** und **Problem**. Gezählt werden alle, die beides erledigen sollen: Delegationsmitglieder und Einzelteilnehmende mit Rolle und Betreuer\*innen, die selbst kommen. Wer noch gar keinen Status hat, zählt als ausstehend. Die **Abschlussübersicht** zeigt, wer **Keines**, **Nur Post**, **Nur Zahlung** oder **Beides** erledigt hat.
- **Gremien-Auslastung**: je Gremium die Sitze (Staaten mal Sitze pro Delegation) und wie viele davon Mitglieder beworbener Delegationen innehaben.
- **Paper-Übersicht**: alle Papiere nach Typ, Status und Gremium, und wie viele **Mit Feedback** und **Ohne Feedback** sind. Die Karte fehlt, solange es keine Papiere gibt.
- **Bewerbungsverlauf**: die Anmeldungen aufsummiert Tag für Tag. Die Mitglieder einer Delegation zählen an dem Tag, an dem die Delegation angelegt wurde.
- **Altersverteilung** und **Altersdurchschnitt nach Gremium**: das Alter am Ende der Konferenz. Wer kein Geburtsdatum hinterlegt hat, fehlt im Diagramm. Ein Hinweis darüber nennt, wie viele das sind.
- **Herkunftsverteilung**: das Land der Anschrift, nicht die Staatsangehörigkeit. Personen ohne Anschrift fehlen. Das Kreisdiagramm zeigt die zehn häufigsten Länder und fasst den Rest als **Sonstige** zusammen, das Balkendiagramm die 15 häufigsten.
- **Schulstatistik**: Delegationsmitglieder und Einzelteilnehmende nach ihrer eigenen Schule, als Balkendiagramm der 15 größten oder als Tabelle aller.
- **Ernährungsweise** und **Geschlecht**: je für Delegationsmitglieder, Einzelteilnehmer\*innen, Betreuer\*innen, die selbst kommen, und alle Teammitglieder. Die Teammitglieder zählen unabhängig vom Filter.
- **Geografische Verteilung**: eine Karte mit Markierungen je Postleitzahlbereich (die ersten drei Ziffern).

### Historienvergleich {#history}

Beim Öffnen der Seite speichert dein Browser einmal pro Tag einen Stand der wichtigsten Zahlen. Er bleibt auf deinem Gerät und geht nicht an den Server. Unter **Historienvergleich** wählst du einen früheren Tag. Einige Karten zeigen dann unter jeder Zahl den Wert von damals und die Veränderung seitdem. Auf einem anderen Gerät oder in einem anderen Browser beginnt die Historie leer.

## Plausibilität {#plausibility}

Die Seite **Plausibilität** listet Personen, bei denen etwas nicht zusammenpasst. Jede Prüfung steht in einem eigenen Kasten mit ihrer Regel und der Zahl der Funde. Ein Klick auf einen Namen öffnet die [Teilnehmendenkarte](./participants#user-card) der Person. Die Prüfungen laufen über alle, die sich in dieser Konferenz angemeldet haben, auch wenn sie sich noch nicht beworben haben. Keine Prüfung ändert etwas oder verschickt etwas: Was zu tun ist, entscheidest du.

### Altersgrenzen {#age-limits}

Oben steht, welche Altersgrenzen die Konferenz hat. Gesetzt werden sie in den [Einstellungen](./configuration) im Reiter **Allgemeines** unter **Altersgrenzen**: **Mindestalter Teilnehmende**, **Höchstalter Teilnehmende** und **Mindestalter Betreuende**. Gemessen wird am ersten Konferenztag, und eine leere Grenze schaltet ihre Prüfung aus. Eine Prüfung, die die Grenzen ausschalten, fehlt auf der Seite.

:::note Was die Altersgrenzen bewirken
Wer außerhalb der Grenzen liegt, sieht beim Bewerben und auf dem Dashboard einen Hinweis und erscheint hier. Anmelden und einer Delegation beitreten kann die Person trotzdem. Eine Bewerbung lässt sich aber nicht abschicken, solange jemand darin außerhalb der Grenzen liegt, siehe [Altersgrenzen](./configuration#age-limits).
:::

- **Teilnehmende\*r zu jung**: Teilnehmende, die zu Konferenzbeginn jünger als das Mindestalter sind.
- **Teilnehmende\*r zu alt**: Teilnehmende über dem Höchstalter, die aber noch zu jung sind, um Betreuer\*in zu sein. Der Kasten fehlt, wenn es dieses Alter zwischen beiden Grenzen nicht gibt.
- **Sollte Betreuer\*in sein**: Teilnehmende über dem Höchstalter, die alt genug zum Betreuen sind.
- **Sollte kein\*e Betreuer\*in sein**: Betreuende, die jünger als das Mindestalter für Betreuende sind.

### Unvollständige oder ungültige Daten {#incomplete-data}

**Unvollständige oder ungültige Daten** listet Teilnehmende und Betreuende, deren Profil das Konto-Formular nicht mehr erfüllt: Eine Pflichtangabe fehlt oder ist ungültig. Bei ihrer nächsten Anmeldung schickt DELEGATOR diese Personen zuerst auf ihre Kontoseite, damit sie die Angaben ergänzen.

### Mögliche Doppelkonten {#duplicates}

Wer eine Betreuungsnotiz trägt und sich mit einem neuen Konto wieder anmeldet, ließe die Notiz sonst beim alten Konto zurück. Deshalb sucht DELEGATOR nach Konten, die zu derselben Person gehören könnten wie ein früheres Konto. Die Entscheidung trifft immer die Teilnehmendenbetreuung. Die betroffenen Personen erfahren davon nichts.

**Womit verglichen wird.** Verglichen werden die Personen dieser Konferenz mit allen, die an einer schon beendeten Konferenz teilgenommen haben oder eine Notiz tragen. Name, Geburtsdatum, E-Mail-Adresse, Telefonnummer, Notfallkontakt und Adresse tragen je einen Teil zur Übereinstimmung bei. Namen werden auch über verschiedene Schriften hinweg verglichen. Kein Merkmal reicht allein: Ein Paar erscheint erst ab 60 % Übereinstimmung. Ein Treffer ist ein Hinweis, kein Beweis, denn Geschwister und Zwillinge ähneln sich sehr.

**Wann gesucht wird.** Ändert eine Person ihr Profil oder ändert das Team es, vergleicht DELEGATOR dieses Konto im Hintergrund neu. Die ganze Konferenz prüfst du mit **Erneut prüfen**, am besten nach dem Ende der Bewerbungsphase und vor der [Sichtung](./assignment#sighting), damit die Notizen dort schon bei der richtigen Person stehen. Danach meldet die Seite, wie viele mögliche Doppelkonten sie hält. Eine neue Prüfung aktualisiert die Prozentwerte, ändert aber keine Entscheidung. Ein offenes Paar, das sie nicht mehr findet, verschwindet.

**Ein Paar prüfen.** Jedes Paar zeigt beide Konten nebeneinander: Name, Geburtsdatum, E-Mail-Adresse, Telefonnummer, Notfallkontakt, Adresse, **Konto seit**, die **Globale Notizen** und die Konferenzen, an denen jedes teilgenommen hat. Markiert sind die Zeilen, in denen sich die Konten ähneln, oben in der Ecke steht die Übereinstimmung in Prozent. Der Kasten **Mögliche Doppelkonten** weiter oben listet die offenen Paare, ein Klick springt zum Paar.

**Entscheiden.**

- **Gleiche Person** bestätigt das Paar. Es wandert unter **Bestätigt** und trägt ein rotes Verknüpfungssymbol.
- **Verschiedene Personen** verwirft das Paar. Es wandert unter **Verworfene Paare**, die zugeklappt am Ende stehen.
- **Wieder offen** nimmt eine Entscheidung zurück. Das Paar ist dann wieder offen, als hätte niemand entschieden.

**Was eine Bestätigung bewirkt.**

- Die Notizen folgen der Person: Die Teilnehmendenkarte zeigt oben neben der eigenen Notiz jede **Notiz auf dem verknüpften Konto**, und die Warnung in der [Sichtung](./assignment#sighting) zählt sie mit.
- Der Reiter **Konferenzen** der Teilnehmendenkarte listet auch die Konferenzen der verknüpften Konten, markiert mit dem Namen des anderen Kontos.
- Bestätigungen gelten weiter: Sind A und B dieselbe Person und B und C, dann auch A und C. DELEGATOR legt solche Paare selbst an und bestätigt sie. Sie tragen den Hinweis **Über andere bestätigte Konten verknüpft** und haben keine eigenen Knöpfe. Öffnest du eines der Paare, die jemand bestätigt hat, wieder oder verwirfst es, nimmt DELEGATOR die so entstandenen Paare zurück.
- Solange ein Paar offen oder bestätigt ist, darf die Teilnehmendenbetreuung Name und Notizen auch des anderen Kontos lesen, ohne dessen Kontaktdaten.

**Was Verwerfen bewirkt.** Nichts wird verknüpft. Die Namen bleiben auf der Seite sichtbar, damit du die Entscheidung zurücknehmen kannst, die Notiz des anderen Kontos aber nicht mehr.

:::warning Widersprüchliche Entscheidungen
Würde eine Bestätigung zwei Konten zu einer Person machen, deren Paar schon als verschiedene Personen verworfen ist, lehnt DELEGATOR sie ab: „A und B sind als verschiedene Personen markiert, wären mit dieser Bestätigung aber dieselbe. Öffne das Paar der beiden zuerst wieder.“ Prüfe dann, welche der beiden Entscheidungen falsch ist.
:::

## Aufräumen {#cleanup}

Auf der Seite **Aufräumen** vereinheitlichst du unter **Schulnamen vereinheitlichen** Schulen, die Bewerber\*innen unterschiedlich geschrieben haben. Erst danach zeigen Statistiken, Schulregeln und die Schulseiten richtig, wie viele Personen von einer Schule kommen. Räume am besten nach dem Ende der Bewerbungsphase und vor der [Zuteilung](./assignment) auf, damit die Schulregeln dort stimmen. Mehr über Schulen steht unter [Schulen](./participants#schools).

Die Tabelle listet jede Schule, die eine Person einer abgeschickten Bewerbung dieser Konferenz als eigene angegeben hat, mit **Delegationen**, **Delegationsmitglieder**, **Einzelteilnehmer\*innen** und **Gesamt**. Betreuende und die Warteliste zählen hier nicht.

### Vorschläge {#school-suggestions}

Beim Öffnen der Seite sucht DELEGATOR nach sehr ähnlichen Schulnamen, etwa mit anderer Schreibweise, Umlauten, Wortreihenfolge oder kleinen Tippfehlern. Gefundene Gruppen stehen über der Tabelle unter **Vorschläge**, die ähnlichsten zuerst. Mit den Pfeilen (oder den Pfeiltasten) blätterst du durch sie.

1. Wähle den Namen, der bleiben soll. Vorausgewählt ist der, den die meisten Teilnehmenden angegeben haben.
2. **Zu „Name“ zusammenführen** (Alt+Enter) führt die Gruppe in diese Schule zusammen.

**Ignorieren** blendet die Gruppe aus. Sie erscheint nicht wieder, solange sie aus denselben Schulen besteht. In der Oberfläche lässt sich das nicht zurücknehmen. **In Auswahl übernehmen** legt die Schulen der Gruppe in die Auswahl darunter, etwa um ihr einen neuen Namen zu geben.

### Von Hand zusammenführen {#merging-by-hand}

1. Klicke in der Tabelle die Schulen an, die zusammengehören. Sie erscheinen als Auswahl über der Tabelle. Ein Klick auf eine davon nimmt sie wieder heraus.
2. Gib unter **Neuer Schulname** den richtigen Namen ein. Bei einer einzelnen Schule ist ihr bisheriger Name vorausgefüllt.
3. **Ausgewählte Schulen vereinheitlichen** (Umschalt+Enter) führt sie zusammen. Bei nur einer Schule heißt der Knopf **Ausgewählte Schule umbenennen** und benennt sie um.

### Was das Zusammenführen bewirkt {#merge-consequences}

- Die Schule mit den meisten Teilnehmenden bleibt und bekommt den gewählten Namen. Die anderen werden gelöscht.
- Schulen gehören allen Konferenzen. Jede Person und jeder Wartelisteneintrag, die eine der gelöschten Schulen angegeben haben, nennen danach die bleibende, in **allen** Konferenzen.
- Was der bleibenden Schule fehlt (Adresse, Website, Kontakt), übernimmt sie von den anderen. Die Notizen aller werden aneinandergehängt. Ist eine der Schulen als Auslandsschule markiert, ist es danach die zusammengeführte.
- Umbenennen ändert den Namen ebenfalls für alle Konferenzen.

Zusammenführen kannst du nur Schulen, die du bearbeiten darfst, also Schulen der Personen deiner Konferenzen. Sonst meldet die Seite **Vereinheitlichen der Schulen fehlgeschlagen**.

:::warning Nicht rückgängig zu machen
Ein Zusammenführen lässt sich nicht zurücknehmen: Die gelöschten Schulen sind weg, und welche Person welche davon angegeben hatte, weiß DELEGATOR danach nicht mehr. Prüfe die Auswahl vorher.
:::

## Helfer {#helper}

Die Seite **Helfer** hat ein Werkzeug: **Anwesenheit aller Teilnehmenden umschalten**. **Alle auf "Abwesend" setzen** und **Alle auf "Anwesend" setzen** setzen die Anwesenheit aller, die in dieser Konferenz angemeldet sind (Delegationsmitglieder, Einzelteilnehmende und Betreuer\*innen), auf denselben Wert, egal was vorher eingetragen war. Vorher fragt die Seite nach einer Bestätigung.

Die Anwesenheit entscheidet, wer ein [Zertifikat](./formalities#certificates) bekommt. Ist die Konferenz beendet und das Zertifikat freigegeben, wird für alle, die als anwesend gelten, die E-Mail **Zertifikat verfügbar** fällig. Sie geht automatisch raus, wenn diese Art eingeschaltet ist, sonst wartet sie auf der Seite [E-Mails](./communication#emails).

:::warning Überschreibt jede einzelne Eintragung
Der Helfer gilt für alle Angemeldeten, auch für die ohne Rolle oder ohne abgeschickte Bewerbung, und ersetzt alles, was vorher eingetragen war. Ein Zurück gibt es nicht. Wer danach anders zählen soll, muss einzeln geändert werden, etwa über den [Import](#import).
:::

## Import {#import}

Auf der Seite **Import** übernimmst du unter **Präsenzdaten importieren** die Anwesenheit aus CHASE. CHASE erfasst während der Konferenz bei jeder Anwesenheitsfeststellung, wer im Gremium ist. Daraus setzt der Import hier, wer anwesend war, und damit, wer ein [Zertifikat](./formalities#certificates) bekommt.

### Woher die Daten kommen {#import-source}

- **Mit verbundener CHASE-Instanz** (siehe [CHASE-Verbindung](./overview#chase-link)) fragt die Seite beim Öffnen CHASE selbst. Ein Hinweis nennt, wann sie gelesen hat. **Neu lesen** fragt erneut. Hat CHASE noch nichts gemeldet oder ist es nicht erreichbar, steht das dort.
- **Ohne Verbindung** lädst du die JSON-Datei hoch, die CHASE auf seiner Statistikseite als Präsenzexport anbietet. Ist die Datei kein solcher Export, meldet die Seite **Die Datei ist kein Präsenzexport aus CHASE. Bitte lade sie in CHASE auf der Statistikseite erneut herunter.**
- Mit Verbindung steht der Datei-Upload unter **Aus einer Datei importieren**, etwa für eine Konferenz, die auf einer anderen CHASE-Instanz lief. Eine hochgeladene Datei hat Vorrang. Lade die Seite neu, um wieder die Daten aus CHASE zu sehen.

### Die Vorschau {#import-preview}

Die Seite teilt alle Personen aus CHASE in Anwesende und Abwesende, getrennt nach zwei Gruppen:

- **Delegierte** werden bei jeder Feststellung ihres Gremiums als anwesend oder abwesend erfasst. Als anwesend gilt, wer mindestens beim eingestellten **Schwellwert** (zu Beginn 20 %) der Feststellungen anwesend war. Delegierte ohne jede Feststellung erscheinen nicht.
- **Nichtstaatliche Akteure** werden nur beim Betreten eines Gremiums gescannt. Als anwesend gilt, wer die **Mindestanzahl Check-ins** (zu Beginn 3) erreicht, gleich in welchem Gremium. Wer nie gescannt wurde, steht mit 0 Check-ins unter den Abwesenden.

Schwellwert und Mindestanzahl verschieben die Personen sofort zwischen den Tabellen. Gespeichert wird dabei nichts. Ein Klick auf eine Zeile zeigt jede einzelne Erfassung der Person mit Zeit, Gremium und Status und öffnet über ihre E-Mail-Adresse die Teilnehmendentabelle.

### Speichern {#import-save}

Unter jeder Tabelle steht ein eigener Knopf **Speichern**. Er setzt nach einer Bestätigung alle Personen dieser Tabelle auf anwesend (unter **Anwesend**) oder abwesend (unter **Abwesend**). Personen werden über ihre E-Mail-Adresse gefunden. Wer in keiner Tabelle steht, bleibt unverändert. Eine E-Mail-Adresse ohne Konto in DELEGATOR lehnt DELEGATOR ab, die übrigen Zeilen werden trotzdem gespeichert.

Wie beim [Helfer](#helper) wird für alle, die danach als anwesend gelten, die E-Mail **Zertifikat verfügbar** fällig, sobald die Konferenz beendet und das Zertifikat freigegeben ist.

:::tip Alle zurücksetzen
Der Import ändert nur, wer in den Tabellen steht. Sollen vorher alle denselben Stand haben, setze sie zuerst mit dem [Helfer](#helper) zurück und importiere danach.
:::

## Downloads {#downloads}

Die Seite **Downloads** bündelt die Dateien, die das Team außerhalb von DELEGATOR braucht. Jede Datei entsteht in dem Moment, in dem du klickst, aus dem aktuellen Stand. Sie enthält, was du mit deinen Rollen lesen darfst, und das sind oft Namen und E-Mail-Adressen. Behandle die Dateien entsprechend.

### CSV-Einstellungen {#csv-settings}

Unter **CSV-Export-Einstellungen** wählst du **Trennzeichen** und **Zeichenkodierung** für die CSV-Dateien dieser Seite. Voreingestellt sind Semikolon und UTF-8. Für Excel empfiehlt die Seite UTF-8 mit BOM. Die Wahl merkt sich dein Browser. Die Dateien für den Badge-Generator nutzen immer Komma und UTF-8, da der Generator nur das liest.

### Namensschild-Daten {#badges}

**Namensschild-Daten** liefert CSV-Dateien für den Badge-Generator. Lade eine Datei herunter, öffne den Generator mit dem Pfeil daneben (**Badge-Generator öffnen**), lade die CSV dort hoch, wähle Namensschild oder Länderschild und drucke das PDF.

- **Je Gremium**: die Delegierten mit ihrem Staat und dem Kürzel des Gremiums.
- **Nichtstaatliche Akteure**, **Einzelteilnehmer\*innen** (mit zugeteilter Rolle) und **Teammitglieder**: Name und Rolle unter der UN-Flagge.
- **Betreuer\*innen**: nur, wer mindestens eine betreute Person mit Platz hat.
- **Länderschilder (alle Gremien)**: ein Schild für jeden Platz am Gremientisch, also jeden Staat des Gremiums und jeden nichtstaatlichen Akteur mit jemandem darin, ohne Namen. Nichtstaatliche Akteure ohne Gremium bekommen je ein Schild.

Jede Zeile eines Namensschilds trägt neben Name, Pronomen und Rolle die ID der Person und ihre Einwilligung zur Bildnutzung in dieser Konferenz. Sortiert ist nach Rolle, dann nach Nachname.

**NSA-Karten (PDF)** druckt für jedes Mitglied einer Delegation eines nichtstaatlichen Akteurs eine Karte im Format A6, vier auf einer A4-Seite mit Schnittlinien. Sie trägt Namen, Akteur und Symbol sowie einen signierten QR-Code, den der Scanner in CHASE prüft. Die Karte gilt bis zum Tag nach dem Konferenzende. Ein erneuter Download macht nichts ungültig und liefert dieselben Karten. Eine verlorene Karte ersetzt du einzeln in der Teilnehmendenkarte mit **Neue Karte**. Danach lassen sich die früheren Karten dieser Person nicht mehr scannen.

### Namensschilder nach Tischen {#badges-by-table}

Dieselben Namensschilder, aufgeteilt auf die Tische der [Anmeldung vor Ort](./formalities#check-in): eine Datei pro Tisch, sortiert wie das Tischschild. Die Aufteilung folgt der gespeicherten Anzahl der Namensschild-Gruppen, die du über **Aufteilung ansehen** findest. Teammitglieder fehlen hier, da sie ihr Namensschild nicht am Eingang abholen. Solange niemand einen Platz hat, gibt es keine Tische.

### Registrierungslisten {#registration-lists}

Vier CSV-Dateien, sortiert nach Rolle und Namen:

- **Delegationen**: Mitglieder von Staatendelegationen mit Land und Gremium.
- **Nichtstaatliche Akteure**: Mitglieder der Delegationen nichtstaatlicher Akteure.
- **Einzelteilnehmer\*innen**: mit zugeteilter Rolle.
- **Betreuer\*innen**: alle, mit der Spalte **Betreuer\*in plant eigene Anwesenheit**.

Die Spalten **Beitragszahlung**, **Teilnahmebedingungen**, **Einwilligung der Erziehungsberechtigten** und **Einwilligung Bildnutzung** sind leer, wenn alles erledigt ist, tragen `X`, solange etwas aussteht, und `P` bei einem Problem. Für Volljährige bleibt die Einwilligung der Erziehungsberechtigten leer. **Volljährig** zeigt `Y` oder `N`.

### Teilnehmendenstatus {#participant-status}

**Teilnehmendenstatus herunterladen** liefert eine CSV mit einer Zeile je Person mit Platz: Mitglieder von Staaten- und Akteursdelegationen, Einzelteilnehmende mit Rolle und Betreuer\*innen, die selbst kommen. Sie enthält ID, E-Mail-Adresse, Name, Rolle, Gremium, die Betreuer\*innen, jeden einzelnen Status der Formalitäten, die Einwilligung zur Bildnutzung, die Zahlung, die Anwesenheit und zwei Zusammenfassungen: den Stand der postalischen Unterlagen und welche von Post und Zahlung noch offen sind. Spaltennamen und Werte sind englisch.

### QR-Code für das digitale Namensschild {#nametag-qr}

**QR-Code herunterladen (PDF)** erzeugt einen Aushang für den Schalter der Teilnehmendenbetreuung. Der QR-Code öffnet die Seite **Digitales Namensschild** der Person, die ihn scannt. Wer am Schalter etwas klären möchte, zeigt es vor, und das Team kann die Person schnell und sicher zuordnen.

### Gremiendaten und Referenzdaten {#committee-data}

- **Gremiendaten**: je Gremium eine CSV der Delegierten mit Staat (Code und Name), Vor- und Nachname und E-Mail-Adresse.
- **Alle Nationen**: jeder Staat, der in einem Gremium der Konferenz sitzt, mit Alpha-2- und Alpha-3-Code, Namen und Regionalgruppe.

### Integrationsexporte {#integration-exports}

**CHASE Seed-Daten** ist eine JSON-Datei, mit der eine CHASE-Instanz die Konferenz einliest: Gremien und Themen, Staaten und nichtstaatliche Akteure, Delegierte, Einzelteilnehmende, Betreuer\*innen und das Team, jeweils mit Namen und E-Mail-Adresse. Ist CHASE verbunden, hält die Verbindung es ohnehin aktuell. Die Datei steht dann eingeklappt darunter und wird nur ohne Verbindung gebraucht.
