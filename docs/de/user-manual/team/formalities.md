---
title: Formalitäten und Konferenz vor Ort
description: Zahlungen und postalische Anmeldung abhaken, den Check-in vorbereiten, mit dem Scanner arbeiten und Zertifikate ausstellen
---

# Formalitäten und Konferenz vor Ort

Bevor jemand an der Konferenz teilnimmt, müssen der Beitrag bezahlt und die Unterlagen per Post eingegangen sein. Vor Ort holen die Teilnehmenden ihre Namensschilder ab, das Team scannt sie bei Check-ins, und nach der Konferenz gibt es Zertifikate. Dafür gibt es im Team-Bereich unter **Arbeitsabläufe** vier Seiten:

| Seite                     | Wofür                                           | Wer sie öffnen darf                            |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| **Beitragszahlung**       | Überweisungen zuordnen und bestätigen           | **Projektleitung**, **Teilnehmendenbetreuung** |
| **Postalische Anmeldung** | eingegangene Briefe abhaken                     | **Projektleitung**, **Teilnehmendenbetreuung** |
| **Anmeldung vor Ort**     | Namensschild-Tische und QR-Code für den Eingang | **Projektleitung**, **Teilnehmendenbetreuung** |
| **Einlass & Anwesenheit** | Scanner: Personen prüfen und Check-ins erfassen | das ganze Team                                 |

