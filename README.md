# HER2-Score IHC

Versione autonoma 0.2.1, revisione del 15 settembre 2026 del progetto esportato da DesignArena.

## Avvio

Richiede Node >=22.18 e npm.

```sh
npm ci
npm run dev
```

## Verifiche e build

```sh
npm test
npm run lint
npm run build
npm run preview
```

La cartella `dist` è il sito statico compilato. La configurazione Vercel non contiene credenziali. Nessun servizio cloud o variabile d’ambiente richiesto.

## Comportamento

- Protocolli attivi: mammella ASCO/CAP 2023, stomaco CAP/ASCP/ASCO 2016–2017, colon-retto HERACLES e carcinoma uroteliale con criteri gastrici dichiarati (biopsia, TURB e pezzo operatorio).
- Gli altri sette organi restano visibili ma non selezionabili: richiedono protocollo, istotipo e finalità del test identificati. Nessuna estrapolazione gastrica automatica.
- Score nullo e messaggio esplicito per dati discordanti, controlli non validi o reperti non risolvibili con gli input disponibili.
- Pattern incompleto distinto da estensione focale. “Debole-moderata incompleta” richiede revisione perché l’input legacy raggruppa intensità diverse.
- Nessuna indicazione farmacologica o eleggibilità terapeutica automatica.
- Storico nel browser corrente (`localStorage`), con snapshot completo e versione del motore. Non condiviso tra dispositivi; cancellare i dati del browser cancella lo storico. Usare codici di prova senza identificativi dei pazienti. Esportazione CSV disponibile.
- I dati del vecchio database non sono migrati: lo ZIP sorgente non conteneva le tabelle. Catalogo dei criteri e riferimenti ora incluso nel progetto.

## Combinazioni non previste dalla guideline

ASCO/CAP definisce testualmente quattro combinazioni di intensita e pattern; le altre esistono al microscopio ma non nel testo. Il motore non le lascia senza risposta e non le converte in un IHC 0 silenzioso: assegna lo score piu prudente compatibile con la guideline e lo dichiara nelle note del risultato.

- Mammella, reattivita intensa non circonferenziale: 2+, quindi ISH. Il rischio di mancare un caso amplificato supera quello di una ISH in piu.
- Mammella, reattivita debole-moderata non circonferenziale: 1+. La membrana completa e requisito del 2+; l'1+ resta una categoria clinicamente significativa.
- Mammella, reattivita tenue ma completa: 1+, con invito a rivedere l'intensita perche la distinzione da debole-moderata decide la ISH.
- Gastrico e HERACLES, membrana incompleta non laterale: 1+, non qualificante per 2+ e 3+; se al microscopio il pattern e laterale o basolaterale va riselezionato.
- HERACLES, reattivita intensa esattamente al 10%: equivoco, quindi ISH. Le sintesi pubblicate divergono sul confine e la scelta conservativa e dichiarata.

Nessuna combinazione valida resta senza score negli organi supportati: la verifica è nella suite di test, che percorre tutte le combinazioni di organo, tipo di campione, intensità, pattern ed estensione.

## Carcinoma uroteliale

Non esiste un algoritmo uroteliale validato. Si applicano i criteri gastrici CAP/ASCP/ASCO 2016-2017, dichiarati nel risultato, coerentemente con la prassi prevalente (criteri del gastrico, amplificazione spesso non eseguita) e con l'impostazione di DESTINY-PanTumor02.

Il tipo di campione ha tre voci, e la discriminante non è la via di prelievo ma l'affidabilità del denominatore:

- **Biopsia** (pinza endoscopica o ureteroscopica): regola del cluster di almeno 5 cellule coesive. Su un prelievo minimo la percentuale non è misurabile.
- **TURB**: soglia del 10%, come il pezzo operatorio. La TURB è un campione resettivo frammentato, il tumore valutabile è abbondante e la percentuale ha un denominatore reale.
- **Pezzo operatorio**: soglia del 10%.

Quando è presente una componente con reattività intensa (qualità 3+) ma sotto la soglia del protocollo, il risultato lo segnala esplicitamente: l'eleggibilità agnostica a trastuzumab deruxtecan è ancorata all'IHC 3+, quindi una componente 3+ focale è un dato che l'oncologo deve vedere anche quando lo score complessivo e' 0.

