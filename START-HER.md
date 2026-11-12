# Martin · Monsterværkstedet

## Først · Åbn siden fra GitHub

1. Pak filpakken ud. Åbn mappen `Martin-monster`.
2. Træk **indholdet** af mappen ind i dit nye GitHub-repo, så `index.html` ligger i roden sammen med `style.css`, `app.js`, `config.js` og mapperne `assets` og `server`.
3. Vælg **Commit changes**. Åbn **Settings → Pages**, vælg **Deploy from a branch**, og vælg `main` og `/ (root)`. Åbn linket, når GitHub viser det under Pages.
4. Vælg **Prøv en opdigtet fortælling**, og derefter **Læs tilbage**. I kan rette ordene eller åbne det eksisterende eksempelbillede. Du kan også høre Martins velkomst med en dansk browserstemme og prøve mikrofonen i en browser, der understøtter talegenkendelse.

GitHub Pages viser siden direkte i browseren. Testen kan bruges uden softwareinstallation. Eksempelbilledet er fra den tidligere afprøvning og er markeret som eksempel.

## Derefter · Slå nye billeder til

Dette er engangsopsætning for den, der ejer prototypen. Der kan være udgifter ved billedgenerering. Pædagogen skal senere kun have linket og prøvekoden.

1. Opret en **Cloudflare Worker** i Cloudflare-dashboardet. Erstat standardkoden med indholdet af `server/worker.mjs` og deploy.
2. Åbn Workerens **Settings → Variables and Secrets**. Tilføj `OPENAI_API_KEY` og `DEMO_CODE` som **Secrets**. Førstnævnte er en OpenAI API-nøgle med adgang til billedmodellen. Til sidstnævnte vælger du en lang, unik prøvekode. Del kun prøvekoden med dem, der skal teste.
3. Tilføj `ALLOWED_ORIGIN` som tekstvariabel. For standardlinket til dette repo er værdien `https://steinbeck-konsulent.github.io`, uden skråstreg til sidst og uden reponavnet. Ved en anden GitHub Pages-adresse bruges dens domæne med https.
4. Åbn `config.js` i GitHub og sæt Workerens fulde HTTPS-adresse mellem anførselstegnene. Commit ændringen, vent på Pages og genindlæs siden.
5. Test med den opdigtede fortælling. Læs den tilbage, indtast prøvekoden, og vælg **Godkend og lav billede**. Billedet kan derefter gemmes som PNG med AI-mærket.

API-nøgle og prøvekode skal ligge i Workerens hemmelige indstillinger. Kun Workerens adresse skal ind i GitHub-koden.

Appen sender den godkendte tekst til billedmodellen. Pakken indeholder ingen fotos fra institutionen. Brug opdigtede historier ved den første afprøvning. Hvis mikrofonen bruges, kan browserens talegenkendelse sende lyden til sin taleleverandør.

## Links

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Cloudflare Workers i dashboardet](https://developers.cloudflare.com/workers/get-started/dashboard/)
- [OpenAI API-nøgler](https://platform.openai.com/api-keys)