Was auf diesen Seiten der **Teilnehmendenbetreuung** vorbehalten ist, darf auch die **Projektleitung**. Alle Status einer Person findest du außerdem in ihrer [Teilnehmendenkarte](./participants#user-card): Zahlung und Unterlagen im Reiter **Formalitäten**, Zugangsausweis und Anwesenheit im Reiter **Zugang & Anwesenheit**.

## Zahlungen {#payments}

### Wie Teilnehmende zahlen

Sobald **Zahlungen erlauben** eingeschaltet ist (siehe [Status und Phasen](./configuration#stages)), erzeugen Teilnehmende auf ihrem Dashboard eine Überweisungs-Referenz und überweisen den Beitrag mit ihr als Verwendungszweck. Wie das für sie aussieht, steht unter [Zahlung](../participant/dashboard#payment).

- Eine Referenz kann mehrere Personen abdecken. Der Betrag ist dann der **Teilnahmebeitrag** mal die Zahl der Personen.
- Mitbezahlen kann man für sich selbst, die eigene Delegation, die Teilnehmenden, die man betreut, und Betreuende, mit denen man eine betreute Person teilt. Alles andere lehnt DELEGATOR ab.
- Wer schon bezahlt hat, erstellt keine neue Referenz und kann in keine neue aufgenommen werden.
- Ist in den [Überweisungsinformationen](./configuration#payment-details) kein Beitrag hinterlegt, lässt sich keine Referenz erstellen.

Eine Referenz besteht aus 16 Zeichen in Vierergruppen mit Bindestrichen, etwa `ACDE-FH34-…`. Sie enthält keine leicht verwechselbaren Zeichen.

### Eine Zahlung bestätigen {#confirming-a-payment}

Die Seite **Beitragszahlung** ist dafür gemacht, einen Kontoauszug Zeile für Zeile abzuarbeiten:

1. Oben steht die zuletzt bestätigte Transaktion mit Datum. So siehst du, wo du oder jemand anderes aufgehört hat.
2. Gib die Referenz aus dem Verwendungszweck in **Referenzsuche** ein, genau wie sie dort steht. Auch die Befehlspalette (Strg+K) findet Referenzen und öffnet sie auf dieser Seite.
3. Die Seite zeigt die Referenz, wann sie erstellt wurde, den Betrag, der für sie fällig ist, und unter **Referenzierte Teilnehmende** alle Personen, die sie abdeckt. Das Symbol vor jedem Namen zeigt deren Zahlungsstatus, der Knopf dahinter öffnet die Teilnehmendenkarte.
4. Vergleiche den Betrag mit dem, was eingegangen ist. Passt alles, klicke **Als erhalten markieren** (Alt+A). Das Suchfeld leert sich und ist bereit für die nächste Referenz.
5. Passt etwas nicht, klicke **Als Problem markieren**.

Findet die Seite nichts, steht dort **Keine Überweisung mit dieser Referenz gefunden**. Die zuletzt geöffneten Referenzen stehen in einer Liste neben dem Ergebnis, damit du schnell zu einer zurückspringen kannst.

### Was die Knöpfe bewirken

**Als erhalten markieren** speichert den heutigen Tag als Eingangsdatum und setzt den Zahlungsstatus **jeder** Person, die die Referenz abdeckt, auf **Erledigt**. Die zahlende Person selbst zählt nur, wenn sie auch abgedeckt ist. **Als Problem markieren** setzt alle abgedeckten Personen auf **Problem**.

| Status         | Was folgt                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ausstehend** | Der Anfangszustand. Am Einlass erscheint **Beitragszahlung ist noch offen**.                                                                                                                        |
| **Problem**    | Die E-Mail **Problem mit Unterlagen oder Zahlung** wird fällig. Sie nennt die Zahlung und bittet, sich bei der Teilnehmendenbetreuung zu melden, ohne Details. Am Einlass bleibt die Zahlung offen. |
| **Erledigt**   | Die E-Mail **Zahlung eingegangen** wird fällig. Die Person erstellt keine neuen Referenzen mehr und kann in keine neue aufgenommen werden. Am Einlass ist die Zahlung kein offener Punkt mehr.      |

Beide E-Mails werden nur für Personen mit Platz fällig, sobald die Zuteilung freigegeben ist, und für Betreuende, die selbst mitfahren und eine betreute Person mit Platz haben. Ob sie sofort rausgehen oder auf der Seite [E-Mails](./communication#emails) warten, hängt davon ab, ob die Art auf automatisch steht. Jede dieser E-Mails geht an jede Person höchstens einmal.

### Rückgängig machen

Auf der Seite **Beitragszahlung** lässt sich eine bestätigte Referenz nicht zurücksetzen: Sie zeigt dann **Die Transaktion wurde mit Überweisung vom … als erhalten markiert!** und nur noch **Schließen**. Den Status einer Person änderst du in ihrer Teilnehmendenkarte im Reiter **Formalitäten** unter **Beitragszahlung**. Darunter stehen ihre **Zahlungsreferenzen**, mit wem sie geteilt sind und ob sie eingegangen sind.

:::warning Was sich nicht zurückholen lässt
Der Status in der Teilnehmendenkarte gilt nur für diese eine Person, die Referenz bleibt als erhalten markiert. Eine E-Mail, die schon verschickt ist, holt das Zurücksetzen nicht zurück. Steht die Person wieder auf **Ausstehend**, kann sie eine neue Referenz erstellen.
:::

## Postalische Anmeldung {#postal-registration}

### Was Teilnehmende schicken

Sobald **Postalische Anmeldungen erlauben** eingeschaltet ist, laden Teilnehmende ihre Unterlagen als PDF herunter, unterschreiben sie und schicken die Originale an die Postadresse aus den [Dokumenten und Vorlagen](./configuration#documents). Wie das für sie aussieht, steht unter [Postalische Anmeldung](../participant/dashboard#postal-registration). Das PDF enthält:

- die **Verbindliche Anmeldung**,
- die **Einwilligung der Erziehungsberechtigten**, wenn die Person zu Konferenzbeginn noch nicht 18 ist,
- die **Einwilligung Bildnutzung**,
- die Teilnahmebedingungen, die nur angehängt werden und keinen eigenen Status haben.

Unten rechts auf jeder Seite steht ein QR-Code, der die Person und die Konferenz nennt und von DELEGATOR signiert ist. Fehlen jemandem die Unterlagen, lädt die Teilnehmendenbetreuung sie in der Teilnehmendenkarte im Reiter **Formalitäten** mit **Dokumente für postalische Anmeldung herunterladen** herunter.

### Die Status je Dokument

| Feld                                        | Werte                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Verbindliche Anmeldung**                  | **Ausstehend**, **Problem**, **Erledigt**                                                                                                       |
| **Einwilligung der Erziehungsberechtigten** | wie oben, nur bei Minderjährigen. Bei Volljährigen steht dort **Keine Einwilligung der Erziehungsberechtigten benötigt**.                       |
| **Einwilligung Bildnutzung**                | **Ausstehend**, **Problem**, **Erledigt**                                                                                                       |
| **Fotostatus**                              | **Noch nicht festgelegt**, **Keine Fotos erlaubt**, **Teilweise erlaubt – Einwilligung im Einzelnen prüfen**, **Fotos uneingeschränkt erlaubt** |
| **Dokumentennummer**                        | eine Zahl je Person                                                                                                                             |

Der **Fotostatus** sagt, was die Person auf der Einwilligung zur Bildnutzung angekreuzt hat. Er steht in den Daten für die gedruckten Namensschilder auf der Seite [Downloads](./maintenance#downloads).

### Einen Stapel Briefe abarbeiten {#processing-letters}

1. Öffne **Postalische Anmeldung**. Du kannst mit der Kamera scannen, mit einem Handscanner, der in das Suchfeld tippt, oder nach Name, E-Mail oder ID suchen.
2. Scanne den QR-Code auf einer Seite des Briefs. Neben dem Scanner öffnet sich die Person mit Name, Geburtsdatum und allen Status. Vergleiche sie mit dem Brief.
3. Sind alle nötigen Dokumente unterschrieben da und erlaubt die Person Fotos ohne Einschränkung, klicke **Alle bestätigen** (Alt+A). Das setzt **Verbindliche Anmeldung** und **Einwilligung Bildnutzung** auf **Erledigt**, bei Minderjährigen auch die **Einwilligung der Erziehungsberechtigten**, und den **Fotostatus** auf **Fotos uneingeschränkt erlaubt**.
4. Hat die Person Fotos eingeschränkt, setze die Dokumente einzeln auf **Erledigt** und danach den **Fotostatus**: Alt+1 für keine Fotos, Alt+2 für teilweise, Alt+3 für uneingeschränkt.
5. Hat die Person noch keine **Dokumentennummer**, ist das Feld schon offen. **Nächste Nummer speichern** (Alt+N) vergibt die Zahl nach der höchsten Nummer der Konferenz. Du kannst auch eine eigene eintragen und speichern.
6. Fehlt ein Dokument oder ist es fehlerhaft, setze nur dieses auf **Problem** und die anderen einzeln auf **Erledigt**.
7. Esc schließt die Person, der Scanner ist bereit für den nächsten Brief.

:::tip Die Dokumentennummer auf den Brief schreiben
Schreib die vergebene **Dokumentennummer** auf die Blätter und hefte sie in der Reihenfolge ihres Eingangs ab. So musst du die Briefe nicht nach Namen sortieren: Brauchst du später ein Original, steht seine Nummer in der Teilnehmendenkarte der Person, und du findest es im Ordner sofort.
:::

Jede Änderung speichert sofort, ohne Rückfrage. Einen falschen Klick korrigierst du, indem du den richtigen Status wählst, hier oder in der Teilnehmendenkarte.

Öffnet die Teilnehmendenbetreuung den QR-Code mit der Kamera-App des Handys, landet sie direkt auf dieser Seite bei der Person. Den Code eines digitalen Namensschilds nimmt diese Seite nicht an (**Dieser Code ist nicht für diesen Scanner gedacht.**), ebenso keine QR-Codes, die nicht von DELEGATOR signiert sind, und keine Codes einer anderen Konferenz.

### Was die Status bewirken

- Sind **Verbindliche Anmeldung**, **Einwilligung Bildnutzung** und bei Minderjährigen die **Einwilligung der Erziehungsberechtigten** auf **Erledigt**, wird die E-Mail **Unterlagen eingegangen** fällig.
- Steht eines dieser Dokumente auf **Problem**, wird **Problem mit Unterlagen oder Zahlung** fällig, je Dokument höchstens einmal. Sie nennt das Dokument, nicht das Problem. Das klärst du persönlich.
- Am Einlass zählen nur die **Verbindliche Anmeldung** und bei Minderjährigen die **Einwilligung der Erziehungsberechtigten**. Die Einwilligung zur Bildnutzung hält dort niemanden auf.

Auch diese E-Mails werden nur für Personen mit Platz nach der Freigabe fällig. 14 Tage vor Konferenzbeginn erinnert die E-Mail **Erinnerung an offene Unterlagen und Zahlung** alle, bei denen freigeschaltete Unterlagen oder die Zahlung noch offen sind.

## Anmeldung vor Ort {#check-in}

Am Eingang holen die Teilnehmenden ihre Namensschilder ab. Damit sich die Schlange aufteilt, verteilt DELEGATOR sie nach dem Anfangsbuchstaben ihrer Nation auf Tische. Presse, Einzelrollen, nichtstaatliche Akteure und Betreuende bekommen immer einen weiteren Tisch für sich. Wer noch offene Punkte hat, wird stattdessen zur Teilnehmendenbetreuung geschickt.

### Die Tische einrichten

Auf der Seite **Anmeldung vor Ort** legst du mit **Anzahl der Namensschild-Gruppen** fest, wie viele Tische es für die Nationen gibt (1 bis 20). Die **Aufteilung der Namensschild-Tische** darunter folgt der Eingabe sofort: Jeder Tisch zeigt seine Buchstaben, wie viele Personen er bedient, und darunter die Nationen und Rollen mit ihrer Zahl. Erst **Speichern** übernimmt die Anzahl. Speichern darf nur die **Projektleitung**.

- **QR-Code herunterladen (PDF)** erzeugt ein Blatt für den Eingang mit „Bitte scannen und bereithalten!“. Der QR-Code führt zur Check-in-Seite der Teilnehmenden.
- **Seite ansehen** zeigt diese Seite, wie sie auf einem Handy aussieht.
- **Tischschilder herunterladen (PDF)** erzeugt ein Schild je Tisch mit den Buchstaben groß und den Nationen und Rollen darunter.

:::warning Erst speichern, dann drucken
Die Check-in-Seite der Teilnehmenden verteilt nach der **gespeicherten** Anzahl, die Downloads nach der Zahl im Feld. Speichere also, bevor du die Tischschilder druckst. Die Aufteilung folgt außerdem der Zuteilung: Ändert sich die Zuteilung, können Nationen den Tisch wechseln. Drucke die Schilder deshalb erst, wenn die Zuteilung steht.
:::

Die Namensschilder selbst und die NSA-Karten kommen von der Seite [Downloads](./maintenance#downloads).

### Die Check-in-Seite der Teilnehmenden

Den QR-Code am Eingang scannen Teilnehmende mit dem eigenen Handy. Ihre Seite zeigt Name, Rolle, Gremium und den Code ihres digitalen Namensschilds und oben, wohin sie gehen:

- den **Tisch** mit seinen Buchstaben, wenn nichts offen ist,
- **Bitte geh zur Teilnehmendenbetreuung** mit den offenen Punkten,
- **Bitte geh zur Teilnehmendenbetreuung** und **Dir ist noch kein Platz zugewiesen.**, solange die Person keinen Platz hat oder die Zuteilung nicht freigegeben ist.

Ändert jemand im Team einen Status, ändert sich die Seite sofort mit. Nach einem Scan in irgendeiner Sitzung zeigt sie eine Stunde lang **Bereits eingecheckt** mit der Uhrzeit.

### Die Prüfung am Einlass {#entrance-check}

Die Prüfung macht der Server, gleich ob am Scanner oder auf der Check-in-Seite. Offene Punkte sind, in dieser Reihenfolge:

| Offener Punkt                                                                                                                                    | Wann                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Teammitglied: wird nur angezeigt, nicht eingescannt.**                                                                                         | Die Person ist im Team und nimmt nicht teil.                                                                                           |
| **Diese Person nimmt an der aktuell angezeigten Konferenz nicht teil. Die angezeigten Daten gehören zu ihrem Konto, nicht zu dieser Konferenz.** | Die Person nimmt in dieser Konferenz in keiner Rolle teil und steht nicht auf ihrer Warteliste.                                        |
| **Beitragszahlung ist noch offen**                                                                                                               | Die Zahlung steht nicht auf **Erledigt**, also auch bei **Problem**.                                                                   |
| **Verbindliche Anmeldung ist noch offen**                                                                                                        | Die verbindliche Anmeldung steht nicht auf **Erledigt**.                                                                               |
| **Minderjährig, die Einverständniserklärung der Erziehungsberechtigten fehlt**                                                                   | Die Person ist am Tag des Scans unter 18 und die Einwilligung steht nicht auf **Erledigt**. Ohne Geburtsdatum gilt sie als volljährig. |
| **Hat … nicht gewählt**                                                                                                                          | Nur in einer Sitzung, die eine [Umfrageauswahl erwartet](#sessions).                                                                   |
| **Diese teilnehmende Person wurde in dieser Sitzung bereits gescannt**                                                                           | Nur beim Scannen in einer Sitzung.                                                                                                     |

Mit offenen Punkten kann das Team eine Person mit **Trotzdem erfassen** dennoch erfassen. Das geht nicht bei Teammitgliedern, bei Personen, die nicht teilnehmen, und bei einem zweiten Scan in derselben Sitzung.

### Der Morgen des ersten Konferenztags {#first-morning}

Vorher:

1. Die **Projektleitung** speichert die Anzahl der Tische, sobald die Zuteilung steht.
2. Lade die Tischschilder und den QR-Code herunter und drucke sie. Sortiere die gedruckten Namensschilder nach der Liste je Tisch.
3. Die Teilnehmendenbetreuung startet auf **Einlass & Anwesenheit** eine Sitzung der Art **Prüfen**, etwa „Check-in Tag 1“.
4. Alle, die scannen, öffnen dieselbe Seite auf ihrem Handy und klicken bei dieser Sitzung **Beitreten**.

Am Eingang:

5. Die Teilnehmenden scannen den QR-Code am Eingang und gehen an ihren Tisch oder zur Teilnehmendenbetreuung.
6. An der Einlasskontrolle, getrennt von den Tischen, scannt das Team den Code auf ihrer Check-in-Seite. Ist alles in Ordnung, ist der Check-in erfasst und der Scanner gleich bereit für die nächste Person. Die Seite der Person zeigt jetzt **Bereits eingecheckt**.
7. Bei offenen Punkten schickst du die Person zur Teilnehmendenbetreuung und klickst **Verwerfen** (Esc). Erfasst ist dann nichts.

### Jemand kommt ohne bezahlten Beitrag {#unpaid-on-site}

1. Der Scan zeigt **Beitragszahlung ist noch offen**. Klicke **Verwerfen** und schick die Person zur Teilnehmendenbetreuung. Ihre Check-in-Seite sagt ihr dasselbe.
2. Die Teilnehmendenbetreuung öffnet die Person, etwa mit **Details** im Scanergebnis, und sieht im Reiter **Formalitäten** unter **Zahlungsreferenzen**, ob die Person eine Referenz erstellt hat und ob sie eingegangen ist.
3. Ist das Geld da und nur nicht bestätigt, bestätigt sie die Referenz auf [Beitragszahlung](#confirming-a-payment). Die Check-in-Seite der Person zeigt danach sofort ihren Tisch.
4. Ein neuer Scan besteht die Prüfung und wird erfasst. Entscheidet das Team, die Person trotzdem einzulassen, erfasst **Trotzdem erfassen** sie. Der Scan ist dann als „mit offenen Punkten“ markiert.

## Der Scanner {#scanner}

Die Seite **Einlass & Anwesenheit** scannt Teilnehmende bei jedem Anlass, an dem das Team wissen will, wer da war: am Einlass, bei einer Feier, bei einer Exkursion. Jeder Scan gehört zu einer Sitzung.

### Sitzungen {#sessions}

Es gibt drei Arten zu scannen:

| Art          | Was ein Scan tut                                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prüfen**   | Zeigt die Person und offene Punkte. Ohne offene Punkte wird erfasst und es geht gleich weiter, mit offenen Punkten nur auf ausdrücklichen Wunsch.    |
| **Erfassen** | Erfasst nur, dass die Person gescannt wurde, ohne anzuhalten und ohne zu prüfen.                                                                     |
| **Info**     | Zeigt die Person und offene Punkte wie beim Prüfen, speichert aber nichts. Für Ansprechpersonen bei Fragen von Teilnehmenden. Braucht keine Sitzung. |

**Eine Sitzung starten** dürfen nur **Teilnehmendenbetreuung** und **Projektleitung**:

1. Klicke unter **Sitzungen** auf **Neue Sitzung**.
2. Wähle die **Art der Sitzung**.
3. Beim Prüfen kannst du unter **Erwartete Umfrageauswahl** Optionen einer Umfrage ankreuzen. Wer keine davon gewählt hat, bekommt beim Scan **Hat … nicht gewählt** als offenen Punkt. So prüfst du etwa beim Einstieg in einen Bus, wer sich für diese Exkursion angemeldet hat.
4. Gib den **Sitzungsname** ein und klicke **Sitzung starten**.

Art und erwartete Umfrageauswahl stehen ab dem Start fest. Ein Sitzungsname gilt in der Konferenz nur einmal, ohne Rücksicht auf Groß- und Kleinschreibung. Ist er schon vergeben, antwortet DELEGATOR **Es gibt bereits eine Sitzung mit diesem Namen. Tritt ihr bei oder wähle einen anderen Namen.**

**Beitreten** kann jede\*r im Team: Laufende Sitzungen stehen oben in der Liste, mit Art und seit wann sie laufen. Mehrere Geräte arbeiten so in einer Sitzung. Die Sitzung selbst weiß, wer gescannt ist, also zählt eine Person einmal, egal an welchem Gerät. **Info starten** steht allen jederzeit offen.

- **Sitzung wechseln** (der Pfeil links) verlässt die Sitzung nur auf diesem Gerät. Für alle anderen läuft sie weiter.
- **Sitzung beenden** beendet sie für alle Geräte. Das darf nur die Teilnehmendenbetreuung.
- Den Namen ändert die Teilnehmendenbetreuung, indem sie ihn anklickt, in der Leiste oben oder in der Liste.
- Beendete Sitzungen sieht nur die Teilnehmendenbetreuung. **Wieder öffnen** setzt eine fort, ihre bisherigen Scans bleiben. Starte für denselben Anlass keine neue Sitzung, sondern öffne die alte wieder.

### Was sich scannen lässt

- der QR-Code des **digitalen Namensschilds** vom Dashboard oder von der Check-in-Seite einer Person. Er gilt zehn Minuten und erneuert sich, solange er angezeigt wird. Ein abgelaufener Code antwortet **Dieser Code ist abgelaufen. Die Person soll die Seite neu öffnen und den Code erneut zeigen.**
- der Barcode eines **gedruckten Namensschilds**
- eine Person, die du über das Suchfeld nach Name oder E-Mail findest, oder ihre ID. Ein Handscanner tippt ebenfalls in dieses Feld.

Nicht angenommen werden der QR-Code der Anmeldeunterlagen und NSA-Karten (**Dieser Code ist nicht für diesen Scanner gedacht.**), QR-Codes ohne Signatur und Codes einer anderen Konferenz. NSA-Karten prüft MUNify CHASE.

Öffnet jemand aus dem Team den Code eines Namensschilds mit der Kamera-App des Handys, landet die Teilnehmendenbetreuung in der Teilnehmendenkarte, alle anderen auf dieser Seite. Läuft dort gerade eine Sitzung, zählt das als Scan in ihr, sonst wird die Person im Modus **Info** angezeigt.

### Was ein Scan zeigt und bewirkt

Beim Prüfen und bei **Info** erscheint neben der Kamera die Person: Name, Geburtsdatum, Rolle und Gremium, die Status **Beitragszahlung**, **Verbindliche Anmeldung** und **Anwesenheit**, dann **Alles in Ordnung** oder **Offene Punkte** mit der Liste.

- **Alles in Ordnung** beim Prüfen: Der Scan ist erfasst, der Scanner ist sofort bereit. Im Modus **Info** wird auch dann nichts erfasst.
- **Offene Punkte** beim Prüfen: **Verwerfen** (Esc) erfasst nichts, **Trotzdem erfassen** (Alt+A) erfasst die Person mit dem Vermerk, dass es offene Punkte gab.
- Bei einem Teammitglied und bei offenen Punkten im Modus **Info** geht es mit **Verstanden, weiter** (Alt+A) weiter. Erfasst wird dabei nichts.

Die Teilnehmendenbetreuung kann Vor- und Nachname und Geburtsdatum hier direkt korrigieren, indem sie sie anklickt. **Details** öffnet die Teilnehmendenkarte.

Beim **Erfassen** zeigt der Scanner niemanden an, jeder Scan geht sofort in die Liste **Letzte Scans**. Sie zeigt die letzten fünf Scans dieses Geräts mit ihrem Stand. Ein Klick auf einen Namen zeigt die Person erneut, beim Erfassen in ihrer Teilnehmendenkarte, und erfasst keinen neuen Scan.

Was der Scanner melden kann:

| Meldung                                                                            | Bedeutung                                                                        |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Anwesenheit erfasst**                                                            | Der Scan ist gespeichert.                                                        |
| **Diese teilnehmende Person wurde in dieser Sitzung bereits gescannt**             | Sie wurde schon erfasst, an diesem oder einem anderen Gerät. Es bleibt ein Scan. |
| **Kein\*e Teilnehmer\*in mit dieser ID gefunden.**                                 | Beim Prüfen und bei **Info**: Der Code gehört zu niemandem in dieser Konferenz.  |
| **Diese Person nimmt nicht an der Konferenz teil.**                                | Beim Erfassen: Der Code gehört zu niemandem, der in dieser Konferenz teilnimmt.  |
| **Teammitglieder werden nicht eingescannt; der Scanner erfasst nur Teilnehmende.** | Ein Teammitglied wurde beim Erfassen gescannt.                                   |
| **Netzwerkfehler — automatischer erneuter Versuch**                                | Der Scan wartet auf dem Gerät und wird wieder gesendet.                          |

Oben in der Leiste zählt der Scanner die Scans dieses Geräts, wie viele **synchronisiert**, **ausstehend** und fehlerhaft sind.

:::note Erfassen ist nicht Anwesenheit
Ein Scan setzt die **Anwesenheit** einer Person nicht auf **Anwesend**. Sie entscheidet über das Zertifikat und wird getrennt gesetzt, siehe [Zertifikate](#certificates).
:::

### Ohne Verbindung

Die Codes prüft das Gerät selbst, der Scanner erkennt falsche Codes also auch offline. Dafür muss die Seite einmal online gewesen sein, sonst steht dort **Die Prüfung der Codes ist noch nicht verfügbar (bisher keine Verbindung). Gleich noch einmal versuchen.**

- **Erfassen** funktioniert offline. Die Scans warten im Browser des Geräts und gehen raus, sobald es wieder Verbindung hat, auch nach einem Neuladen der Seite. Eine offline gestartete Sitzung entsteht mit dem ersten gesendeten Scan.
- **Prüfen** und **Info** brauchen eine Verbindung: **Prüfen braucht eine Verbindung. Im Modus „Erfassen“ geht es auch offline.**
- Wurde der Name einer offline gestarteten Sitzung inzwischen vergeben, warten ihre Scans, bis du sie umbenennst.
- **Backup herunterladen** speichert die Scans dieses Geräts in der Sitzung als Datei.

Verlässt du eine Sitzung mit Scans, die noch nicht gesendet sind, fragt DELEGATOR **Es gibt noch nicht übertragene Scans. Sitzung trotzdem beenden?** Wer bestätigt, verliert diese Scans auf dem Gerät.

### Gescannte Personen und Export

Für die Teilnehmendenbetreuung steht unter dem Scanner die Liste **Gescannte Personen** der laufenden Sitzung, mit den Scans aller Geräte. In der Liste **Sitzungen** öffnet **Personen anzeigen** dieselbe Liste für jede Sitzung, auch für beendete. Jede Sitzung zeigt dort außerdem, wie viele Scans sie hat.

- Die Suche findet nach Name, E-Mail oder Ausweisnummer.
- Jede Zeile zeigt Zeit, **gescannt von** und die Zugangsausweis-Nr. Ein Warnsymbol markiert Scans, die mit offenen Punkten erfasst wurden.
- Der Papierkorb entfernt einen Scan nach der Rückfrage **Den Scan von … aus dieser Sitzung entfernen? Die Person kann danach wieder gescannt werden.**
- **CSV exportieren** lädt alle Scans der Sitzung herunter, unabhängig von der Suche, mit **Zeitstempel**, **Vorname**, **Nachname**, **E-Mail**, **Zugangsausweis-Nr.**, **Prüfung bestanden**, **Gescannt von** und **Benutzer-ID**. Bei Sitzungen der Art **Erfassen** bleibt **Prüfung bestanden** leer.

Alle Scans einer Person über alle Sitzungen stehen in ihrer Teilnehmendenkarte im Reiter **Zugang & Anwesenheit** im **Anwesenheitsprotokoll**.

### Zugangsausweise und ein verlorener Ausweis {#access-cards}

Im Reiter **Zugang & Anwesenheit** der Teilnehmendenkarte trägt die Teilnehmendenbetreuung die **Zugangsausweis-Nr.** ein. Eine Nummer gehört in einer Konferenz nur einer Person: **Dieser Zugangsausweis gehört bereits jemand anderem.** Die Befehlspalette (Strg+K) findet Personen auch über ihre Ausweisnummer.

Gibt jemand einen gefundenen Ausweis ab:

1. Tippe oder scanne die Nummer in die Befehlspalette und öffne die Person.
2. Klicke im Reiter **Zugang & Anwesenheit** neben der Nummer auf **Ausweis gefunden** und bestätige **Benachrichtigung senden?**.
3. Die E-Mail **Zugangsausweis gefunden** geht sofort raus, auch wenn sonst nichts automatisch verschickt wird. Sie bittet die Person, den Ausweis bei der Teilnehmendenbetreuung abzuholen.

Jede Bestätigung verschickt die E-Mail erneut. Ihren Text änderst du auf der Seite [E-Mails](./communication#emails).

## Zertifikate {#certificates}

Ist die Konferenz **Nach der Konferenz**, laden Teilnehmende ihr Teilnahmezertifikat auf dem Dashboard herunter, siehe [Nach der Konferenz](../participant/dashboard#certificate). Gedruckt wird es auf die Vorlage aus [Dokumente und Vorlagen](./configuration#documents), angeordnet wie unter [Felder auf der Vorlage platzieren](./configuration#document-layouts).

### Wer ein Zertifikat bekommt

Ein Zertifikat bekommt nur, wessen **Anwesenheit** auf **Anwesend** steht. Für alle anderen gibt es keines, das Dashboard sagt ihnen, dass es noch nicht zur Verfügung steht. Die Anwesenheit setzt kein Scan, sondern:

- die Teilnehmendenkarte im Reiter **Zugang & Anwesenheit** mit **Anwesend** oder **Abwesend**,
- der [Import](./maintenance#import) von Anwesenheitsdaten,
- der [Helfer](./maintenance#helper), der alle Teilnehmenden auf einmal auf **Anwesend** oder **Abwesend** setzt.

Die Teilnehmendenbetreuung lädt das Zertifikat einer Person in ihrer Teilnehmendenkarte im Reiter **Formalitäten** mit **Zertifikat herunterladen** herunter.

### Welche Sitzungen darauf stehen

Das Zertifikat listet die Sitzungen des Scanners, in denen die Person gescannt wurde, in der Reihenfolge ihres Starts. Sitzungen, die sie verpasst hat, erwähnt es nie, auch nicht in den signierten Daten.

In der Liste **Sitzungen** auf **Einlass & Anwesenheit** hat jede Sitzung den Schalter **Auf Zertifikat**. Jede Sitzung, in der gescannt wurde, steht zunächst darauf. Nimm Sitzungen heraus, die nicht darauf gehören, etwa Probeläufe. Das darf die Teilnehmendenbetreuung.

:::warning Vor dem Herunterladen entscheiden
Die Liste wird beim Herunterladen in das Zertifikat geschrieben und signiert. Wer sein Zertifikat schon hat, behält die Liste von damals. Entscheide also, welche Sitzungen auf das Zertifikat gehören, bevor die Konferenz auf **Nach der Konferenz** steht.
:::

### Die Echtheitsprüfung

Der QR-Code auf dem Zertifikat führt zu einer öffentlichen Seite, die jede\*r ohne Anmeldung öffnen kann. Sie zeigt **Das Zertifikat ist gültig.** mit Name, Konferenz, Datum und unter **Teilgenommen an** die Sitzungen, oder **Das Zertifikat ist ungültig.** Zertifikate, die DELEGATOR früher in einem älteren Format ausgestellt hat, prüft sie weiterhin.

### Die E-Mail

Die E-Mail **Zertifikat verfügbar** wird für alle mit **Anwesend** fällig, sobald die Konferenz auf **Nach der Konferenz** steht und eine Zertifikatsvorlage hinterlegt ist. Wer erst später auf **Anwesend** gesetzt wird, bekommt sie dann. Speicherst du in den Einstellungen den Status oder eine neue Vorlage, bietet die Seite an, die E-Mails gleich zu verschicken. Sonst warten sie auf der Seite [E-Mails](./communication#emails).
