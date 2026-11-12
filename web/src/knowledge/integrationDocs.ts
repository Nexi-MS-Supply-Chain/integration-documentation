// Mock PDF documents for /viden/integrationer (plans/integrationssoegning.md, phase 1). Replaced by the knowledge
// search API in phase 2 — keep the shape close to what the server will return.

export type Integration = "terminal" | "baxi" | "sofie";
export type DocType = "spec" | "fejlkoder" | "opsaetning" | "release" | "drift";

export type PdfPage = { n: number; heading: string; text: string };
export type PdfDoc = {
  id: string;
  filename: string;
  title: string;
  integration: Integration;
  type: DocType;
  version: string;
  updated: string;
  sizeBytes: number;
  pages: PdfPage[];
};

export const INTEGRATIONS: Record<Integration, { label: string; description: string; color: string }> = {
  terminal: { label: "Terminal", description: "Betalingsterminaler, ECR-protokol og opsætning i butik", color: "#0d9488" },
  baxi: { label: "Baxi", description: "Nets/Nexi BAXI-bibliotek, transaktioner og resultatkoder", color: "#2563eb" },
  sofie: { label: "Sofie", description: "Sofie-API til ordrer, afregning og bogføring", color: "#c026d3" },
};

export const DOC_TYPES: Record<DocType, string> = {
  spec: "Specifikation",
  fejlkoder: "Fejlkoder",
  opsaetning: "Opsætning",
  release: "Release notes",
  drift: "Drift og fejlfinding",
};

