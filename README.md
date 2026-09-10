# Orologio

Modulo per Foundry VTT (v13 e v14). Orologi a segmenti per il narratore: ogni orologio è una torta da 3 a 10 fette con un timer per fetta. Allo scadere del timer la fetta si riempie e possono scattare degli eventi. I giocatori vedono le torte, il narratore le comanda.

## Uso

Nella barra di sinistra compare l'icona dell'orologio. Cliccata, apre il gestore: la lista degli orologi con i comandi. Il pannello sul tavolo mostra le torte a tutti (a ciascuno la sua posizione, si trascina dalla presa in alto) e al narratore anche i comandi.

Per ogni orologio si impostano titolo, numero di segmenti, durata di un segmento, colore, e tre interruttori: ciclo (finito il giro riparte da zero, altrimenti si ferma pieno), visibilità ai giocatori, conto alla rovescia ai giocatori. Ogni segmento può avere un nome (visibile ai giocatori o solo promemoria per il narratore) e una lista di eventi che scattano quando il segmento si riempie: attiva scena, mostra journal o pagina, mostra immagine, esegui macro, messaggio in chat (anche solo ai narratori), riproduci suono.

Comandi del narratore: segmento avanti, segmento indietro, avvia o pausa, blocca, azzera, mostra o nascondi ai giocatori, modifica, elimina. Un orologio bloccato non avanza né da solo né a mano finché non viene sbloccato.

## Come funziona

Lo stato degli orologi vive in un'impostazione di mondo, così tutti i client lo vedono e solo il narratore lo scrive. Il timer lo fa scorrere il primo narratore connesso (uno solo, anche con più narratori in gioco). Gli eventi girano sul client del narratore; journal e immagini raggiungono i giocatori tramite Foundry o il socket del modulo.

## Rilascio

Versione in `module.json` (campo `version` e cartella nel campo `download`), poi un tag semver senza «v» (es. `0.1.0`): GitHub Actions costruisce `orologio.zip` e pubblica la release. Manifest per l'installazione:

    https://github.com/MrMalazar/foundry-orologio/releases/latest/download/module.json
