---
title: Konferenz einrichten
description: Eine Konferenz anlegen und einrichten, mit Einstellungen, Phasen, Funktionen, Vorlagen, Gremien, Sitzplanung und Plätzen
---

# Konferenz einrichten

Diese Seite zeigt, wie das Konferenzteam eine Konferenz aufsetzt und pflegt: von der neuen Konferenz über die Einstellungen, Phasen und Vorlagen bis zu Gremien, Sitzplanung und Plätzen. Wie die Plätze danach an Delegationen und Einzelteilnehmende gehen, steht unter [Zuteilung](./assignment). Wie der Team-Bereich aufgebaut ist und welche Rolle was öffnen darf, steht unter [Der Team-Bereich](./overview#the-team-area) und [Wer was darf](./overview#team-roles).

## Eine Konferenz anlegen {#creating-a-conference}

Neue Konferenzen legen nur System-Admins an. Auf der Seite **Konferenzen** und im Menü hinter dem Personensymbol oben rechts unter **Administration** führt **Konferenz anlegen** zur Seite **Konferenz erstellen**.

1. Die Daten der Konferenz entstehen auf der Seite **Konferenzanfrage**, die **Konferenz erstellen** oben rechts verlinkt. Dort trägst du Eckdaten, Gremien mit ihren Staaten, nichtstaatliche Akteure und Einzelrollen ein. **Alle UN-Mitgliedstaaten hinzufügen** füllt ein Gremium mit allen Staaten. Die Seite speichert nichts auf dem Server, deine Eingaben bleiben nur in diesem Browser. Zeiten gelten in der Zeitzone Europe/Berlin. Am Ende lädst du das erzeugte JSON herunter.
2. Ein\*e Admin wählt die Datei auf **Konferenz erstellen** aus. Sie wird sofort geprüft. Bei Fehlern erscheint **Validierung fehlgeschlagen** mit den betroffenen Stellen, etwa einem Staat, der kein UN-Mitglied ist, einem doppelten Kürzel oder einem Bewerbungsende nach dem Konferenzbeginn.
3. Nach **Validierung erfolgreich** legt **Konferenz erstellen** die Konferenz mit Gremien, Sitzen, nichtstaatlichen Akteuren und Einzelrollen an und öffnet ihr Dashboard.

Die Datei muss nicht perfekt sein: Alles lässt sich danach in den [Einstellungen](#general-settings) und der [Sitzplanung](#seat-planning) ändern. Eine neue Konferenz steht auf **Vor Bewerbungsstart** und ist damit noch nicht öffentlich. Ein Team bringt die Datei nicht mit. Die ersten Mitglieder lädt ein\*e Admin im [Teammanagement](./overview#team-management) ein.

## Von der neuen Konferenz zur offenen Bewerbung {#setup-checklist}

Diese Reihenfolge ergibt sich aus dem, was DELEGATOR in den einzelnen Phasen zulässt.

1. Team einladen. Ohne Team kann außer System-Admins niemand die Konferenz einrichten. Die Einstellungen öffnen **Projektleitung**, **Teilnehmendenbetreuung** und **Leitung Inhalt**.
2. **Allgemeines** ausfüllen (Projektleitung): Name, Ort, Konferenzsprache, Bilder, das Ende der Bewerbungsphase, Kulanzzeitraum, Konferenzdaten und Zeitzone. Dazu die [Altersgrenzen](#age-limits) und die [Schulregeln](#school-rules).
3. Auf der Seite [Gremien und Themen](#committees-and-seats) Gremien und Themen anlegen (Projektleitung, Leitung Inhalt). Zu den Themen reichen Delegationen später ihre Papiere ein.
4. Sitze planen (Projektleitung, Leitung Inhalt): Staaten in den Gremien, nichtstaatliche Akteure und Einzelrollen. Das geht am besten jetzt, solange die Konferenz **Vor Bewerbungsstart** steht. Danach ist jede Änderung sofort öffentlich und kann Bewerbungen entfernen.
5. Links eintragen, vor allem den Link zur inhaltlichen Vorbereitung, den auch Besuchende ohne Anmeldung sehen.
6. **Überweisungsinformationen** eintragen (Projektleitung), bevor du Zahlungen freischaltest.
7. Postadresse und Vorlagen hinterlegen: die vier Vorlagen der postalischen Anmeldung, die Felder darauf platzieren und mit **Testdokument** prüfen. Die Zertifikatsvorlage brauchst du erst nach der Konferenz.
8. Den Status auf **Bewerbungsphase** setzen und speichern. Ab jetzt ist die Konferenz öffentlich und Bewerbungen sind möglich.

Wie es danach weitergeht, steht unter [Typischer Ablauf](#typical-sequence).

## Die Einstellungen {#general-settings}

Die Seite **Einstellungen** bündelt die Konfiguration in Reitern: **Allgemeines**, **Status & Funktionen**, **Links & Inhalte**, **Überweisungsinformationen**, **Dokumente & Vorlagen**. Jeder Reiter erklärt oben kurz, wofür er da ist. Gremien und Themen haben eine [eigene Seite](#committees-and-seats).

![Die Konferenzeinstellungen mit ihren Reitern und dem Speichern-Knopf](shot:team/configuration)

Öffnen dürfen die Seite **Projektleitung**, **Teilnehmendenbetreuung** und **Leitung Inhalt**. Alles ändern darf nur die Projektleitung. Teilnehmendenbetreuung und Leitung Inhalt ändern den Status, die Funktionsschalter, die Links, die Postadresse, die Zahlungsfrist, die Vorlagen samt Anordnung und die Resolutionen. **Allgemeines** und den Rest der **Überweisungsinformationen** sehen sie gesperrt, und oben steht ein Hinweis, was sie ändern können.

### Speichern mit Vorschau {#saving}

Änderungen in den Reitern werden nicht sofort gespeichert. Ein Reiter mit ungespeicherten Änderungen trägt einen gelben Punkt, und der Knopf zeigt etwa **Einstellungen speichern (3 Änderungen)**. Er öffnet **Speichern bestätigen** mit allen Änderungen, nach Reitern geordnet, alter und neuer Wert nebeneinander. Gelb hervorgehoben und mit einer Erklärung versehen sind:

- der **Konferenzstatus**: Er steuert sofort, was alle sehen und nutzen können.
- die Schalter unter **Funktionen**: Sie schalten eine Funktion für alle sofort frei oder sperren sie.
- Beitrag, Währung und Bankdaten: Sie erscheinen auf Zahlungsaufforderungen, die schon verschickt sind.

Eine neu gewählte Datei ersetzt die bisher hinterlegte, eine entfernte steht als **entfernt** in der Liste. Erst **Speichern** schreibt alles. Verlässt du die Seite mit ungespeicherten Änderungen, etwa über **Einrichten** zum Kalender, fragt DELEGATOR vorher, ob du sie verwerfen willst. Ein Wechsel zwischen den Tabs behält sie.

Liegt das Ende der Bewerbungsphase nach dem Konferenzbeginn, der Beginn nach dem Ende oder das Mindestalter der Teilnehmenden über ihrem Höchstalter, lässt sich nicht speichern. Die Meldung steht am betroffenen Feld.

Hat das Speichern E-Mails fällig gemacht, fragt die Seite danach **E-Mails jetzt verschicken?** und nennt, welche Arten wie oft offen sind. Das passiert bei **Zahlungen**, **Postalische Anmeldung**, beim Status **Nach der Konferenz** und bei einer neuen Zertifikatsvorlage. **{count} E-Mails jetzt verschicken** schickt sie ab, mit **Später** findest du sie auf der Seite [E-Mails](./communication#emails) wieder. Die Frage sehen nur Projektleitung und Teilnehmendenbetreuung, die die E-Mails verwalten dürfen.

:::note Außerhalb des Formulars
Resolutionen und die Anordnung auf den Vorlagen speichern in ihren eigenen Fenstern sofort. Der Speichern-Knopf gilt nur für die Formularfelder.
:::

### Allgemeines {#general}

Nur die Projektleitung ändert diesen Reiter.

- **Basisdaten**: **Konferenzname** (mindestens 3 Zeichen), **Voller Name**, **Ort**, **Konferenzsprache** und **Website**. Name, Ort und Sprache stehen auf der Karte der Konferenz in der Übersicht. Die Sprache erscheint außerdem als Hinweis vor der Bewerbung, damit sich nur bewirbt, wer sie spricht. In ihr werden auch die Staaten auf den Namensschild-Tischen einsortiert und gedruckt, egal in welcher Sprache die Oberfläche der einzelnen Person läuft.
- **Bilder & Logos**: das **Konferenzbild** für die Karte in der Übersicht, das **Konferenz-Emblem** (eine SVG-Datei für Resolutionen, sonst das UN-Emblem) und das **Konferenz-Logo** für den Kopf des Dashboards (sonst das Emblem). Jedes Bild darf höchstens 1 MB groß sein und lässt sich wieder entfernen.
- **Zeitplan**: **Ende der Bewerbungsphase** mit Uhrzeit, **Bewerbungsfrist Kulanzzeitraum (in Minuten)** (anfangs 30), **Konferenz-Startdatum**, **Konferenz-Enddatum** und die **Zeitzone der Konferenz**, nach der der Kalender die „Jetzt“-Markierung setzt (anfangs Europe/Berlin).

Teilnehmende sehen nur das Ende der Bewerbungsphase, ab dann zeigt die Übersicht die Bewerbung als geschlossen. Der Kulanzzeitraum ist ein Puffer für alle, die gerade fertig werden: Erst danach nimmt DELEGATOR keine Bewerbung mehr an. Unter dem Feld steht dieser Zeitpunkt in deiner Zeitzone.

### Altersgrenzen {#age-limits}

Unter **Altersgrenzen** im Reiter **Allgemeines** legt die Projektleitung **Mindestalter Teilnehmende** (anfangs 15), **Höchstalter Teilnehmende** (anfangs 21) und **Mindestalter Betreuende** (anfangs 21) fest. Gemessen wird am ersten Konferenztag. Ein leeres Feld schaltet die Grenze aus.

Was daraus folgt:

- Wer außerhalb liegt, sieht beim Bewerben, auf der Warteliste und auf dem Dashboard bis zum Ende der Konferenz einen Hinweis und erscheint in der [Plausibilitätsprüfung](./maintenance#plausibility).
- Eintragen und einer Delegation beitreten kann jede\*r. **Abschicken** lässt sich eine Bewerbung aber nicht, solange eine Person darin außerhalb liegt. Die Person liest dann „Mit diesem Alter lässt sich die Bewerbung nicht abschicken. Bei Fragen wende dich an das Team.“
- Betreuende außerhalb ihrer Grenze können sich nur ohne eigene Teilnahme vor Ort anmelden und diese auch später nicht selbst bestätigen. Die Teilnehmendenbetreuung kann sie in der [Teilnehmendenkarte](./participants#user-card) trotzdem bestätigen.

### Links & Inhalte {#links}

- **Link zur inhaltlichen Vorbereitung**: Ihn sehen Besuchende ohne Anmeldung auf der Seite der Konferenz, solange sie öffentlich ist, und Teilnehmende mit Platz auf ihrem Dashboard.
- **Team-Wiki Link** und **Dienste-Seite Link**: Sie erscheinen als **Team-Wiki** und **Dienste** nur auf dem Dashboard des Teams.

Ein leeres Feld blendet den Link aus. Ändern dürfen das Projektleitung, Teilnehmendenbetreuung und Leitung Inhalt.

### Überweisungsinformationen {#payment-details}

Unter **Teilnahmegebühr** stehen **Teilnahmebeitrag** und **Währung** (drei Buchstaben, anfangs EUR), unter **Bankkonto** **Kontoinhaber\*in**, **Name der Bank**, **IBAN** (22 Zeichen ohne Leerzeichen) und **BIC**. Nur die Projektleitung ändert sie. Teilnehmende sehen diese Angaben, wenn sie [ihren Beitrag zahlen](../participant/dashboard#payment), samt einem QR-Code für die Überweisung. Die **Zahlungsfrist** darunter dürfen auch Teilnehmendenbetreuung und Leitung Inhalt ändern. Sie ist freiwillig: Sie steht auf der Zahlungsseite, nach ihrem Ablauf als **Frist überschritten**, und wenige Tage davor erinnert eine E-Mail alle, deren Beitrag noch fehlt. Bezahlen bleibt auch danach möglich.

## Status und Phasen {#stages}

Im Reiter **Status & Funktionen** wählst du unter **Konferenzstatus** die Phase der Konferenz. Sie wechselt nie von selbst, sondern nur, wenn das Team sie ändert und speichert. Ändern dürfen das Projektleitung, Teilnehmendenbetreuung und Leitung Inhalt.

:::warning Der Status wirkt sofort
Mit dem Speichern sehen alle die neue Phase. Er öffnet oder schließt die Bewerbung, macht die Konferenz öffentlich oder nicht und macht E-Mails fällig. Prüfe die Vorschau, bevor du speicherst.
:::

| Phase                   | Was sich ändert                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vor Bewerbungsstart** | Die Konferenz ist nicht öffentlich. Sie sehen nur das Team, System-Admins und wer schon angemeldet ist. Delegationen gründen, beitreten und sich bewerben geht nicht. Die Sitzplanung lässt sich frei ändern.                                                                                                                                                      |
| **Bewerbungsphase**     | Die Konferenz ist öffentlich, auch ohne Anmeldung, mit ihren [Plätzen](#public-seats). Bis zum Ende der Bewerbungsphase samt Kulanzzeitraum lassen sich Delegationen gründen, ihnen beitreten und Bewerbungen abschicken oder zurückziehen. Danach zeigen die Dashboards, dass die Auswahl läuft, und das Team [sichtet](./assignment#sighting) die Bewerbungen.   |
| **Vorbereitung**        | Die Konferenz bleibt öffentlich, und die [Warteliste](./participants#waiting-list) ist offen. Bis zur [Freigabe der Zuteilung](./assignment#finish-and-release) sehen Teilnehmende, dass die Zuteilung noch läuft. Danach sehen sie ihre Rolle und die Karten unter **Schnellzugriff**, wer keinen Platz bekommen hat, eine Absage mit dem Weg auf die Warteliste. |
| **Aktive Konferenz**    | Die Konferenz ist nicht mehr öffentlich, die Warteliste ist geschlossen. Teilnehmende mit Platz sehen ihr Dashboard wie in der Vorbereitung.                                                                                                                                                                                                                       |
| **Nach der Konferenz**  | Das Dashboard bedankt sich, zeigt die Rolle und bietet das Zertifikat und die [verabschiedeten Resolutionen](#resolutions) zum Herunterladen an. Die Karten unter **Schnellzugriff** wie **Beitragszahlung** oder **Zeitplan** verschwinden. Betreuende können sich nicht mehr anmelden. Die Konferenz steht in der Übersicht bei den vergangenen.                 |

Betreuende sind nicht an die Bewerbungsfrist gebunden: Sie können sich in jeder Phase bis auf **Nach der Konferenz** selbst anmelden.

Die Phasen machen auch E-Mails fällig. In der Bewerbungsphase wird drei Tage vor ihrem Ende eine Erinnerung an alle fällig, deren Bewerbung noch nicht abgeschickt ist. Mit **Nach der Konferenz** wird **Zertifikat verfügbar** fällig, sobald eine Zertifikatsvorlage hinterlegt ist, und zwar für alle, die als anwesend markiert sind. Welche E-Mail wann fällig wird, steht unter [E-Mails](./communication#emails).

### Typischer Ablauf {#typical-sequence}

1. **Bewerbungsphase** setzen, wenn alles [eingerichtet](#setup-checklist) ist.
2. Nach dem Ende der Bewerbungsphase die Bewerbungen [sichten](./assignment#sighting), die Plätze [zuteilen](./assignment#delegations) und die Zuteilung [übernehmen](./assignment#finish-and-release).
3. **Vorbereitung** setzen. Damit öffnet die Warteliste.
4. Die Zuteilung [freigeben](./assignment#releasing). Erst jetzt sehen Teilnehmende ihre Rollen und den Schnellzugriff.
5. **Zahlungen** und **Postalische Anmeldung** einschalten, dazu je nach Bedarf Kalender, Papier-Einreichung und Nachrichten.
6. Zur Konferenz **Aktive Konferenz** setzen.
7. Danach die Zertifikatsvorlage hinterlegen und **Nach der Konferenz** setzen. Die Seite bietet dann die Zertifikats-E-Mail an.

### Funktionen {#features}

Unter **Funktionen** schaltest du einzelne Teile unabhängig von der Phase frei, jeder auf einer eigenen Karte, die sagt, was er für Teilnehmende freischaltet. Ändern dürfen das Projektleitung, Teilnehmendenbetreuung und Leitung Inhalt.

Eine Funktion lässt sich erst einschalten, wenn eingerichtet ist, was sie braucht. Bis dahin ist ihr Schalter gesperrt, die Karte nennt unter **Braucht noch** das Fehlende und führt mit **Einrichten** dorthin. Du kannst beides in einem Rutsch erledigen: Bankdaten eintragen, Zahlungen einschalten, einmal speichern.

- **Zahlungen**: Teilnahmebeitrag, Währung, Kontoinhaber\*in und IBAN
- **Postalische Anmeldung**: die vollständige Postanschrift und alle vier [Vorlagen](#documents)
- **Papier-Einreichung**: ein Gremium mit Tagesordnungspunkt
- **Kalender**: mindestens ein Kalendertag
- **Vorbereitungsleitfaden**: eine veröffentlichte Seitenleiste im [Leitfaden](./communication#guide)
- **Nachrichten zwischen Delegationen** braucht nichts.

Ausschalten geht immer. Fehlt einer eingeschalteten Funktion später etwas, etwa weil eine Vorlage entfernt wurde, bleibt sie an und ihre Karte warnt **Eingeschaltet, aber es fehlt**. Etwas wegnehmen, das eine eingeschaltete Funktion braucht, etwa die IBAN löschen, lehnt das Speichern ab. Schalte die Funktion dann zuerst aus.

Die Karten unter **Schnellzugriff** auf dem Dashboard der Teilnehmenden, etwa **Beitragszahlung**, **Postalische Anmeldung**, **Papier-Hub** oder **Zeitplan**, erscheinen nur für Personen mit Platz und für Betreuende mit einer betreuten Person mit Platz. Und das nur in **Vorbereitung** und **Aktive Konferenz** nach der Freigabe der Zuteilung. Ein Schalter, den du vorher einschaltest, zeigt sich also erst dann.

- **Zahlungen**: Teilnehmende sehen, [wie und wohin sie zahlen](../participant/dashboard#payment). Für alle mit Platz, die noch nicht bezahlt haben, wird die E-Mail **Teilnahmebeitrag freigeschaltet** fällig, nach der Freigabe der Zuteilung. Offene Zahlungen nennt außerdem die Erinnerung 14 Tage vor der Konferenz.
- **Postalische Anmeldung**: Teilnehmende laden ihre [postalische Anmeldung](../participant/dashboard#postal-registration) herunter. Das klappt nur, wenn alle vier [Vorlagen](#documents) hinterlegt sind. Für alle mit Platz, deren Unterlagen noch nicht vollständig sind, wird **Postalische Anmeldung freigeschaltet** fällig.
- **Papier-Einreichung**: Teilnehmende legen im [Papier-Hub](../participant/paper-hub) Papiere zu den Themen ihrer Gremien an und speichern neue Fassungen. Ist der Schalter aus, lehnt DELEGATOR beides ab mit „Papier kann nicht eingereicht werden, weil das Papier-Postfach geschlossen ist.“, und der **Papier-Hub** fehlt im Schnellzugriff.
- **Kalender**: Teilnehmende sehen den [Zeitplan](./communication#calendar). Das Team sieht ihn immer.
- **Nachrichten zwischen Delegationen**: schaltet die Einzelchats zwischen Teilnehmenden verschiedener Delegationen frei, sobald die Zuteilung freigegeben ist (siehe [Nachrichten](./communication#messages)). Das Team und die eigene Delegation erreichen Teilnehmende immer. Ausgeschaltet bleiben bestehende Einzelchats lesbar, aber niemand schreibt dort mehr Neues.
- **Vorbereitungsleitfaden**: Teilnehmende lesen den [Vorbereitungsleitfaden](./communication#guide) in der App, sobald ihre Rollen verteilt sind; vorher führt die Übersicht zum Link **Vorbereitungsleitfaden**. Derselbe Schalter steht auch im Leitfaden selbst.

:::tip Erst die Freigabe, dann die Formalitäten
**Teilnahmebeitrag freigeschaltet** und **Postalische Anmeldung freigeschaltet** werden erst fällig, wenn die Zuteilung freigegeben ist. Schaltest du Zahlungen vorher frei, bietet das Speichern keine E-Mails an. Nach der Freigabe gehen sie mit dem nächsten automatischen Lauf raus, wenn die Art auf automatisch steht. Sonst warten sie auf der Seite [E-Mails](./communication#emails), bis du sie verschickst.
:::

### Schulregeln {#school-rules}

Im selben Reiter stehen unter **Schulregeln** die Grenzen der Schulregeln. Ändern kann sie nur die Projektleitung.

- **Gemeinsame Entscheidung bis Gruppengröße** (anfangs 16): Die Bewerbenden einer Betreuungsperson von derselben Schule bilden eine Gruppe. Ist eine Person einer Delegation mit der Betreuungsperson verknüpft, zählen alle Mitglieder dieser Delegation von derselben Schule mit. Bis zu dieser Größe bekommen alle einen Platz oder niemand. Größere Gruppen werden wie alle anderen behandelt.
- **Garantierte Plätze pro Auslandsschule** (anfangs 12): So viele Personen einer Auslandsschule können höchstens einen garantierten Platz bekommen. Welche Schule eine Auslandsschule ist, legt die Teilnehmendenbetreuung bei den [Schulen](./participants#schools) fest.
- **Garantierte Plätze aller Auslandsschulen (%)** (anfangs 20): Dieser Anteil aller Plätze der Konferenz kann höchstens als garantierte Plätze an Auslandsschulen zusammen gehen.

Die [Zuteilung](./assignment#delegations) warnt, wenn ein Entwurf eine Regel verletzt, und blockiert nichts. Ein leeres Feld schaltet eine Regel ab.

## Dokumente und Vorlagen {#documents}

Der Reiter **Dokumente & Vorlagen** hält alles, woraus DELEGATOR die Papiere der Teilnehmenden erzeugt. Ändern dürfen ihn Projektleitung, Teilnehmendenbetreuung und Leitung Inhalt.

- **Postalische Anmeldung**: die Postadresse, an die Teilnehmende ihre Unterlagen schicken (**Name**, **Straße und Hausnummer**, **ggf. Adresszusatz**, **Postleitzahl**, **Stadt**, **Land**). Sie steht auf der Seite der postalischen Anmeldung und als Empfängeradresse auf der verbindlichen Anmeldung.
- **Postversand-Vorlagen**: je eine PDF für **Verbindliche Anmeldung**, **Einwilligung der Erziehungsberechtigten** (nur für Minderjährige im Paket), **Einwilligung Bildnutzung** und **Teilnahmebedingungen**. Teilnehmende können ihre postalische Anmeldung nur herunterladen, wenn alle vier hinterlegt sind.
- **Teilnahmezertifikat**: die PDF, auf die die Zertifikate gedruckt werden. Ohne sie lässt sich kein Zertifikat herunterladen.

Jede Vorlage hat eine eigene Karte, die mit dem Symbol unten rechts zeigt (der Name steht, wenn du darauf zeigst), ob sie **Hinterlegt** ist, **Fehlt noch**, **Wird beim Speichern hochgeladen** oder **Wird beim Speichern entfernt**. Auf der Karte:

- **PDF auswählen oder hierher ziehen** (bei einer hinterlegten Vorlage **PDF ersetzen**) nimmt eine Datei bis 10 MB, per Klick oder indem du sie auf die Karte ziehst. Die Karte zeigt die erste Seite und wie viele Seiten die PDF hat. Hochgeladen wird sie erst mit **Einstellungen speichern**.
- Das Auge (**Hinterlegte Vorlage ansehen**) öffnet die hinterlegte Datei.
- Der Papierkorb (**Vorlage entfernen**) entfernt sie beim nächsten Speichern, **Entfernen rückgängig machen** nimmt das zurück.
- **Felder platzieren** und **Testdokument** gehen erst, wenn die Vorlage gespeichert ist („Erst eine Vorlage hochladen und speichern“, „Erst die neue Vorlage speichern“). Die vier Vorlagen der postalischen Anmeldung haben ein gemeinsames **Testdokument generieren** unter ihren Karten, das alle vier braucht.

Das Fragezeichen neben den Überschriften (**Hilfe zu den PDF-Vorlagen**) erklärt, was auf welcher Vorlage steht.

:::warning Vorlagen ersetzen oder entfernen
Eine neue Vorlage gilt sofort für alle Dokumente, die danach erzeugt werden. Entfernst du eine Vorlage der postalischen Anmeldung, können Teilnehmende ihre Unterlagen nicht mehr herunterladen. Ohne Zertifikatsvorlage gibt es keine Zertifikate.
:::

### Felder auf der Vorlage platzieren {#document-layouts}

Die Vorlagen enthalten keine Platzhalter. DELEGATOR schreibt die Angaben der Person in der Schrift Space Mono auf die erste Seite der PDF, und wohin, legst du mit **Felder platzieren** fest. Das Fenster **Anordnung auf der Vorlage:** mit dem Namen des Dokuments zeigt die Seite, auf der du jedes Feld an seine Stelle ziehst, bis auf 10 mm an den Rand (die gestrichelte Linie; Drucker lassen den Rand frei). Mit der Lupe über der Seite (oder Strg und dem Mausrad) vergrößerst du sie, um kleine Kästchen genau zu treffen:

| Dokument                                    | Felder                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Teilnahmezertifikat**                     | **Name** (zentriert), **Check-in-Liste** mit den Check-ins, bei denen die Person war, **QR-Code** zur Echtheitsprüfung                      |
| **Verbindliche Anmeldung**                  | **Empfängeradresse** (vier Zeilen für das Fenster eines Umschlags), **Name**, **Geburtsdatum**, **QR-Code mit Name und ID**, **Seitenzahl** |
| **Einwilligung der Erziehungsberechtigten** | **Name**, **Geburtsdatum**, **QR-Code mit Name und ID**, **Seitenzahl**                                                                     |
| **Einwilligung Bildnutzung**                | **Name**, **Geburtsdatum**, **Adresse**, **QR-Code mit Name und ID**, **Seitenzahl**                                                        |

Die Check-in-Liste und die QR-Codes änderst du an ihrer Ecke unten rechts in der Größe, die Schriftgröße der Texte mit Minus und Plus unter **Schriftgrößen** in der Spalte neben der Seite. Was deine Vorlage nicht braucht, etwa die Adresse oder die Check-in-Liste, schaltest du unter **Eingesetzte Angaben** aus; QR-Code, Seitenzahl, Markierungen und die ausgelesenen Felder bleiben immer. **Standard** setzt alles auf die Standardpositionen zurück, die auch gelten, solange du nichts platzierst. **Testdokument generieren** druckt ein Beispiel mit erfundenen Angaben schon mit der ungespeicherten Anordnung. **Speichern** übernimmt sie sofort für alle Dokumente, die danach erzeugt werden.

Die Teilnahmebedingungen werden unverändert hinten angehängt, dort wird nichts platziert. Jede Seite der postalischen Anmeldung bekommt den signierten QR-Code mit ID und Name darunter dort, wo ihr Dokument ihn platziert, und unten rechts die Seitenzahl, auch die Seiten der Teilnahmebedingungen. Das Zertifikat kann jede Seitengröße haben, auch quer.

:::tip Platz lassen
Lass auf deiner Vorlage an den Stellen der Felder Platz frei. **Lesbarkeit** neben der Seite sagt dir, wo sich Teile überdecken oder auf dem Text der Vorlage liegen. Liegt dabei der QR-Code, eine Markierung oder ein Feld, geht **Speichern** erst, wenn du es verschoben hast. Das Testdokument zeigt das Ergebnis mit erfundenen Angaben und der Postadresse, wie sie gerade im Formular steht.
:::

### Verabschiedete Resolutionen {#resolutions}

Unter den Vorlagen lädst du im Abschnitt **Verabschiedete Resolutionen** die Resolutionen als PDF hoch. Ändern dürfen das Projektleitung, Teilnehmendenbetreuung und Leitung Inhalt.

1. Wähle unter **Einem Gremium zuordnen (optional)** ein Gremium oder **Kein Gremium**.
2. Wähle unter **Resolutionen hochladen (PDF)** eine oder mehrere Dateien, höchstens 50 auf einmal und je höchstens 10 MB.

Jede Datei wird sofort gespeichert, nicht erst mit dem Speichern-Knopf. Schlägt eine fehl, bleiben die anderen. Eine neue Resolution heißt wie ihre Datei. In der Tabelle änderst du **Titel** und **Gremium** direkt, der Titel speichert beim Verlassen des Feldes. Daneben lädst du sie herunter oder löschst sie nach einer Rückfrage.

Teilnehmende mit Platz laden die Resolutionen nach dem Ende der Konferenz auf ihrem Dashboard herunter. Ist eine MUNify CHASE verbunden, erscheinen dort verabschiedete Resolutionen von selbst mit **Aus CHASE** und lassen sich hier nicht löschen, solange die Verbindung besteht.

## Gremien und Themen {#committees-and-seats}

Auf der Seite **Gremien und Themen**, in der Navigation direkt unter der **Sitzplanung**, verwaltest du die Gremien der Konferenz mit ihren Tagesordnungspunkten. **Projektleitung** und **Leitung Inhalt** legen Gremien an, bearbeiten sie und pflegen die Themen. Löschen darf ein Gremium nur die **Projektleitung**. Die **Teilnehmendenbetreuung** sieht die Seite nur, oben steht dann ein Hinweis.

![Die Gremien einer Konferenz mit ihren Themen](shot:team/committees)

Links steht die Liste der Gremien, jedes mit der Zahl seiner Staaten und Themen. Fehlen einem Thema noch die Punkte zur Diskussion, steht das darunter. Ein Klick zeigt das Gremium rechts daneben; die Adresse merkt sich, welches, sodass du einen Link darauf teilen kannst. Oben führt **Zur Sitzplanung** dorthin, wo du festlegst, welche Staaten in einem Gremium sitzen.

- **Gremium hinzufügen** unter der Liste legt ein Gremium mit **Name**, **Kürzel** und **Sitze pro Delegation** an und wählt es gleich aus.
- **Einstellungen des Gremiums** zeigen Name und Kürzel, die **Sitze pro Delegation** und die **Resolutions-Überschrift**, eine eigene Überschrift für Resolutionen, etwa für den richtigen Artikel („Der Sicherheitsrat“). Leer gelassen entfällt sie. Du änderst sie direkt in den Feldern; **Speichern** übernimmt sie, **Verwerfen** stellt den gespeicherten Stand wieder her.
- Unter **Tagesordnungspunkte** steht jedes Thema als Zeile mit der Zahl seiner Punkte zur Diskussion und Papiere. Zu den Themen reichen Delegationen ihre Papiere ein. Ein Klick öffnet das Thema an Ort und Stelle mit **Titel**, **Teaser-Text** und Punkten; **Speichern** übernimmt die Änderungen, ein noch nicht gespeichertes Thema trägt **Nicht gespeichert**. **Thema löschen** entfernt es nach einer Rückfrage. **Tagesordnungspunkt hinzufügen** öffnet darunter die Felder für ein neues Thema.
- Unter **Punkte zur Diskussion** hältst du fest, was Papiere zu einem Thema beantworten sollen, ein Punkt pro Feld und in der Reihenfolge, in der sie erscheinen. **Punkt hinzufügen** oder Enter beginnt den nächsten Punkt, die Pfeile verschieben ihn, das Kreuz entfernt ihn; leere Punkte fallen beim Speichern weg. Teilnehmende sehen die Punkte beim Schreiben und auf ihrem Papier, Begutachtende neben dem Papier, und der [Leitfaden](./communication#guide-editor) zeigt sie auf der Seite des Themas. Die Zeile des Themas nennt, wie viele es hat.
- **Gremium löschen** am Ende entfernt das Gremium nach einer Rückfrage (nur Projektleitung).

**Sitze pro Delegation** bestimmt, wie viele Delegierte einer Delegation in diesem Gremium sitzen. Zusammen über alle Gremien ergibt das die Größe der Delegation, die einen Staat vertritt.

Was dabei passiert:

- Weniger Sitze pro Delegation, als eine Delegation schon Delegierte im Gremium hat, lehnt DELEGATOR ab („Es werden mindestens 2 Sitze pro Delegation benötigt, …“). Sinkt die Zahl, werden Bewerbungen von Delegationen auf Staaten dieses Gremiums entfernt, die danach zu groß für die Rolle sind.
- Ein Gremium lässt sich nicht löschen, solange ihm Delegierte zugeteilt oder zu seinen Themen Papiere eingereicht sind. Sonst gehen seine Themen und alle Sitze darin mit. Staaten, die nur dort saßen, sind danach keine Rolle mehr, und Bewerbungen auf sie verschwinden, außer eine Delegation hat den Staat schon. Resolutionen und Kalenderspuren verlieren nur den Bezug zum Gremium.

:::warning Themen mit Papieren
Wer ein Thema löscht, zu dem Papiere eingereicht sind, löscht die Papiere mit. Die Rückfrage nennt ihre Zahl und will den Titel des Themas eingetippt haben. Das lässt sich nicht rückgängig machen.
:::

## Sitzplanung {#seat-planning}

Die **Sitzplanung** verteilt die Sitze der Staaten und nichtstaatlichen Akteure auf die Gremien. Aus ihr ergibt sich, welche Rollen es gibt und wie groß die Delegation für jede ist. Sie hat drei Reiter: **Staaten**, **Nichtstaatliche Akteure** und **Einzelrollen**. Öffnen und ändern dürfen sie **Projektleitung** und **Leitung Inhalt**. Jede Änderung speichert sofort, einen Speichern-Knopf gibt es nicht.

![Die Sitzplanungsmatrix mit Staaten als Zeilen, Gremien als Spalten und den Hinweisen daneben](shot:team/seat-planning)

### Staaten {#seat-planning-states}

Die Matrix listet alle UN-Mitgliedsstaaten als Zeilen und die Gremien als Spalten. Ein Klick in eine Zelle gibt dem Staat einen Sitz im Gremium oder nimmt ihn weg. Die Meldung danach bietet **Rückgängig** an, eine abgelehnte Änderung springt zurück und nennt den Grund. Die Spalte **Σ** zeigt die Delegationsgröße: die Summe der Sitze pro Delegation über alle Gremien, in denen der Staat sitzt. Eine Größe 1 ist gelb markiert, weil eine Delegation aus einer Person unpraktisch ist. Ein Warnzeichen erscheint, wenn die zugeteilte Delegation mehr Mitglieder als Sitze hat.

Über der Matrix suchst du einen Staat nach Name oder Ländercode (**Staat suchen**) und filterst nach Regionalgruppe, Delegationsgröße oder **Nur ohne Sitz**. Ein Klick auf einen Spaltenkopf sortiert. Zeigst du auf einen Staat, erscheinen Hauptstadt, Region, Regionalgruppe, Sprachen, Nachbarstaaten und ob er ein Binnenstaat ist. Die letzte Zeile zählt die Sitze je Gremium.

Was ein Klick bewirkt:

- Ein erster Sitz macht den Staat zu einer Rolle der Konferenz, auf die sich Delegationen bewerben können.
- Ein weggenommener Sitz macht die Delegation kleiner. Bewerbungen von Delegationen, die danach zu groß sind, werden entfernt. Mit dem letzten Sitz ist der Staat keine Rolle mehr, und alle Bewerbungen auf ihn verschwinden, außer eine Delegation hat ihn schon.
- Sitze, denen schon Delegierte zugeteilt sind, sind gesperrt und zeigen ein Schloss mit den Namen.

### Nichtstaatliche Akteure und Einzelrollen {#roles}

Unter **Nichtstaatliche Akteure** legst du Akteure mit **Name**, **Kürzel**, **Beschreibung**, **Icon** und **Plätze** an, also der Größe ihrer Delegation. Name und Kürzel müssen in der Konferenz eindeutig sein. Das Icon wählst du über den Knopf vor dem Feld aus den Phosphor-Icons aus, oder du gibst seinen Namen ein (etwa `tree`).

Unter **Einzelrollen** legst du Rollen für Einzelteilnehmende an, etwa die Konferenzpresse, mit **Name**, **Beschreibung**, **Icon** und **Plätze**. Hier bestimmen die **Plätze**, wie viele Personen die Rolle erhalten können, und **Vergeben** zählt, wie viele sie schon haben. Unter der Tabelle steht die Summe über alle Einzelrollen.

Felder speichern, sobald du sie verlässt. Eine abgelehnte Änderung setzt das Feld zurück. Das Plus in der letzten Zeile legt eine neue Rolle an.

- Weniger Plätze, als die zugeteilte Delegation eines Akteurs Mitglieder hat oder als eine Einzelrolle vergeben ist, lehnt DELEGATOR ab. Sinken die Plätze eines Akteurs, werden Bewerbungen von Delegationen entfernt, die danach zu groß sind.
- Ein Akteur mit zugeteilter Delegation und eine vergebene Einzelrolle lassen sich nicht löschen. Löschst du eine Rolle, verschwinden die Bewerbungen auf sie mit.

### Hinweise {#seat-planning-hints}

Neben der Matrix sammelt die Spalte **Hinweise**, was auffällt:

- **Rollen je Delegationsgröße** zeigt, wie viele Rollen es je Größe gibt. Ein Klick auf eine Größe filtert die Matrix darauf.
- **Sitze je Gremium** zählt die Sitze. Ein Klick sortiert die Matrix nach diesem Gremium.
- **Größenlimits** markiert Rollen außerhalb einer **Min.** und **Max.** Delegationsgröße. Die Limits werden nur in deinem Browser gespeichert.
- Jede Delegation sollte zwischen mindestens drei Rollen genau ihrer Größe wählen können. Die Hinweise nennen Größen mit zu wenigen Rollen, Staaten, die einen Sitz daneben liegen, und Rollen mit nur einem Sitz.
- **Regionale Ausgewogenheit** vergleicht jedes Gremium mit seiner **Vergleichsbasis** und schlägt vor, welcher Staat einen Sitz bekommen oder abgeben kann. Als Vergleichsbasis wählst du je Gremium **UN 193** (Standard), **Menschenrechtsrat**, **ECOSOC**, **Sicherheitsrat** oder **Manuell** mit eigenen Zielwerten je Regionalgruppe, die **Zielwerte übernehmen** speichert.
- **Staaten ohne Sitz** zählt je Regionalgruppe die Staaten ohne Sitz. Ein Klick filtert die Matrix auf sie.

:::warning Nach Bewerbungsstart
Sobald die Konferenz nicht mehr **Vor Bewerbungsstart** ist, zeigt die Seite **Die Bewerbungsphase hat bereits begonnen**. Jede Änderung ist sofort öffentlich auf der [Übersicht der Plätze](#public-seats) zu sehen. Bewerbungen auf Rollen, die danach nicht mehr zur Größe der Delegation passen, werden entfernt.
:::

:::note Wer auf welchem Platz sitzt
Die Sitzplanung legt nur fest, welche Rollen es gibt. Wer welchen Platz hat, zeigt die Seite **Plätze**. Dort setzt die Teilnehmendenbetreuung Personen auf Plätze und tauscht sie, siehe [Plätze vergeben und tauschen](./participants#seats).
:::

## Öffentliche Übersicht der Plätze {#public-seats}

Die Seite **Plätze der Konferenz** zeigt, welche Rollen die Konferenz anbietet, in drei Reitern: **Gremien und Themen** mit den Themen jedes Gremiums, **Länderpool** mit den Staaten und ihren Sitzen und **Nichtstaatliche Akteure**. Sie ist öffentlich, solange die Konferenz es ist, also auch ohne Anmeldung zu sehen. Das Team erreicht sie über **Plätze der Konferenz** auf seinem Dashboard, Teilnehmende über ihren Schnellzugriff. Sie folgt jeder Änderung der Sitzplanung sofort.
