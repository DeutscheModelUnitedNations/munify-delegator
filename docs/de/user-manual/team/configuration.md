---
title: Konferenz einrichten
description: Einstellungen, Phasen, Dokumente, E-Mails, Gremien und Sitzplanung einer Konferenz
---

# Konferenz einrichten

Diese Seite zeigt, wie das Konferenzteam eine Konferenz aufsetzt und pflegt: von der neuen Konferenz über die Einstellungen und Phasen bis zu Gremien und Sitzplanung. Wie die Plätze danach an Delegationen und Einzelteilnehmende gehen, steht unter [Zuteilung](./assignment).

## Der Team-Bereich {#the-team-area}

Alles, woran das Team einer Konferenz arbeitet, liegt in einem gemeinsamen Team-Bereich. Auf dem Dashboard der Konferenz führt die Karte **Team** hinein. Sie öffnet die erste Seite, die du öffnen darfst. Daneben stehen die Links, die die Konferenz hinterlegt hat (**Team-Wiki**, **Dienste**, **Inhaltliche Vorbereitung**), und der **Papier-Hub**, falls du ihn nutzen darfst.

Im Team-Bereich listet die Seitennavigation alle Seiten, die du mit deinen Rollen öffnen darfst, gruppiert nach **Team**, **Arbeitsabläufe**, **Kommunikation** und **Wartung**. Mit Strg+K (auf dem Mac ⌘+K) öffnest du die Befehlspalette und springst per Suchbegriff direkt zu einer Seite, etwa „Sitzplanung“ oder „E-Mails“.

Welche Seite du siehst, hängt nur von deinen Rollen in **dieser** Konferenz ab. Eine Seite, die du nicht öffnen darfst, fehlt in der Navigation und antwortet mit „kein Zugriff“. Administrator\*innen des Systems dürfen überall hinein.

## Wer was darf {#team-roles}

| Bereich                                                                                                       | Wer ihn ändern darf                                                |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Einstellungen** öffnen                                                                                      | **Projektleitung**, **Teilnehmendenbetreuung**, **Leitung Inhalt** |
| **Allgemeines**, **Überweisungsinformationen**, die Grenzen der Schulregeln                                   | **Projektleitung**                                                 |
| **Status & Funktionen**, **Links & Inhalte**, Postadresse, Vorlagen, Anordnung auf den Vorlagen, Resolutionen | **Projektleitung**, **Teilnehmendenbetreuung**, **Leitung Inhalt** |
| Gremien anlegen und löschen                                                                                   | **Projektleitung**                                                 |
| Gremien und Themen bearbeiten                                                                                 | **Projektleitung**, **Leitung Inhalt**                             |
| Seite **E-Mails**                                                                                             | **Projektleitung**, **Teilnehmendenbetreuung**                     |
| **Sitzplanung**                                                                                               | **Projektleitung**, **Leitung Inhalt**                             |

Wer die Einstellungen öffnen, aber einen Reiter nicht ändern darf, sieht ihn gesperrt und oben einen Hinweis, was er ändern kann. Die Teilnehmendenbetreuung sieht die Gremien nur zur Ansicht.

## Eine Konferenz anlegen {#creating-a-conference}

Neue Konferenzen legen nur Administrator\*innen an, mit **Konferenz anlegen** auf der Konferenzübersicht.

1. Die Konferenzleitung füllt die **Konferenzanfrage** aus und lädt das erzeugte JSON herunter.
2. Ein\*e Admin wählt die Datei auf der Seite **Konferenz erstellen** aus. Sie wird sofort geprüft, Fehler erscheinen mit der betroffenen Stelle.
3. Nach **Validierung erfolgreich** legt **Konferenz erstellen** die Konferenz an und öffnet ihr Dashboard.

Die Datei beschreibt die Eckdaten, die Gremien mit ihren Staaten, die nichtstaatlichen Akteure und die Einzelrollen. Sie muss nicht perfekt sein: Alles lässt sich danach in den Einstellungen und der Sitzplanung ändern. Ein Team bringt die Datei nicht mit. Die ersten Mitglieder lädt ein\*e Admin im **Teammanagement** ein.

## Die Einstellungen {#general-settings}

Die Seite **Einstellungen** bündelt die Konfiguration in Reitern: **Allgemeines**, **Gremien und Themen**, **Status & Funktionen**, **Links & Inhalte**, **Überweisungsinformationen**, **Dokumente & Vorlagen**. Jeder Reiter erklärt oben kurz, wofür er da ist.