export const PDF_DOCS: PdfDoc[] = [
  {
    id: "term-ecr-spec",
    filename: "Terminal_ECR_Protokol_v3.2.pdf",
    title: "ECR-protokol for betalingsterminaler",
    integration: "terminal",
    type: "spec",
    version: "3.2",
    updated: "2026-09-18",
    sizeBytes: 2_480_112,
    pages: [
      { n: 1, heading: "Indledning", text: "Dette dokument beskriver kommunikationen mellem kasseapparatet (ECR) og betalingsterminalen. Terminalen forbindes via TCP/IP på port 9600 eller via USB i serial-tilstand. Alle beskeder er STX/ETX-indrammede og afsluttes med en LRC-kontrolsum." },
      { n: 2, heading: "Forbindelse og handshake", text: "ECR sender en Login-besked med terminal-id (TID) og operatør-id. Terminalen svarer med ACK inden for 2 sekunder. Udebliver ACK, gentages beskeden højst 3 gange med 500 ms mellemrum, hvorefter forbindelsen lukkes med fejlkode T-104 Timeout på handshake." },
      { n: 3, heading: "Købstransaktion", text: "En købstransaktion startes med TransferAmount (type 0x30) med beløb i øre og valuta 208 (DKK). Terminalen viser beløbet, kortholder indsætter eller tapper kortet, og resultatet returneres som LocalMode-besked med resultatkode, autorisationskode og maskeret PAN." },
      { n: 4, heading: "Annullering og refusion", text: "Annullering (reversal) skal sendes, før terminalens dagsafslutning er kørt. Efter dagsafslutning bruges refusion (type 0x31). Refusion kræver operatør-PIN, når beløbet overstiger grænsen, der er sat i terminalprofilen." },
      { n: 5, heading: "Dagsafslutning", text: "Dagsafslutning (Reconciliation, type 0x60) sender alle transaktioner til indløser og nulstiller terminalens totaler. Rapporten returneres som kvitteringstekst og kan videresendes til Sofie som afregningsgrundlag." },
      { n: 6, heading: "Kvitteringer", text: "Kvitteringstekst sendes i PrintText-beskeder med højst 40 tegn pr. linje. ECR skal gemme kundekvittering og butikskvittering i mindst 5 år, jf. bogføringsloven. Signaturkvittering bruges kun ved fallback til magnetstribe." },
      { n: 7, heading: "Sikker forbindelse (TLS) trin for trin", text: "Forbindelsen mellem ECR og terminal krypteres med TLS 1.2 i fire trin. Trin 1: ECR åbner TCP-forbindelsen på port 9600. Trin 2: ECR sender ClientHello, hvor første byte er 0x16 — TLS-recordtypen Handshake — efterfulgt af versionsbytes 0x03 0x03. Trin 3: Terminalen svarer med sit certifikat, som ECR validerer mod Nets' rodcertifikat. Trin 4: Når handshake er færdig, sendes ECR-beskederne (STX 0x02 … ETX 0x03 + LRC) inde i TLS-records med recordtypen 0x17 (Application Data). Er første byte fra terminalen ikke 0x16, er terminalen sat op uden TLS, og ECR afbryder med fejl T-104." },
    ],
  },
  {
    id: "term-setup",
    filename: "Terminal_Opsaetning_Butik.pdf",
    title: "Opsætning af terminal i butik",
    integration: "terminal",
    type: "opsaetning",
    version: "2026.2",
    updated: "2026-10-02",
    sizeBytes: 1_120_400,
    pages: [
      { n: 1, heading: "Før du starter", text: "Du skal bruge terminal-id (TID), butiks-id (MID) og en netværksforbindelse med adgang til host på port 443. Terminalen skal have fast IP-adresse eller DHCP-reservation, så kasseapparatet altid finder den." },
      { n: 2, heading: "Parring med kasseapparat", text: "Gå til Indstillinger → ECR → Netværk på terminalen og angiv kasseapparatets IP. Vælg protokol ECR v3. Tryk Test forbindelse; terminalen viser OK, når handshake lykkes. Ved fejl T-104 kontrolleres firewall og port 9600." },
      { n: 3, heading: "Wi-Fi og 4G", text: "Mobile terminaler kan bruge Wi-Fi eller 4G som reserve. Skift sker automatisk efter 10 sekunder uden forbindelse. Bemærk at 4G-reserven kræver aktivt SIM-kort og ikke understøtter ECR via TCP — kun via Bluetooth." },
      { n: 4, heading: "Opdatering af software", text: "Terminalen henter software kl. 03:00 hver nat. Tvungen opdatering startes under Indstillinger → System → Opdater. Terminalen må ikke slukkes under opdatering; ellers kan den gå i gendannelsestilstand med fejl T-500." },
    ],
  },
  {
    id: "term-errors",
    filename: "Terminal_Fejlkoder.pdf",
    title: "Fejlkoder for betalingsterminaler",
    integration: "terminal",
    type: "fejlkoder",
    version: "3.2",
    updated: "2026-09-18",
    sizeBytes: 640_220,
    pages: [
      { n: 1, heading: "Kommunikationsfejl T-1xx", text: "T-101 Ingen forbindelse til host: kontroller netværk og DNS. T-102 Certifikat udløbet: terminalen skal opdateres. T-104 Timeout på handshake: ECR modtog ikke ACK inden for 2 sekunder. T-110 LRC-fejl: beskeden blev beskadiget undervejs, gensend." },
      { n: 2, heading: "Kortfejl T-2xx", text: "T-201 Kort afvist af udsteder. T-202 Forkert PIN, kortholder kan prøve igen. T-203 PIN spærret efter 3 forsøg. T-210 Kontaktløs grænse overskredet: bed kunden indsætte kortet. T-220 Kort ikke understøttet af terminalprofilen." },
      { n: 3, heading: "Terminalfejl T-5xx", text: "T-500 Gendannelsestilstand: terminalen blev afbrudt under opdatering, kontakt support. T-510 Printer mangler papir. T-520 Manipulationsalarm (tamper): terminalen er låst og skal byttes. Ring aldrig rundt om en tamper-låst terminal." },
    ],
  },
  {
    id: "baxi-dev-guide",
    filename: "BAXI_Developer_Guide_4.18.pdf",
    title: "BAXI Developer Guide",
    integration: "baxi",
    type: "spec",
    version: "4.18",
    updated: "2026-08-30",
    sizeBytes: 3_904_880,
    pages: [
      { n: 1, heading: "Oversigt", text: "BAXI er Nets/Nexi-biblioteket, der lader et kasseapparat styre terminalen uden at kende ECR-protokollen. BAXI findes som BAXI .NET, BAXI Java og BAXI Android. Biblioteket håndterer forbindelse, genforbindelse, kvitteringer og log." },
      { n: 2, heading: "Initialisering", text: "Opret et BaxiCtrl-objekt og sæt properties: HostIpAddress, HostPort, SerialDriver og LogFilePrefix. Kald Open(); hændelsen OnConnected signalerer at terminalen er klar. Kald aldrig TransferAmount før OnConnected er modtaget." },
      { n: 3, heading: "TransferAmount", text: "TransferAmount(operatorId, type1, amount1, type2, amount2, type3, data, articleDetails, paymentType). type1 = 0x30 for køb, 0x31 for refusion, 0x32 for annullering. Beløb angives i øre. Resultatet leveres asynkront i OnLocalMode med ResultData og ResultCode." },
      { n: 4, heading: "OnLocalMode og resultater", text: "OnLocalMode returnerer Result (0 = godkendt, 1 = afvist, 2 = ukendt), AccumulatorUpdate, IssuerId, TruncatedPan, Timestamp, VerificationMethod og SessionNumber. Ved Result 2 skal kasseapparatet kalde GetLastTransaction for at afgøre udfaldet." },
      { n: 5, heading: "Administration", text: "Administration(adminCode) bruges til dagsafslutning (0x3130 Reconciliation), X-rapport (0x3136) og Z-rapport (0x3137). Dagsafslutning bør køres automatisk hver nat; resultatet kan sendes til Sofie via afregningsendpointet." },
      { n: 6, heading: "Logning", text: "BAXI skriver log til LogFilePrefix med dato. Sæt TraceLevel = 4 ved fejlfinding. Loggen indeholder aldrig fuldt kortnummer, men kan indeholde beløb og tidspunkter og skal derfor slettes efter 90 dage." },
    ],
  },
  {
    id: "baxi-result-codes",
    filename: "BAXI_Resultatkoder.pdf",
    title: "BAXI resultat- og fejlkoder",
    integration: "baxi",
    type: "fejlkoder",
    version: "4.18",
    updated: "2026-08-30",
    sizeBytes: 812_004,
    pages: [
      { n: 1, heading: "Result og ResultCode", text: "Result 0 Godkendt. Result 1 Afvist. Result 2 Ukendt udfald — kald GetLastTransaction. Result 3 Afbrudt af operatør. ResultCode uddyber afvisningen og vises aldrig for kunden i rå form." },
      { n: 2, heading: "Forbindelsesfejl", text: "Fejl 1001 Terminal ikke fundet: kontroller HostIpAddress. Fejl 1002 Forbindelse tabt under transaktion: BAXI genforbinder automatisk, kald derefter GetLastTransaction. Fejl 1010 SerialDriver ugyldig. Fejl 1020 Terminalen er optaget af en anden ECR." },
      { n: 3, heading: "Transaktionsfejl", text: "Fejl 2001 Ugyldigt beløb (negativt eller over grænse). Fejl 2002 Valuta ikke understøttet. Fejl 2005 Refusion uden adgang: operatør mangler rettighed. Fejl 2010 Annullering for sent: dagsafslutning er allerede kørt, brug refusion." },
      { n: 4, heading: "Dagsafslutning", text: "Fejl 3001 Dagsafslutning fejlede: host utilgængelig, prøv igen inden kl. 06:00. Fejl 3002 Totaler stemmer ikke: sammenlign Z-rapport med Sofie-afregning, før der rettes manuelt." },
    ],
  },
  {
    id: "baxi-release",
    filename: "BAXI_Release_Notes_4.18.pdf",
    title: "BAXI 4.18 release notes",
    integration: "baxi",
    type: "release",
    version: "4.18",
    updated: "2026-08-30",
    sizeBytes: 302_510,
    pages: [
      { n: 1, heading: "Nyt i 4.18", text: "Understøttelse af Android 15. Ny property AutoReconnect (standard true). GetLastTransaction virker nu også efter genstart af kasseapparatet. TraceLevel 5 tilføjet til fuld protokol-log." },
      { n: 2, heading: "Rettelser", text: "Rettet: OnLocalMode blev sendt to gange ved tabt forbindelse (fejl 1002). Rettet: Kvitteringer med æ, ø og å blev afkortet på 40-tegns printere. Rettet: Dagsafslutning gav fejl 3001 ved sommertid." },
      { n: 3, heading: "Udfasning", text: "BAXI Java 3.x understøttes ikke efter 31. december 2026. SerialDriver 'COM' erstattes af 'USB-CDC'. Opgrader før næste certificering af terminalen." },
    ],
  },
  {
    id: "sofie-api",
    filename: "Sofie_API_Reference_v2.pdf",
    title: "Sofie API-reference",
    integration: "sofie",
    type: "spec",
    version: "2.6",
    updated: "2026-10-21",
    sizeBytes: 2_105_660,
    pages: [
      { n: 1, heading: "Godkendelse", text: "Sofie-API'et bruger OAuth 2.0 client credentials. Hent token på POST /oauth/token med client_id og client_secret. Token gælder i 3600 sekunder. Send det som Authorization: Bearer i alle kald. Fejl 401 betyder udløbet token." },
      { n: 2, heading: "Ordrer", text: "POST /v2/orders opretter en ordre med linjer, moms og betalinger. Hver betaling har method (card, cash, invoice), amount i øre og reference. Ved kortbetaling sættes reference til BAXI SessionNumber, så ordren kan afstemmes med terminalen." },
      { n: 3, heading: "Afregning", text: "POST /v2/settlements modtager dagsafslutningen fra terminalen: terminal_id, batch_number, totals pr. korttype og den rå kvitteringstekst. Sofie matcher afregningen med ordrernes kortbetalinger og markerer differencer." },
      { n: 4, heading: "Webhooks", text: "Sofie sender webhooks for order.created, settlement.matched og settlement.mismatch. Webhooks er signeret med HMAC-SHA256 i headeren X-Sofie-Signature. Afvis kald uden gyldig signatur og svar 2xx inden for 5 sekunder." },
      { n: 5, heading: "Rate limits og fejl", text: "Grænsen er 600 kald i minuttet pr. klient. Fejl 429 betyder for mange kald — vent det antal sekunder, Retry-After angiver. Fejl 409 betyder at ordren allerede findes (samme external_id). Fejl 422 har en liste af feltfejl." },
    ],
  },
  {
    id: "sofie-setup",
    filename: "Sofie_Opsaetning_Integration.pdf",
    title: "Opsætning af Sofie-integration",
    integration: "sofie",
    type: "opsaetning",
    version: "2.6",
    updated: "2026-10-21",
    sizeBytes: 905_300,
    pages: [
      { n: 1, heading: "Klientadgang", text: "Opret en API-klient i Sofie under Indstillinger → Integrationer → Ny klient. Vælg rettighederne orders:write og settlements:write. Gem client_secret i hemmelighedsboksen — den vises kun én gang." },
      { n: 2, heading: "Kortlægning af terminaler", text: "Hver terminal (TID) skal kobles til en butik og et kassenummer i Sofie. Uden kobling afvises afregningen med fejl S-404 Ukendt terminal. Koblingen kan importeres som CSV med kolonnerne tid, butik, kasse." },
      { n: 3, heading: "Bogføring", text: "Sofie bogfører kortomsætning på konto 5820 Kortindløsning og gebyrer på 7220 Indløsningsgebyr. Kontoplanen kan ændres pr. butik. Differencer fra settlement.mismatch bogføres på 5899 Uafstemt, indtil de er løst." },
    ],
  },
  {
    id: "sofie-drift",
    filename: "Sofie_Drift_og_Fejlfinding.pdf",
    title: "Sofie drift og fejlfinding",
    integration: "sofie",
    type: "drift",
    version: "2.6",
    updated: "2026-11-03",
    sizeBytes: 1_402_200,
    pages: [
      { n: 1, heading: "Afstemning fejler", text: "Når settlement.mismatch kommer, sammenlignes Z-rapporten fra BAXI med Sofies kortbetalinger for dagen. Typiske årsager: en annullering efter dagsafslutning (BAXI fejl 2010), en ordre uden SessionNumber, eller en terminal der ikke er koblet (S-404)." },
      { n: 2, heading: "Fejlkoder S-xxx", text: "S-401 Token udløbet eller forkert. S-404 Ukendt terminal. S-409 Dublet ordre (samme external_id). S-422 Valideringsfejl i ordrelinjer, ofte moms. S-429 Rate limit nået. S-500 Intern fejl i Sofie — prøv igen med eksponentiel backoff." },
      { n: 3, heading: "Overvågning", text: "Overvåg andelen af settlement.mismatch pr. dag. Over 2 % kræver handling. Webhooks der fejler gentages i 24 timer; derefter ligger de i Sofies dead-letter-kø under Integrationer → Leveringer." },
      { n: 4, heading: "Nødprocedure", text: "Er Sofie nede, gemmer kasseapparatet ordrer lokalt og sender dem, når API'et svarer igen. Terminalen og BAXI fortsætter uafhængigt — betalinger påvirkes ikke. Kør dagsafslutning som normalt; afregningen sendes bagefter." },
    ],
  },
  {
    id: "flow-overview",
    filename: "Integrationsflow_Terminal_BAXI_Sofie.pdf",
    title: "Integrationsflow: Terminal → BAXI → Sofie",
    integration: "baxi",
    type: "drift",
    version: "1.4",
    updated: "2026-11-08",
    sizeBytes: 1_760_090,
    pages: [
      { n: 1, heading: "Det samlede flow", text: "Kasseapparatet kalder BAXI TransferAmount. BAXI taler ECR-protokollen med terminalen. Resultatet (OnLocalMode) gemmes på ordren med SessionNumber, og ordren sendes til Sofie via POST /v2/orders. Om natten kører BAXI dagsafslutning, og afregningen sendes til Sofie via POST /v2/settlements." },
      { n: 2, heading: "Ansvar", text: "Terminalen ejer kortdata og PIN. BAXI ejer forbindelsen og genforbindelse. Kasseapparatet ejer ordren og må aldrig gemme fuldt kortnummer. Sofie ejer bogføring og afstemning." },
      { n: 3, heading: "Ukendt udfald", text: "Hvis forbindelsen tabes midt i en betaling (BAXI fejl 1002, terminal T-101), må kasseapparatet ikke starte en ny betaling. Kald GetLastTransaction; er udfaldet stadig Result 2, markeres ordren som afventer og afstemmes ved dagsafslutning i Sofie." },
    ],
  },
];
