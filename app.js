  (() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const stages = ['welcome','describe','picture'];
    let recognition = null, listening = false, listenTarget = null, listenStart = '';

    const greeting = 'Hej! Jeg er dit lille monsterven. Kan du fortælle mig om dit fantasimonster? Hvilken farve har det? Og hvordan ser det ud? Jeg lytter, mens du fortæller. Når du er færdig, hjælper en voksen med at lave billedet.';
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

    function msg(s) { $('appMessage').textContent = s || ''; }
    function showStage(name) {
      stopListening();
      stages.forEach(id => { $(id).hidden = id !== name; });
      const step = name === 'welcome' ? 1 : name === 'describe' ? 2 : 3;
      document.querySelectorAll('.step').forEach(s => s.classList.toggle('current', Number(s.dataset.step) === step));
      msg('');
      $(name).querySelector('h2').focus();
      window.scrollTo({ top:0, behavior:'smooth' });
    }
    function speak(text) {
      if (!('speechSynthesis' in window)) { msg('Denne browser har ingen oplæsningsfunktion.'); return; }
      speechSynthesis.cancel();
      const say = new SpeechSynthesisUtterance(text);
      say.lang = 'da-DK'; say.rate = .88; say.pitch = 1.18;
      const voices = speechSynthesis.getVoices();
      const danish = voices.find(v => /^da[-_]/i.test(v.lang));
      if (danish) say.voice = danish;
      say.onerror = () => msg('Kunne ikke afspille stemmen. Prøv igen, eller fortsæt uden lyd.');
      speechSynthesis.speak(say);
    }
    function setListeningUI(isLive, target) {
      const revision = target === $('changes');
      $('startListen').hidden = isLive && !revision;
      $('stopListen').hidden = !isLive || revision;
      $('startChange').hidden = isLive && revision;
      $('stopChange').hidden = !isLive || !revision;
      $('voiceLight').classList.toggle('live',isLive&&!revision);
      $('revisionLight').classList.toggle('live',isLive&&revision);
      if (!revision) $('voiceState').textContent = isLive ? 'Monsteret lytter…' : 'Klar til at lytte.';
      else $('revisionState').textContent = isLive ? 'Monsteret lytter til ændringen…' : 'Du kan også fortælle ændringen med mikrofonen.';
    }
    function startListening(target) {
      if (!SpeechRecognitionImpl) { msg('Din browser understøtter ikke denne talegenkendelse. Skriv beskrivelsen i feltet, eller prøv Chrome/Edge på en sikker webadresse.'); return; }
      if (recognition) return;
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      listenTarget = target;
      listenStart = target.value.trim();
      try {
        recognition = new SpeechRecognitionImpl();
        recognition.lang = 'da-DK';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onstart = () => { listening = true; setListeningUI(true,target); msg(''); };
        recognition.onresult = event => {
          let final = '', interim = '';
          for (let i = 0; i < event.results.length; i++) {
            const phrase = event.results[i][0].transcript.trim();
            if (event.results[i].isFinal) final += phrase + ' ';
            else interim += phrase + ' ';
          }
          target.value = [listenStart,final.trim(),interim.trim()].filter(Boolean).join(' ').trim();
        };
        recognition.onerror = event => {
          const detail = event.error === 'not-allowed' ? 'Mikrofonadgangen blev afvist. Giv browseren adgang til mikrofonen, eller skriv i feltet.' : 'Talegenkendelsen stoppede (' + event.error + '). Du kan fortsætte med at skrive.';
          msg(detail);
        };
        recognition.onend = () => { listening = false; setListeningUI(false,target); recognition = null; };
        recognition.start();
      } catch(e) { recognition = null; listening = false; setListeningUI(false,target); msg('Kunne ikke starte mikrofonen. Du kan skrive teksten direkte.'); }
    }
    function stopListening() {
      if (recognition) {
        try { recognition.stop(); } catch (_) {}
      }
      if (listenTarget) setListeningUI(false,listenTarget);
      listening = false;
    }

    let result = null;
    let revisions = [];
    let pending = false;
    let mailEnabled = false;

    let pairCode = '';
    let manualRevisions = [];

    async function request(path, body = {}) {
      let response;
      try {
        response = await fetch('http://127.0.0.1:8765' + path, {
          method: 'POST',
          targetAddressSpace: 'loopback',
          headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + pairCode},
          body: JSON.stringify(body)
        });
      } catch {
        throw new Error('Start den lokale forbindelse og tillad lokal netværksadgang, hvis browseren spørger.');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Appen kunne ikke gennemføre handlingen.');
      return data;
    }

    $('connect').onclick = async () => {
      if ($('connect').disabled || pending) return;
      pairCode = $('pairCode').value.trim();
      if (!/^[A-Za-z0-9_-]{32}$/.test(pairCode)) {
        msg('Kopiér forbindelseskoden fra det lokale vindue.');
        return;
      }
      const select = $('provider');
      $('connect').disabled = true;
      try {
        const settings = await request('/api/config');
        select.replaceChildren(new Option('Brug min AI i en anden fane', 'manual'),
          ...settings.providers.map(item => new Option(item.label, item.id)));
        mailEnabled = settings.mail;
        if (settings.providers.length) select.selectedIndex = 1;
        $('pairCode').value = '';
        $('connection').open = false;
        msg(settings.providers.length ? 'Din billedtjeneste er klar.' : 'Forbundet. Tilføj en API-nøgle lokalt for automatisk billedgenerering.');
      } catch (error) {
        pairCode = '';
        mailEnabled = false;
        select.replaceChildren(new Option('Brug min AI i en anden fane', 'manual'));
        msg(error.message);
      } finally {
        $('connect').disabled = false;
      }
    };

    $('copyPrompt').onclick = async () => {
      try {
        await navigator.clipboard.writeText($('manualPrompt').value);
        msg('Prompten er kopieret.');
      } catch {
        $('manualPrompt').select();
        msg('Kopiér den markerede tekst.');
      }
    };

    async function preparePrompt(description, revisions) {
      const response = await fetch('./BILLED-PROMPT.md');
      if (!response.ok) throw new Error('Billedprompten kunne ikke hentes.');
      const content = await response.text();
      const prompt = content.slice(content.indexOf('## Rolle'), content.indexOf('\n---'));
      const fields = {
        '[BARNETS EGNE ORD, GODKENDT AF DEN VOKSNE]': description,
        '[BARNETS NYE RETTELSE, HVIS DER ER EN]': revisions.join('\n') || 'Ingen ændringer endnu.'
      };
      $('manualPrompt').value = prompt.replace(/\[BARNETS [^\]]+\]/g, key => fields[key] ?? key);
      manualRevisions = revisions;
      if ($('describe').hidden) showStage('describe');
      $('manualFlow').hidden = false;
      $('manualPrompt').focus();
    }

    function displayPicture(picture, nextRevisions) {
      result = picture;
      revisions = nextRevisions;
      $('resultImg').src = picture.url;
      $('changes').value = '';
      $('emailForm').reset();
      $('emailForm').hidden = true;
      $('revision').hidden = true;
      $('manualFlow').hidden = true;
      showStage('picture');
    }

    $('importPic').onchange = async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file || pending) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
        msg('Vælg et PNG-, JPEG- eller WebP-billede på højst 12 MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      pending = true;
      try {
        const image = new Image();
        image.src = url;
        const badge = new Image();
        badge.src = './ai-maerke.png';
        await Promise.all([image.decode(), badge.decode()]);
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const width = Math.max(1, Math.round(canvas.width * .11));
        const height = Math.max(1, Math.round(width * badge.naturalHeight / badge.naturalWidth));
        context.drawImage(badge, Math.max(0, canvas.width * .98 - width),
          Math.max(0, canvas.height * .98 - height), width, height);
        displayPicture({url: canvas.toDataURL('image/png')}, manualRevisions);
      } catch {
        msg('Billedet kunne ikke åbnes. Prøv igen med en anden fil.');
      } finally {
        URL.revokeObjectURL(url);
        pending = false;
      }
    };

    async function generate(revision) {
      if (pending || $('connect').disabled) return;
      if (recognition) {
        stopListening();
        msg('Vent, til mikrofonen er stoppet, og se teksten igennem.');
        return;
      }
      const change = revision ? $('changes').value.trim() : '';
      const description = $('description').value.trim();
      if (!description || (revision && !change)) {
        msg(revision ? 'Fortæl eller skriv, hvad der skal ændres.' : 'Fortæl eller skriv lidt om monsteret først.');
        return;
      }
      const next = revision ? [...revisions, change] : [];
      if (next.join('\n').length > 2400) {
        msg('Saml de ønskede ændringer i beskrivelsen, og lav billedet igen.');
        return;
      }
      pending = true;
      const controls = ['approve', 'applyChange', 'restart', 'editDescription', 'emailToggle', 'sendEmail'];
      controls.forEach(id => { $(id).disabled = true; });
      msg('Billedet bliver lavet. Det kan tage et øjeblik.');
      try {
        if ($('provider').value === 'manual') {
          await preparePrompt(description, next);
          return;
        }
        const generated = await request('/api/generate', {
          provider: $('provider').value, description, revisions: next.join('\n')
        });
        const url = 'data:image/png;base64,' + generated.image;
        const preview = new Image();
        preview.src = url;
        await preview.decode();
        displayPicture({...generated, url}, next);
      } catch (error) {
        msg(error.message);
      } finally {
        controls.forEach(id => { $(id).disabled = false; });
        pending = false;
      }
    }

    $('speakHi').onclick = () => speak(greeting);
    $('begin').onclick = () => {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      showStage('describe');
    };
    $('startListen').onclick = () => startListening($('description'));
    $('stopListen').onclick = stopListening;
    $('approve').onclick = () => generate(false);
    $('revise').onclick = () => {
      $('revision').hidden = false;
      $('changes').focus();
    };
    $('startChange').onclick = () => startListening($('changes'));
    $('stopChange').onclick = stopListening;
    $('applyChange').onclick = () => generate(true);
    $('editDescription').onclick = () => showStage('describe');
    $('savePic').onclick = () => {
      if (!result) return;
      const link = document.createElement('a');
      link.href = result.url;
      link.download = 'mit-fantasimonster.png';
      link.click();
    };
    $('emailToggle').onclick = () => {
      $('emailForm').hidden = false;
      const canEmail = mailEnabled && Boolean(result?.signature);
      $('emailHelp').textContent = canEmail ? 'Mailen indeholder billedet som vedhæftet fil.' :
        'Mailafsendelse er endnu ikke aktiv for dette billede. Du kan gemme det som PNG.';
      $('sendEmail').disabled = !canEmail;
      $('email').focus();
    };
    $('emailForm').onsubmit = async event => {
      event.preventDefault();
      if (!result?.signature || !mailEnabled || pending) return;
      pending = true;
      const controls = ['sendEmail', 'applyChange', 'restart', 'editDescription'];
      controls.forEach(id => { $(id).disabled = true; });
      msg('Sender billedet…');
      try {
        const {image, signature, expires} = result;
        await request('/api/email', {email: $('email').value.trim(), image, signature, expires});
        $('emailForm').reset();
        $('emailForm').hidden = true;
        $('emailToggle').focus();
        msg('Mailtjenesten har modtaget billedet til afsendelse.');
      } catch (error) {
        msg(error.message);
      } finally {
        controls.forEach(id => { $(id).disabled = false; });
        pending = false;
      }
    };
    $('restart').onclick = () => {
      result = null;
      revisions = [];
      manualRevisions = [];
      $('manualFlow').hidden = true;
      $('manualPrompt').value = '';
      $('resultImg').removeAttribute('src');
      $('description').value = '';
      $('changes').value = '';
      $('emailForm').reset();
      $('emailForm').hidden = true;
      $('revision').hidden = true;
      showStage('welcome');
    };

  })();
