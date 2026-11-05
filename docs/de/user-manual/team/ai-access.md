---
title: KI-Zugang
description: KI-Assistenten mit einer Konferenz arbeiten lassen, ohne dass personenbezogene Daten sie erreichen
---

# KI-Zugang

KI-Assistenten wie Claude oder ChatGPT werden ohnehin genutzt. Damit dafür niemand Teilnehmendenlisten herunterladen und in einen Chat kopieren muss, kann sich ein Assistent direkt mit DELEGATOR verbinden. Er arbeitet dann mit deinem Konto und darf genau das, was du darfst. Personenbezogene Daten erreichen ihn dabei nie.

## Einschalten {#switching-on}

Der KI-Zugang ist für jede Konferenz zunächst aus. Die **Projektleitung** schaltet ihn auf der Seite **KI-Zugang** im Team-Bereich (Gruppe **Wartung**) ein, mit **KI-Assistenten für diese Konferenz zulassen**. Solange der Schalter aus ist, sieht kein Assistent etwas von dieser Konferenz, egal wer ihn verbindet.

Verbinden darf sich danach jedes Mitglied des Teams. Der Assistent handelt mit den Rollen der Person, die ihn verbunden hat: Wer nur die Teilnehmendenbetreuung innehat, kann über den Assistenten auch nur das, was die Teilnehmendenbetreuung darf. Administrator\*innen des Systems zählen in einer eingeschalteten Konferenz, als hätten sie jede Team-Rolle. Über eingeschaltete Konferenzen hinaus reicht ihr Assistent nicht.

## Einen Assistenten verbinden {#connecting}

Unter **Verbinden** steht die Adresse des MCP-Servers. Füge sie in deinem KI-Programm als MCP-Server hinzu (bei Claude etwa als eigenen Konnektor) und melde dich im folgenden Fenster mit deinem DELEGATOR-Konto an. Ein Assistent kann danach mit allen eingeschalteten Konferenzen arbeiten, in deren Team du bist. Frag ihn zuerst, welche das sind.

Steht dort stattdessen, dass noch kein MCP-Server eingerichtet ist, fehlt die Einrichtung auf dem Server. Wende dich dann an die Administration.

## Was ein Assistent sieht {#what-an-assistant-sees}

Ein Assistent liest Konferenz, Gremien, Rollen, Delegationen, Bewerbungen, Zahlungs- und Dokumentstatus, Umfragen, den Zeitplan, Papiere und Resolutionen. Personen sieht er nur als IDs mit ihrem Status, ihren Rollen und Plätzen, ob sie minderjährig sind, ihrer Schule, ihrem Wohnort und ihrem Land.

Alles andere über Personen kommt als `[redacted]` an:

- Namen, E-Mail-Adressen, Telefonnummern und Anschriften
- Geburtstag, Geschlecht, Pronomen und Ernährung
- Notfallkontakte, Zugangscodes und Einladungslinks
- alle Freitexte von oder über Personen, etwa Betreuungsnotizen, Motivationstexte, Notizen aus der Sichtung und Kommentare zu Papieren

Zählt ein Assistent Personen nach Geschlecht oder Ernährung, lässt er Gruppen unter fünf Personen weg und schreibt dort `<5`. Solche Zahlen kombiniert er nie mit Schule, Ort, Land, Gremium oder Rolle, da er diese für jede Person kennt.

Nach geschwärzten Angaben kann ein Assistent auch nicht filtern, sortieren oder suchen. Eine Frage wie „Wer heißt Müller?“ lehnt DELEGATOR ab, bevor sie ausgeführt wird.

:::tip Mit IDs weiterarbeiten
Ein Assistent kennt Personen nur als IDs und kann dir nicht sagen, wer gemeint ist. Lass dir zu einer Person nennen, was er sieht, etwa ihre Delegation, Rolle oder Schule, und finde sie damit im Team-Bereich.
:::

## Was ein Assistent tun kann {#what-an-assistant-can-do}

Für häufige Fragen hat ein Assistent eigene Werkzeuge: eine Übersicht der Teilnehmenden mit ihren Formalitäten, Zählungen nach bis zu drei Merkmalen und eine Übersicht der Zuteilung mit Plätzen, Inhaber\*innen und Warnungen. Darüber hinaus kann er jede lesende Abfrage stellen, die auch die Seiten des Team-Bereichs nutzen.

Ändern kann er, was die Seiten des Teams ändern: Gremien, Rollen und Sitzplanung, die Zuteilung und Sichtung, den Zeitplan, Umfragen, Status von Teilnehmenden, Zahlungen und die Einstellungen der Konferenz. Notizen und andere Texte über Personen schreibt ein Assistent nicht, die bleiben im Team-Bereich.

:::warning Erst Vorschau, dann ausführen
Was Menschen außerhalb des Teams erreicht, führt ein Assistent nicht sofort aus. Dazu gehören etwa der Konferenzstatus, die Konferenzinformationen, das Freischalten von Zahlungen, der postalischen Anmeldung oder der Papiereinreichung, Status von Teilnehmenden und Zahlungen, die E-Mails auslösen, und das Verteilen einer Umfrage. Der Assistent bekommt zuerst eine Vorschau und muss den Aufruf ausdrücklich bestätigen. Ein guter Assistent fragt dich vorher. Bestätige nur, was du selbst so tun würdest.
:::

## Das Protokoll {#the-log}

Unter **Protokoll** steht jeder Aufruf eines Assistenten in dieser Konferenz, die neuesten 200 zuerst: wann, von wem, welches Werkzeug, mit welchem **Ergebnis** (**Ausgeführt**, **Abgelehnt** oder **Fehler**) und mit welchen Angaben. Abgelehnt heißt, dass DELEGATOR den Aufruf verweigert hat, etwa weil der Assistent nach geschwärzten Angaben filtern wollte oder die Rollen der Person nicht reichten. Das Protokoll sieht nur die Projektleitung.
