import { imageEndpoint } from './config.js';

const byId = id => document.getElementById(id);
const story = byId('story');
const status = byId('status');
const make = byId('make');
const back = byId('back');
const code = byId('code');
const art = byId('art');
const download = byId('download');
const dictate = byId('dictate');
const panels = ['tell', 'review', 'picture'].map(byId);
const steps = [...document.querySelectorAll('.steps li')];
const example = 'Det er sådan en glimmerpluff. Den har tre ben … nej, fire. Tre nede på maven og ét oppe ved øret. Den bor under en rutsjebane og spiser månesmuler.';
const hello = 'Hej, jeg hedder Martin. Fortæl mig om dit monster. Hvordan ser det ud, og hvad kan det finde på?';
let approved = '';
let imageUrl = '';
let recognition;
let listening = false;
let busy = false;

function go(index) {
  panels.forEach((panel, i) => {
    panel.hidden = i !== index;
    if (i === index) steps[i].setAttribute('aria-current', 'step');
    else steps[i].removeAttribute('aria-current');
  });
  status.textContent = '';
  panels[index].querySelector('h2').focus();
}

function clearImage() {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = '';
  art.removeAttribute('src');
  download.removeAttribute('href');
}

byId('speak').addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    status.textContent = hello;
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(hello);
  utterance.lang = 'da-DK';
  utterance.onerror = event => {
    if (!['interrupted', 'canceled'].includes(event.error)) status.textContent = hello;
  };
  window.speechSynthesis.speak(utterance);
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  dictate.hidden = false;
  byId('mic-note').hidden = false;
  dictate.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    window.speechSynthesis?.cancel();
    recognition = new SpeechRecognition();
    recognition.lang = 'da-DK';
    recognition.continuous = true;
    recognition.onresult = event => {
      const words = Array.from(event.results).slice(event.resultIndex)
        .filter(result => result.isFinal).map(result => result[0].transcript.trim()).join(' ');
      if (words) {
        const combined = [story.value.trimEnd(), words].filter(Boolean).join(' ');
        story.value = combined.slice(0, story.maxLength);
        if (combined.length > story.maxLength) status.textContent = 'Feltet kan rumme 2000 tegn. Tjek, om det sidste kom med.';
      }
    };
    recognition.onend = () => {
      listening = false;
      dictate.textContent = 'Start mikrofon';
    };
    recognition.onerror = event => {
      if (event.error !== 'aborted') status.textContent = 'Mikrofonen kunne ikke skrive ordene. Du kan skrive dem i feltet.';
    };
    try {
      recognition.start();
      listening = true;
      dictate.textContent = 'Stop mikrofon';
      status.textContent = '';
    } catch {
      status.textContent = 'Mikrofonen kunne ikke starte.';
    }
  });
}

byId('try-story').addEventListener('click', () => {
  if (listening) recognition.abort();
  story.value = example;
  story.focus();
});

byId('story-form').addEventListener('submit', event => {
  event.preventDefault();
  if (listening) {
    status.textContent = 'Stop mikrofonen, og tjek, at de sidste ord er kommet med.';
    return;
  }
  approved = story.value.trim();
  if (!approved) {
    story.focus();
    status.textContent = 'Skriv lidt om monsteret først.';
    return;
  }
  byId('approved-story').textContent = approved;
  go(1);
});

byId('access').hidden = !imageEndpoint;
code.required = Boolean(imageEndpoint);
byId('connection').hidden = Boolean(imageEndpoint);
byId('review-example').hidden = Boolean(imageEndpoint);
make.hidden = !imageEndpoint;

back.addEventListener('click', () => go(0));
byId('change').addEventListener('click', () => go(0));
byId('restart').addEventListener('click', () => {
  clearImage();
  approved = '';
  story.value = '';
  go(0);
});

async function addBadge(blob) {
  const picture = await createImageBitmap(blob);
  const badge = new Image();
  badge.src = './assets/steinbeck-ai-maerke.png';
  try {
    await badge.decode();
    const canvas = document.createElement('canvas');
    canvas.width = picture.width;
    canvas.height = picture.height;
    const context = canvas.getContext('2d');
    context.drawImage(picture, 0, 0);
    const width = Math.round(canvas.width * .11);
    const height = Math.round(width * badge.naturalHeight / badge.naturalWidth);
    const margin = Math.round(canvas.width * .02);
    context.drawImage(badge, canvas.width - width - margin, canvas.height - height - margin, width, height);
    const output = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!output) throw new Error('Billedet kunne ikke gemmes.');
    return output;
  } finally {
    picture.close();
  }
}

function showPicture(blob, demo) {
  clearImage();
  imageUrl = URL.createObjectURL(blob);
  art.src = imageUrl;
  art.alt = demo ? 'Et farverigt klodsmonster i et indendørs legeland' : 'Monsterbilledet lavet ud fra fortællingen';
  download.href = imageUrl;
  download.hidden = demo;
  byId('picture-title').textContent = demo ? 'Et eksempelbillede' : 'Her er dit monster';
  byId('picture-caption').textContent = demo
    ? 'Dette billede er fra jeres tidligere afprøvning. Det er et eksempel på stilen.'
    : 'Kan du genkende dit monster? I kan gå tilbage og rette fortællingen.';
  go(2);
}

async function showExample() {
  if (busy) return;
  if (listening) recognition.abort();
  busy = true;
  try {
    const response = await fetch('./assets/eksempel.webp');
    if (!response.ok) throw new Error();
    showPicture(await addBadge(await response.blob()), true);
  } catch {
    status.textContent = 'Eksempelbilledet kunne ikke åbnes.';
  } finally {
    busy = false;
  }
}
byId('show-example').addEventListener('click', showExample);
byId('review-example').addEventListener('click', showExample);

byId('image-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!imageEndpoint || busy || !approved) return;
  busy = true;
  make.disabled = back.disabled = code.disabled = true;
  status.textContent = 'Billedet bliver lavet. Det kan tage lidt tid …';
  try {
    const response = await fetch(imageEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + code.value.trim() },
      body: JSON.stringify({ description: approved }),
      signal: AbortSignal.timeout(240_000),
    });
    if (response.status === 401) throw new Error('Prøvekoden passer ikke. Tjek den og prøv igen.');
    if (response.status === 429) throw new Error('Billedtjenesten er optaget. Vent lidt, og prøv igen.');
    if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/')) {
      throw new Error('Billedtjenesten kunne ikke lave billedet. Fortællingen er stadig her.');
    }
    showPicture(await addBadge(await response.blob()), false);
  } catch (error) {
    status.textContent = error instanceof TypeError || error.name === 'TimeoutError'
      ? 'Forbindelsen til billedtjenesten slog fejl. Fortællingen er stadig her.'
      : error.message;
  } finally {
    busy = false;
    make.disabled = back.disabled = code.disabled = false;
  }
});
