---
title: KI-Zugang
description: KI-Assistenten mit einer Konferenz arbeiten lassen, ohne dass personenbezogene Daten sie erreichen
---

# KI-Zugang

KI-Assistenten wie Claude oder ChatGPT werden ohnehin genutzt. Damit dafür niemand Teilnehmendenlisten herunterladen und in einen Chat kopieren muss, kann sich ein Assistent direkt mit DELEGATOR verbinden. Er arbeitet dann mit deinem Konto und darf genau das, was du darfst. Personenbezogene Daten erreichen ihn dabei nie.

Die Seite **KI-Zugang** im Team-Bereich (Gruppe **Wartung**) öffnen nur die **Projektleitung** und Administrator\*innen des Systems.

## Einschalten {#switching-on}

Der KI-Zugang ist für jede Konferenz zunächst aus. Die Projektleitung schaltet ihn auf der Seite **KI-Zugang** mit **KI-Assistenten für diese Konferenz zulassen** ein. Der Schalter wirkt sofort, ohne Speichern. Solange er aus ist, sieht kein Assistent etwas von dieser Konferenz, egal wer ihn verbindet. Schaltest du ihn aus, lehnt DELEGATOR von da an jeden Aufruf zu dieser Konferenz ab.

Verbinden darf sich danach jedes Mitglied des Teams. Der Assistent handelt mit den Rollen der Person, die ihn verbunden hat: Wer nur die Teilnehmendenbetreuung innehat, kann über den Assistenten auch nur das, was die Teilnehmendenbetreuung darf (siehe [Wer was darf](./overview#team-roles)). Administrator\*innen des Systems zählen in jeder eingeschalteten Konferenz, als hätten sie jede Team-Rolle, auch wenn sie nicht im Team sind. Über eingeschaltete Konferenzen hinaus reicht ihr Assistent nicht.

## Einen Assistenten verbinden {#connecting}

Unter **Verbinden** steht die Adresse des MCP-Servers. Sie ist für alle Konferenzen dieselbe. Füge sie in deinem KI-Programm als MCP-Server hinzu (bei Claude etwa als eigenen Konnektor) und melde dich im folgenden Fenster mit deinem DELEGATOR-Konto an. Ein Assistent kann danach mit allen eingeschalteten Konferenzen arbeiten, in deren Team du bist. Frag ihn zuerst, welche das sind und welche Rollen du dort hast.

Steht dort stattdessen, dass noch kein MCP-Server eingerichtet ist, fehlt die Einrichtung auf dem Server. Wende dich dann an die Administration.

## Was ein Assistent sieht {#what-an-assistant-sees}

Ein Assistent liest Konferenz, Gremien, Rollen, Delegationen, Bewerbungen, Zahlungs- und Dokumentstatus, Umfragen, den Zeitplan, Papiere und Resolutionen. Personen sieht er nur als IDs mit ihrem Status, ihren Rollen und Plätzen, ob sie minderjährig sind, ihrer Schule, ihrem Wohnort, ihrer Region und ihrem Land.

Alles andere über Personen kommt als `[redacted]` an:

- Namen, E-Mail-Adressen, Telefonnummern und Anschriften
- Geburtstag, Geschlecht, Pronomen und Ernährung
- Notfallkontakte, Zugangscodes wie Eintritts- und Verbindungscodes und Einladungslinks
- alle Freitexte von oder über Personen, etwa Betreuungsnotizen, Motivationstexte, Notizen aus der Sichtung und Kommentare zu Papieren

Zählt ein Assistent Personen nach Geschlecht oder Ernährung, lässt er Gruppen unter fünf Personen weg und schreibt dort `<5`. Diese beiden Merkmale zählt er nur allein oder miteinander, nie zusammen mit Status, Schule, Ort, Land, Gremium oder Rolle, da er diese für jede Person kennt.

Nach geschwärzten Angaben kann ein Assistent auch nicht filtern, sortieren oder suchen. Eine Frage wie „Wer heißt Müller?“ lehnt DELEGATOR ab, bevor sie ausgeführt wird.

:::tip Mit IDs weiterarbeiten
Ein Assistent kennt Personen nur als IDs und kann dir nicht sagen, wer gemeint ist. Lass dir zu einer Person nennen, was er sieht, etwa ihre Delegation, Rolle oder Schule, und finde sie damit im Team-Bereich.
:::

## Was ein Assistent tun kann {#what-an-assistant-can-do}

Für häufige Fragen hat ein Assistent eigene Werkzeuge: eine Übersicht der Teilnehmenden mit ihren Formalitäten, Zählungen nach bis zu drei Merkmalen und eine Übersicht der Zuteilung mit Plätzen, Inhaber\*innen, dem Umfang des Entwurfs und Warnungen. Darüber hinaus kann er jede lesende Abfrage stellen, die auch die Seiten des Team-Bereichs nutzen.

Ändern kann er vieles, was die Seiten des Teams ändern, jeweils mit einem eigenen Werkzeug:

- Gremien, Themen, Rollen und Sitzplanung
- die [Zuteilung](./assignment#draft-apply-release) im Entwurf: Sichtung (Sterne, Markierung, **Muss einen Platz bekommen**, Ausschließen, Priorität), Gewichtung, Rollen planen, Delegationen aufteilen, Einzelteilnehmende umwandeln, automatisch zuteilen, zurücksetzen und den Entwurf verwerfen
- Gremien und Plätze einzelner Delegierter
- den Zeitplan mit Tagen, Tracks, Einträgen und Orten
- Umfragen und ihre Optionen
- Status von Teilnehmenden, ihre Schule, Zahlungen und Einträge der Warteliste
- Entscheidungen über mögliche doppelte Konten
- die Einstellungen der Konferenz
- die geteilten Ansichten der Tabellen

Eine Ansicht filtert, sortiert und gruppiert ein Assistent nur nach Spalten ohne personenbezogene Daten, persönliche Ansichten speichert er nicht. Notizen und andere Texte über Personen schreibt ein Assistent nicht, die bleiben im Team-Bereich. Die Zuteilung übernehmen oder freigeben kann er nicht, das geht nur auf der Seite [Zuteilung](./assignment#finish-and-release).

:::warning Erst Vorschau, dann ausführen
Was Menschen außerhalb des Teams erreicht, führt ein Assistent nicht sofort aus. Dazu gehören der Konferenzstatus, der Kalender für Teilnehmende, die Nachrichten zwischen Teilnehmenden und Team, das Freischalten von Zahlungen, der postalischen Anmeldung und der Papiereinreichung, Status von Teilnehmenden wie Zahlung, Dokumente und Anwesenheit, der Status von Zahlungen, die Anwesenheit aller auf einmal und das Verteilen einer Umfrage. Der Assistent bekommt zuerst eine Vorschau und muss den Aufruf ausdrücklich bestätigen. Ein guter Assistent fragt dich vorher. Bestätige nur, was du selbst so tun würdest.
:::

## Das Protokoll {#the-log}

Unter **Protokoll** steht jeder Aufruf eines Assistenten zu dieser Konferenz, die neuesten 200 zuerst: **Zeitpunkt**, **Person**, **Werkzeug**, **Ergebnis** (**Ausgeführt**, **Abgelehnt** oder **Fehler**) und **Details** mit den Angaben des Aufrufs. Neue Aufrufe erscheinen ohne Neuladen. Auch eine Vorschau steht dort, als **Ausgeführt**.

**Abgelehnt** heißt, dass DELEGATOR den Aufruf verweigert hat, etwa weil der Assistent nach geschwärzten Angaben filtern wollte, eine Eingabe ungültig war oder die Rollen der Person nicht reichten. **Fehler** heißt, dass etwas Unerwartetes schiefging. Fragen, die keine Konferenz betreffen, etwa welche Konferenzen erreichbar sind, stehen nicht im Protokoll. Versucht jemand ohne Platz im Team oder bei ausgeschaltetem Schalter, die Konferenz zu erreichen, lehnt DELEGATOR das ab, ohne es hier einzutragen.