Nota sul perimetro: DESTINY-PanTumor02 ha arruolato IHC 3+ e 2+ senza ISH, ma l'approvazione tumor-agnostica che ne è derivata copre il solo IHC 3+. Popolazione arruolata e popolazione approvata non coincidono.

## Testo pronto per il referto

Lo step 4 produce un blocco di testo copiabile, pensato per essere incollato nel referto e poi riletto e adattato. La struttura tiene **score e classificazione su righe separate**:

```
Score IHC: 2+
Protocollo applicato: ASCO/CAP mammella 2023 (carcinoma invasivo)
Classificazione: IHC equivoco; stato integrato da definire
```

È la formulazione che evita il "positivo (score 2+)": nei protocolli gastroesofageo e HERACLES un 2+ è un equivoco che richiede ISH, e la parola positivo, se compare accanto allo score, viene letta come stato HER2. Quando lo score non è assegnabile il testo lo dichiara e ne riporta il motivo, invece di produrre un valore.

Le note metodologiche finiscono nel blocco: su un uroteliale sotto soglia con componente intensa, la segnalazione della componente 3+ focale arriva nel referto insieme alla ragione per cui conta.

## Deploy

`.github/workflows/pages.yml` pubblica `dist` su GitHub Pages a ogni push su `main`, dopo test, lint e build. Va abilitato una volta in Settings > Pages > Source: GitHub Actions.

## Differenze rispetto all’export

Integrati motore corretto, rendering dei risultati null, salvataggio/rilettura, filtri, catalogo locale e testi coerenti. Eliminati API Supabase prive di autenticazione, dipendenze dal database di DesignArena, ripristino remoto del DB, strumentazione dell’editor e HTML iniettato. Rimossi segreti e impostazioni cloud dalla copia preparata.

Lo ZIP originale conteneva in `vercel.json` una chiave con prefisso `sb_secret_`. Non è stata usata né ne è stata verificata la validità. La rimozione dal progetto non revoca la chiave originale: sostituirla nel progetto Supabase di provenienza. Non caricare l’export originale su GitHub.

## Risultati della verifica

25 test superati: scoring, soglie, 4.928 combinazioni per gli invarianti, rendering server del risultato non valutabile, conservazione di score null nello storico, cancellazione e catalogo senza rete. TypeScript, build Vite ed ESLint superati. Non eseguita una verifica interattiva completa in browser né validazione clinica: il progetto rimane un prototipo didattico.

## Limiti clinici

Una sola popolazione di staining descritta per volta: l’eterogeneità richiede revisione integrata. Nel CRC sono distinte intensità e categoria HERACLES; al 10% esatto di staining forte il motore richiede verifica del protocollo perché le sintesi disponibili differiscono sul limite. “Tenue completa” e “debole-moderata incompleta” richiedono precisazione del reperto; non vengono riclassificate silenziosamente come negative.

Le versioni dei protocolli sono dichiarate, non aggiornate automaticamente. La precedente revisione non ha potuto accedere al PDF CAP mammario né al testo integrale gastroesofageo: prima dell’uso clinico occorre validazione delle regole contro i testi originali e il protocollo di laboratorio. Le prove software non sostituiscono questa verifica.

## Riferimenti

- ASCO/CAP mammella 2023: https://www.cap.org/cap-guidelines/her2-testing-in-breast-cancer-2023-guideline-update/
- Algoritmo CAP: https://documents.cap.org/documents/her2_breast_update_algorithms_2023.pdf
- Evidenza primaria su pattern mammario incompleto: https://mdanderson.elsevierpure.com/en/publications/intense-basolateral-membrane-staining-indicates-her2-positivity-i/
- Bartley et al., gastroesofageo: https://pubmed.ncbi.nlm.nih.gov/28077399/
- HERACLES, Valtorta et al.: https://www.nature.com/articles/modpathol201598
- Sintesi CAP CRC: https://www.cap.org/article/her2-erbb2-testing-in-colorectal-cancer/

## GitHub

Progetto pronto per un repository dedicato. Sorgenti presenti su GitHub; nessun deploy eseguito. Per il primo caricamento usare questi sorgenti puliti, escludendo `node_modules` e `dist` come da `.gitignore`.

Aggiornamento uroteliale: supportata la resezione con protocollo gastrico esplicito; biopsie sospese in attesa di precisazione del protocollo quantitativo. Nessun referto o dato paziente incluso nel repository.