![Die Konferenzeinstellungen mit ihren Reitern und dem Speichern-Knopf](shot:team/configuration)

### Speichern mit Vorschau {#saving}

Änderungen in den Reitern werden nicht sofort gespeichert. Ein Reiter mit ungespeicherten Änderungen trägt einen gelben Punkt, und der Knopf zeigt **Einstellungen speichern (3 Änderungen)**. Er öffnet **Speichern bestätigen** mit einer Liste aller Änderungen, alter und neuer Wert nebeneinander. Bei folgenden Änderungen warnt die Vorschau besonders:

- **Konferenzstatus**: Er steuert sofort, was alle sehen und nutzen können.
- Die Schalter unter **Funktionen**: Sie schalten eine Funktion für alle sofort frei oder sperren sie.
- Bankdaten und Beitrag: Sie stehen auf Zahlungsaufforderungen, die schon verschickt sind.
- Eine neue Vorlage ersetzt die bisher hinterlegte Datei.

Erst **Speichern** schreibt alles. Macht die Änderung E-Mails fällig (Zahlungen oder postalische Anmeldung freigeschaltet, Konferenz beendet, neue Zertifikatsvorlage), fragt die Seite danach **E-Mails jetzt verschicken?**. Mit **Später** findest du sie auf der Seite [E-Mails](#emails) wieder.

:::note Außerhalb des Formulars
Gremien, Resolutionen, die Anordnung auf den Vorlagen und die E-Mail-Texte speichern in ihren eigenen Fenstern sofort. Der Speichern-Knopf gilt für die Formularfelder.
:::

### Allgemeines

- **Basisdaten**: **Konferenzname**, **Voller Name**, **Ort**, **Website** und die **Konferenzsprache**. In dieser Sprache werden die Staaten auf den Namensschild-Tischen einsortiert und gedruckt, egal in welcher Sprache die Oberfläche der einzelnen Person läuft.
- **Bilder & Logos**: das **Konferenzbild**, das **Konferenz-Emblem** (eine SVG-Datei für Resolutionen, sonst das UN-Emblem) und das **Konferenz-Logo** für den Kopf des Dashboards (sonst das Emblem).
- **Zeitplan**: **Ende der Bewerbungsphase**, der **Bewerbungsfrist Kulanzzeitraum (in Minuten)**, **Konferenz-Startdatum**, **Konferenz-Enddatum** und die **Zeitzone der Konferenz**, nach der der Kalender die „Jetzt“-Markierung setzt.

Teilnehmende sehen nur das Ende der Bewerbungsphase. Der Kulanzzeitraum ist ein Puffer für alle, die gerade fertig werden: Erst danach nimmt DELEGATOR keine Bewerbung mehr an. Unter dem Feld steht, wann das in deiner Zeitzone ist.

### Links & Inhalte

Hier hinterlegst du den **Link zur inhaltlichen Vorbereitung**, den Teilnehmende auf ihrem Dashboard finden, und den **Team-Wiki Link** und **Dienste-Seite Link**, die nur das Team auf seinem Dashboard sieht. Ein leeres Feld blendet den Link aus.

### Überweisungsinformationen {#payment-details}

**Teilnahmebeitrag** und **Währung** sowie das Bankkonto mit **Kontoinhaber\*in**, **Name der Bank**, **IBAN** und **BIC**. Teilnehmende sehen diese Angaben, wenn sie [ihren Beitrag zahlen](../participant/dashboard#payment).

## Status und Phasen {#stages}

Im Reiter **Status & Funktionen** wählst du unter **Konferenzstatus** die Phase der Konferenz. Sie wechselt nie von selbst, sondern nur, wenn das Team sie ändert und speichert.

| Phase                   | Was sie bedeutet                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vor Bewerbungsstart** | Teilnehmende sehen nur Informationen und können sich noch nicht bewerben.                                                                                         |
| **Bewerbungsphase**     | Bewerbungen und Delegationen sind möglich, bis das Ende der Bewerbungsphase samt Kulanzzeitraum vorbei ist. Danach sichtet das Team die Bewerbungen.              |
| **Vorbereitung**        | Die Bewerbung ist geschlossen, die Teilnehmenden bereiten sich vor. Rollen sehen sie erst, wenn die Zuteilung [freigegeben](./assignment#finish-and-release) ist. |
| **Aktive Konferenz**    | Die Konferenz läuft, die Anwesenheit wird erfasst.                                                                                                                |
| **Nach der Konferenz**  | Zertifikate lassen sich herunterladen, ebenso die verabschiedeten Resolutionen.                                                                                   |

Unter **Funktionen** schaltest du einzelne Teile unabhängig von der Phase frei:

- **Zahlungen erlauben**: Teilnehmende sehen, [wie und wohin sie zahlen](../participant/dashboard#payment).
- **Postalische Anmeldungen erlauben**: Teilnehmende können ihre [postalische Anmeldung](../participant/dashboard#postal-registration) herunterladen.
- **Papier-Einreichung geöffnet**: Teilnehmende können Papiere zu den Themen ihrer Gremien einreichen.
- **Kalender für Teilnehmende anzeigen**: Teilnehmende sehen den [Zeitplan](../participant/dashboard#schedule). Das Team sieht ihn immer.

Im selben Reiter stehen die Grenzen der Schulregeln, die nur die Projektleitung ändern kann:

- **Gemeinsame Entscheidung bis Gruppengröße** (anfangs 16): Bis zu so vielen Bewerbenden einer Betreuungsperson von derselben Schule bekommen alle einen Platz oder niemand. Ist eine Person einer Delegation mit der Betreuungsperson verknüpft, zählen alle Mitglieder dieser Delegation von derselben Schule mit.
- **Garantierte Plätze pro Auslandsschule** (anfangs 12): So viele Personen einer Auslandsschule können höchstens einen garantierten Platz bekommen.
- **Garantierte Plätze aller Auslandsschulen (%)** (anfangs 20): Dieser Anteil aller Plätze der Konferenz kann höchstens als garantierte Plätze an Auslandsschulen zusammen gehen.

Die Zuteilung warnt, wenn ein Entwurf eine Regel verletzt, und blockiert nichts. Leer lassen schaltet eine Regel ab.

## Dokumente und Vorlagen {#documents}

Der Reiter **Dokumente & Vorlagen** hält alles, woraus DELEGATOR die Papiere der Teilnehmenden erzeugt.

- **Postalische Anmeldung**: die Postadresse, an die Teilnehmende ihre Unterlagen schicken (**Name**, **Straße und Hausnummer**, **ggf. Adresszusatz**, **Postleitzahl**, **Stadt**, **Land**). Sie steht als Empfängeradresse auf dem Vertrag.
- **Postversand-Vorlagen**: je eine PDF für **Verbindliche Anmeldung**, **Einwilligung der Erziehungsberechtigten**, **Einwilligung Bildnutzung** und **Teilnahmebedingungen**.
- **Teilnahmezertifikat**: die PDF, auf die die Zertifikate gedruckt werden.

Jede Vorlage hat eine eigene Karte, die zeigt, ob sie **Hinterlegt** ist, **Fehlt noch** oder **Wird beim Speichern hochgeladen**. Mit dem Auge siehst du die hinterlegte Datei an. Eine neu gewählte PDF wird erst mit **Einstellungen speichern** hochgeladen, danach kannst du sie platzieren und testen.

### Felder auf der Vorlage platzieren {#document-layouts}

Die Vorlagen enthalten keine Platzhalter. DELEGATOR schreibt die Angaben der Person auf die erste Seite der PDF, und wohin, legst du mit **Felder platzieren** fest. Das Fenster zeigt die Seite, auf der du jedes Feld an seine Stelle ziehst:

| Dokument                                    | Felder                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Teilnahmezertifikat**                     | **Name** (zentriert), **Check-in-Liste** mit den Check-ins, bei denen die Person war, **QR-Code** zur Echtheitsprüfung |
| **Verbindliche Anmeldung**                  | **Empfängeradresse**, **Name**, **Geburtsdatum**                                                                       |
| **Einwilligung der Erziehungsberechtigten** | **Name**, **Geburtsdatum**                                                                                             |
| **Einwilligung Bildnutzung**                | **Name**, **Geburtsdatum**, **Adresse**                                                                                |

Listen und Codes änderst du an ihrer Ecke unten rechts in der Größe, die Schriftgröße der Texte mit **Kleiner** und **Größer** unter der Seite. **Standard** setzt alles auf die Standardpositionen zurück, die auch gelten, solange du nichts platzierst. **Testdokument generieren** druckt ein Beispiel mit erfundenen Angaben schon mit der ungespeicherten Anordnung, **Speichern** übernimmt sie. Die Teilnahmebedingungen werden unverändert angehängt, dort wird nichts platziert.

:::tip Platz lassen
Lass auf deiner Vorlage an den Stellen der Felder Platz frei. **Testdokument** auf der Karte zeigt das Ergebnis mit erfundenen Angaben. Für die postalische Anmeldung braucht es dafür alle vier Vorlagen.
:::

### Verabschiedete Resolutionen {#resolutions}

Unter den Vorlagen lädst du im Abschnitt **Verabschiedete Resolutionen** die Resolutionen als PDF hoch, auf Wunsch einem Gremium zugeordnet (höchstens 10 MB je Datei). Teilnehmende laden sie nach dem Ende der Konferenz herunter. Sie werden sofort gespeichert, nicht erst mit dem Speichern-Knopf.

## E-Mails {#emails}

DELEGATOR schreibt Teilnehmenden, Betreuenden und dem Team zu wichtigen Schritten. Die Seite **E-Mails** im Team-Bereich unter **Kommunikation** (für die Teilnehmendenbetreuung und die Projektleitung) zeigt jede Art von E-Mail als Karte, gruppiert etwa nach **Ergebnis der Zuteilung**, **Warteliste**, **Erinnerungen** oder **Nach der Konferenz**. Jede Karte erklärt unter **Wann**, **An wen** und **Inhalt**, was sie tut, und zählt, wie viele gesendet, fehlgeschlagen oder übersprungen sind. Jede E-Mail geht an jede Person höchstens einmal.

- Steht auf einer Karte etwa **3 offen**, müssten drei Personen die E-Mail gerade bekommen. **Jetzt verschicken** schickt sie im Hintergrund ab, **Überspringen** markiert sie als übersprungen, und das lässt sich nicht rückgängig machen. Wer später dazukommt, bekommt sie weiterhin.
- **Automatisch verschicken** lässt eine Art regelmäßig von selbst rausgehen. Eine neue Konferenz verschickt nichts automatisch, bis du es einschaltest. Erfüllen schon Personen die Bedingung, fragt DELEGATOR, ob sie die E-Mail mit dem nächsten Lauf bekommen (**Automatisch an alle 3 verschicken**) oder nur künftige Fälle (**Nur künftige Fälle**).
- Die Schalter und die **Versandgeschwindigkeit** wirken erst mit dem Speichern-Knopf der Seite und stehen in dessen Vorschau, wie bei den Einstellungen.
- Karten mit **Wird von Hand verschickt** (die Team-Einladung, der gefundene Badge) haben keinen Schalter: Sie gehen raus, wenn jemand die Aktion auslöst.

### Texte und Fußzeile

**Text bearbeiten** öffnet den Text einer E-Mail mit **Betreff**, **Überschrift** und **Text**, je Sprache in einem eigenen Reiter, denn jede E-Mail geht in der Sprache der empfangenden Person raus. **Platzhalter** wie `{conference}` füllt DELEGATOR beim Versand. Anrede und Button kommen automatisch dazu. Daneben siehst du eine Vorschau mit erfundenen Angaben, an dich adressiert. Ein leeres Feld fällt auf den Standard zurück, **Standardtext** stellt ihn wieder her. Geänderte Arten tragen **Eigener Text**.

Die **Fußzeile aller E-Mails** steht unter jeder E-Mail der Konferenz, den automatischen und denen ans Team, etwa eine Signatur oder Kontaktdaten. Auch sie gibt es je Sprache. Leer gespeichert entfällt sie in dieser Sprache.

### Versandgeschwindigkeit

Viele Mail-Dienste nehmen nur eine begrenzte Zahl an E-Mails pro Sekunde an. Unter **Versandgeschwindigkeit** legst du **Höchstens E-Mails pro Sekunde** fest, woran sich „Jetzt verschicken“ und der automatische Versand halten. Leer heißt **Keine Begrenzung**.

Ganz unten zeigt das **Protokoll** die letzten 200 E-Mails der Konferenz, automatische und von Hand verschickte.

## Gremien und Sitze {#committees-and-seats}

Im Reiter **Gremien und Themen** verwaltest du die Gremien der Konferenz mit ihren Tagesordnungspunkten.

![Die Gremien einer Konferenz mit ihren Themen](shot:team/committees)

- **Gremium hinzufügen** legt ein Gremium mit **Name**, **Kürzel** und **Sitze pro Delegation** an.
- **Bearbeiten** ändert Name und Kürzel, die **Sitze pro Delegation** und die **Resolutions-Überschrift**, eine eigene Überschrift für Resolutionen, etwa für den richtigen Artikel („Der Sicherheitsrat“).
- **Tagesordnungspunkt hinzufügen** legt ein Thema mit **Titel** und **Teaser-Text** an. Zu den Themen reichen Delegationen ihre Papiere ein. Wer ein Thema mit Papieren löscht, löscht die Papiere mit und bestätigt das durch Eintippen des Titels.
- **Löschen** entfernt ein Gremium mit seinen Themen und allen Sitzen darin. Das geht nicht, solange Delegierte ihm zugeteilt oder Papiere eingereicht sind.

**Sitze pro Delegation** bestimmt, wie viele Delegierte einer Delegation in diesem Gremium sitzen. Werte unter der größten schon zugeteilten Gruppe werden abgelehnt. Welche Staaten in einem Gremium sitzen, legst du in der Sitzplanung fest.

## Sitzplanung {#seat-planning}

Die **Sitzplanung** verteilt die Sitze der Staaten und nichtstaatlichen Akteure auf die Gremien. Aus ihr ergibt sich, welche Rollen es gibt und wie groß die Delegation für jede ist. Sie hat drei Reiter: **Staaten**, **Nichtstaatliche Akteure** und **Einzelrollen**.

![Die Sitzplanungsmatrix mit Staaten als Zeilen, Gremien als Spalten und den Hinweisen daneben](shot:team/seat-planning)

### Staaten

Die Matrix listet alle UN-Mitgliedsstaaten als Zeilen und die Gremien als Spalten. Ein Klick in eine Zelle gibt dem Staat einen Sitz im Gremium oder nimmt ihn weg, die Meldung danach bietet **Rückgängig** an. Die Spalte **Σ** zeigt die Delegationsgröße: die Summe der Sitze pro Delegation über alle Gremien, in denen der Staat sitzt. Eine Größe 1 ist gelb markiert, weil eine Delegation aus einer Person unpraktisch ist.

Über der Matrix suchst du einen Staat (**Staat suchen**) und filterst nach **Regionalgruppe**, **Delegationsgröße** oder **Nur ohne Sitz**. Ein Klick auf einen Spaltenkopf sortiert. Zeigst du auf einen Staat, erscheinen Hauptstadt, Region, Regionalgruppe, Sprachen und Nachbarstaaten. Die letzte Zeile zählt die Sitze je Gremium.

### Nichtstaatliche Akteure und Einzelrollen

Unter **Nichtstaatliche Akteure** legst du Akteure mit **Name**, **Kürzel**, **Beschreibung**, **Icon** und **Plätze** an, also der Größe ihrer Delegation. Das Icon wählst du über den Knopf vor dem Feld aus den Phosphor-Icons aus, oder du gibst seinen Namen ein (etwa `tree`). Unter **Einzelrollen** legst du Rollen für Einzelteilnehmende an, etwa die Konferenzpresse. Hier bestimmen die **Plätze**, wie viele Personen die Rolle erhalten können, und **Vergeben** zählt, wie viele sie schon haben. Felder speichern, sobald du sie verlässt, das Plus in der letzten Zeile legt eine neue Rolle an. Eine Rolle, der noch jemand zugeteilt ist, lässt sich nicht löschen.

### Hinweise

Neben der Matrix sammelt die Spalte **Hinweise**, was auffällt:

- **Sitze je Gremium** und **Rollen je Delegationsgröße** zeigen die Größen im Überblick.
- **Größenlimits** markiert Rollen außerhalb einer **Min.** und **Max.** Delegationsgröße. Die Limits werden nur in deinem Browser gespeichert.
- Jede Delegation sollte zwischen mindestens drei Rollen genau ihrer Größe wählen können. Die Hinweise nennen Größen mit zu wenigen Rollen, Staaten, die einen Sitz daneben liegen, und Rollen mit nur einem Sitz.
- **Staaten ohne Sitz** zählt je Regionalgruppe die Staaten ohne Sitz. Ein Klick filtert die Matrix auf sie.
- **Regionale Ausgewogenheit** vergleicht jedes Gremium mit seiner **Vergleichsbasis** und schlägt vor, welchem Staat ein Sitz gegeben oder genommen werden kann. Als Vergleichsbasis wählst du je Gremium **UN 193** (Standard), **Menschenrechtsrat**, **ECOSOC**, **Sicherheitsrat** oder **Manuell** mit eigenen Zielwerten.

:::warning Nach Bewerbungsstart
Sobald die Konferenz nicht mehr **Vor Bewerbungsstart** ist, zeigt die Seite **Die Bewerbungsphase hat bereits begonnen**. Jede Änderung ist sofort gespeichert und öffentlich sichtbar. Bewerbungen auf Rollen, die danach nicht mehr zur Größe der Delegation passen, werden entfernt. Sitze, denen schon Delegierte zugeteilt sind, sind gesperrt und zeigen ein Schloss.
:::
