# Martin Monster på GitHub Pages

## Udgiv

Åbn repositoriet Steinbeck-konsulent/monster-billede. Vælg Add file → Upload files, og upload indholdet fra ZIP-mappen til roden af den gren, GitHub Pages udgiver fra. Upload mapperne som mapper. Behold den nuværende historik. Den nye index.html erstatter startsiden. Der er ingen API-nøgler i filerne. Appens adresse er https://steinbeck-konsulent.github.io/monster-billede/.

## Brug direkte fra linket

Barnet fortæller om et monster fra LEGO, en tegning eller fantasien. Den voksne skriver eller godkender barnets ord, vælger »Brug min AI i en anden fane« og klikker »Godkend og lav billedet«. Kopiér prompten til den billed-AI, den voksne allerede bruger. Gem AI-billedet, og vælg det i Martin Monster. Appen lægger AI-mærket på billedet og kan gemme det som PNG. Her behøver deltageren kun en browser og sin egen billed-AI. Ved brug af mikrofonen kan browseren behandle lyden hos en ekstern tjeneste.

## Automatisk med personens egen API-nøgle på Windows

Brug Chrome. Hver deltager, der ønsker automatisk billedgenerering, udpakker ZIP-filen og sætter sin egen nøgle op på sin egen bærbare. Et almindeligt AI-abonnement giver ikke automatisk API-adgang. Manuel brug fungerer også med andre AI-billedværktøjer.

1. Åbn den udpakkede mappe i Stifinder, skriv powershell i adresselinjen, og tryk Enter. Sørg for, at Python 3.11 eller nyere er installeret.
2. Kør:

       py -m venv .venv
       .\.venv\Scripts\python.exe -m pip install -r lokal-forbindelse\requirements.txt

3. Indtast én eller begge API-nøgler skjult i samme PowerShell-vindue:

       $env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new("", (Read-Host "Gemini API-nøgle" -AsSecureString)).Password
       $env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new("", (Read-Host "OpenAI API-nøgle" -AsSecureString)).Password

4. Start forbindelsen:

       .\.venv\Scripts\python.exe lokal-forbindelse\server.py

5. På GitHub Pages-siden, under barnets fortælling, åbn »Tilslut min AI automatisk«. Indsæt den midlertidige forbindelseskode, som står i PowerShell, og tryk »Forbind«. Tillad lokal netværksadgang, hvis Chrome spørger. Vælg Gemini eller OpenAI. Behold PowerShell åbent under brug. Stop den lokale forbindelse med Ctrl+C.

Forbindelsen lytter kun på 127.0.0.1. API-nøglen bliver i den lokale proces. Siden modtager kun en midlertidig forbindelseskode og AI-billedet. Koden skifter ved genstart. AI’en får beskrivelsen og eventuelle godkendte rettelser. Der er ingen fælles server.

## Mail

Brugerfladen til »Send billedet på mail« er med. Automatisk afsendelse er sat på pause, indtil Steinbeck-afsenderen er valgt. API-forbindelsen indeholder den tidligere SMTP-funktion for API-genererede billeder. Pakken indeholder ingen afsenderoplysninger eller login. Manuel import kan bruges til at gemme en PNG med det samme.
