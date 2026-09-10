# Orologio

Modulo per Foundry VTT (v13 e v14). Orologi a segmenti per il narratore: ogni orologio è una torta da 3 a 16 fette con un timer per fetta. Allo scadere del timer la fetta si riempie e possono scattare degli eventi. I giocatori vedono le torte, il narratore le comanda.

## Uso

Nella barra di sinistra compare l'icona dell'orologio. Cliccata, apre il gestore: la lista degli orologi con i comandi. Il pannello sul tavolo mostra le torte a tutti (a ciascuno la sua posizione, si trascina dalla presa in alto) e al narratore anche i comandi.

La finestra di un orologio ha tre linguette. Base: titolo, numero di segmenti (da 3 a 16), cosa rappresenta un segmento (scena, giorno, tentativo: serve a chiamare i segmenti «Scena 1», «Scena 2» senza scrivere un nome per ognuno), l'interruttore «senza timer» per gli orologi che avanzano solo a mano, e durata di un segmento. Aspetto: colore, dimensione della torta, ciclo (finito il giro riparte da zero, altrimenti si ferma pieno), visibilità ai giocatori, conto alla rovescia ai giocatori, nomi dei segmenti ai giocatori, eventi anche con l'avanzamento manuale. Segmenti, facoltativa: per ogni segmento un nome, un timer suo al posto di quello di base, e una lista di eventi che scattano quando il segmento si riempie: attiva scena, mostra journal o pagina, mostra immagine, esegui macro, messaggio in chat (anche solo ai narratori), riproduci suono.

Il pannello ha tre stati, scelti da ogni utente per sé con i tre tasti nella presa: grande (le schede complete, dove lo si è trascinato), ridotto (schede piccole, ancorato in basso a sinistra accanto alla lista dei giocatori) e solo timer (una riga per orologio con nome e conto alla rovescia). Si trascina sempre dalla presa. L'icona dell'orologio nella barra di sinistra per il giocatore accende o spegne il pannello, per il narratore apre il gestore.

Comandi del narratore: segmento avanti, segmento indietro, avvia o pausa, blocca, azzera, mostra o nascondi ai giocatori, modifica, elimina. Un orologio bloccato non avanza né da solo né a mano finché non viene sbloccato.

## Come funziona

Lo stato degli orologi vive in un'impostazione di mondo, così tutti i client lo vedono e solo il narratore lo scrive. Il timer lo fa scorrere il primo narratore connesso (uno solo, anche con più narratori in gioco). Gli eventi girano sul client del narratore; journal e immagini raggiungono i giocatori tramite Foundry o il socket del modulo.

## Rilascio

Versione in `module.json` (campo `version` e cartella nel campo `download`), poi un tag semver senza «v» (es. `0.1.0`): GitHub Actions costruisce `orologio.zip` e pubblica la release. Manifest per l'installazione:

    https://github.com/MrMalazar/foundry-orologio/releases/latest/download/module.json
