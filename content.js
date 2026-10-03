(() => {
  const PANEL_WIDTH = 400;
  const PANEL_ID = "__Lovark_panel__";
  const STYLE_ID = "__Lovark_style__";
  const INTER_FONT_URL = chrome.runtime.getURL("fonts/Inter-Regular.woff2");
  const hostname = window.location.hostname;
  let teardownCurrentPanel = null;


  function toggleLovark() {
    const existingPanel = document.getElementById(PANEL_ID);
    const existingStyle = document.getElementById(STYLE_ID);

    if (existingPanel) {
      teardownCurrentPanel?.();
      teardownCurrentPanel = null;
      existingPanel.remove();
      existingStyle?.remove();
      document.documentElement.style.removeProperty("margin-right");
      document.documentElement.style.removeProperty("width");
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
    @font-face {
      font-family: "Inter";
      src: url("${INTER_FONT_URL}") format("woff2");
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
    }

    #${PANEL_ID},
    #${PANEL_ID} * {
      font-family: "Inter", Arial, sans-serif !important;
    }

    html {
      margin-right: ${PANEL_WIDTH}px !important;
      width: calc(100% - ${PANEL_WIDTH}px) !important;
      box-sizing: border-box !important;
      transition: margin-right 180ms ease, width 180ms ease;
    }

    html,
    body {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    html::-webkit-scrollbar,
    body::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
    }

    #${PANEL_ID} .Lovark-header {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      height: 48px !important;
      min-height: 48px !important;
      max-height: 48px !important;
      box-sizing: border-box !important;
      background: #1d1d1c !important;
      border-bottom: 1px solid #272726 !important;
      z-index: 1 !important;
      display: flex !important;
      align-items: center !important;
      gap: 9px !important;
      padding: 0 12px !important;
    }

    #${PANEL_ID} .Lovark-avatar {
      width: 28px !important;
      min-width: 28px !important;
      max-width: 28px !important;
      height: 28px !important;
      min-height: 28px !important;
      max-height: 28px !important;
      box-sizing: border-box !important;
      border: 1px solid #565654 !important;
      border-radius: 50% !important;
      background: #272726 !important;
    }

    #${PANEL_ID} .Lovark-profile-info {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      min-width: 0 !important;
      height: 30px !important;
      line-height: 1 !important;
    }

    #${PANEL_ID} .Lovark-profile-name {
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
      color: #f1f1ef !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      line-height: 16px !important;
    }

    #${PANEL_ID} .Lovark-verified-badge {
      display: block !important;
      width: 10px !important;
      min-width: 10px !important;
      height: 10px !important;
      min-height: 10px !important;
      object-fit: contain !important;
      flex: none !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
    }

    #${PANEL_ID} .Lovark-profile-status {
      color: #858583 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 11px !important;
      font-weight: 400 !important;
      line-height: 13px !important;
    }

    #${PANEL_ID} {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: ${PANEL_WIDTH}px !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      background: #1d1d1c !important;
      z-index: 2147483647 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      font-family: Inter, Arial, sans-serif !important;
    }

    #${PANEL_ID} .Lovark-input {
      position: absolute !important;
      left: 11px !important;
      bottom: 7px !important;
      transform: none !important;
      width: 378px !important;
      min-width: 378px !important;
      max-width: 378px !important;
      height: 95px !important;
      min-height: 95px !important;
      max-height: 950px !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      background: #272726 !important;
      border: 0 !important;
      outline: none !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      transition: height 120ms ease !important;
    }

    #${PANEL_ID} .Lovark-question {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: calc(100% - 42px) !important;
      min-height: 48px !important;
      max-height: calc(100% - 42px) !important;
      margin: 0 !important;
      padding: 12px 14px !important;
      box-sizing: border-box !important;
      background: transparent !important;
      color: #f1f1ef !important;
      caret-color: #f1f1ef !important;
      border: 0 !important;
      outline: none !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 14px !important;
      line-height: 20px !important;
      resize: none !important;
      overflow-x: hidden !important;
      overflow-y: hidden !important;
      z-index: 1 !important;
    }

    #${PANEL_ID} .Lovark-question::placeholder {
      color: #565654 !important;
      opacity: 1 !important;
      font-weight: 700 !important;
    }

    #${PANEL_ID} .Lovark-input.is-recording .Lovark-question,
    #${PANEL_ID} .Lovark-input.is-processing .Lovark-question {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    #${PANEL_ID} .Lovark-waveform {
      position: absolute !important;
      top: 15px !important;
      left: 14px !important;
      width: calc(100% - 28px) !important;
      height: 28px !important;
      display: none !important;
      overflow: visible !important;
      pointer-events: none !important;
      z-index: 2 !important;
    }

    #${PANEL_ID} .Lovark-input.is-recording .Lovark-waveform {
      display: block !important;
    }

    #${PANEL_ID} .Lovark-voice-status {
      position: absolute !important;
      top: 12px !important;
      left: 14px !important;
      right: 48px !important;
      display: none !important;
      overflow: hidden !important;
      color: #565654 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 14px !important;
      font-weight: 400 !important;
      line-height: 20px !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      pointer-events: none !important;
      z-index: 2 !important;
    }

    #${PANEL_ID} .Lovark-input.is-processing .Lovark-voice-status,
    #${PANEL_ID} .Lovark-input.is-notice .Lovark-voice-status {
      display: block !important;
    }

    #${PANEL_ID} .Lovark-input.is-processing .Lovark-voice-status {
      color: transparent !important;
      background-image: linear-gradient(
        90deg,
        #565654 0%,
        #565654 38%,
        #b9b9b7 50%,
        #565654 62%,
        #565654 100%
      ) !important;
      background-size: 220% 100% !important;
      background-clip: text !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      animation: Lovark-transcription-wave 1.65s linear infinite !important;
    }

    @keyframes Lovark-transcription-wave {
      from {
        background-position: 100% 50%;
      }
      to {
        background-position: -100% 50%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${PANEL_ID} .Lovark-input.is-processing .Lovark-voice-status {
        color: #565654 !important;
        background-image: none !important;
        -webkit-text-fill-color: #565654 !important;
        animation: none !important;
      }
    }

    #${PANEL_ID} .Lovark-input-action {
      position: absolute !important;
      bottom: 12px !important;
      width: 28px !important;
      min-width: 28px !important;
      max-width: 28px !important;
      height: 28px !important;
      min-height: 28px !important;
      max-height: 28px !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 50% !important;
      font-family: Inter, Arial, sans-serif !important;
      cursor: pointer !important;
      z-index: 3 !important;
    }

    #${PANEL_ID} .Lovark-add,
    #${PANEL_ID} .Lovark-mic {
      background: #363634 !important;
      border: 1px solid #626261 !important;
      color: #c2c2c2 !important;
    }

    #${PANEL_ID} .Lovark-add {
      left: 12px !important;
    }

    #${PANEL_ID} .Lovark-mic {
      right: 48px !important;
    }

    #${PANEL_ID} .Lovark-mic.is-listening {
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      color: #f1f1ef !important;
    }

    #${PANEL_ID} .Lovark-send {
      right: 12px !important;
      background: #f1f1ef !important;
      border: 0 !important;
      color: #272726 !important;
    }

    #${PANEL_ID} .Lovark-add-icon {
      font-size: 20px !important;
      font-weight: 300 !important;
      line-height: 20px !important;
    }

    #${PANEL_ID} .Lovark-input-action svg {
      width: 16px !important;
      height: 16px !important;
      display: block !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 1.8 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    #${PANEL_ID} .Lovark-send svg {
      width: 14px !important;
      height: 14px !important;
      stroke-width: 2.5 !important;
    }

    #${PANEL_ID} .Lovark-mic.is-listening svg {
      width: 14px !important;
      height: 14px !important;
      stroke-width: 2.5 !important;
    }

    #${PANEL_ID} .Lovark-input-action:disabled {
      cursor: default !important;
      opacity: 0.55 !important;
    }
    `;

    document.documentElement.appendChild(style);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    const header = document.createElement("div");
    header.className = "Lovark-header";
    header.setAttribute("role", "banner");

    const avatar = document.createElement("div");
    avatar.className = "Lovark-avatar";
    avatar.setAttribute("role", "img");
    avatar.setAttribute("aria-label", "Foto de perfil de Lovark");

    const profileInfo = document.createElement("div");
    profileInfo.className = "Lovark-profile-info";

    const profileName = document.createElement("div");
    profileName.className = "Lovark-profile-name";
    const profileNameText = document.createElement("span");
    profileNameText.textContent = "Lovark";

    const verifiedBadge = document.createElement("img");
    verifiedBadge.className = "Lovark-verified-badge";
    verifiedBadge.src = chrome.runtime.getURL("icons/verified.png");
    verifiedBadge.alt = "Conta verificada";
    verifiedBadge.title = "Conta verificada";
    verifiedBadge.decoding = "async";
    verifiedBadge.draggable = false;
    verifiedBadge.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    profileName.appendChild(profileNameText);
    profileName.appendChild(verifiedBadge);

    const profileStatus = document.createElement("div");
    profileStatus.className = "Lovark-profile-status";
    profileStatus.textContent = "online";

    profileInfo.appendChild(profileName);
    profileInfo.appendChild(profileStatus);
    header.appendChild(avatar);
    header.appendChild(profileInfo);

    const inputBox = document.createElement("div");
    inputBox.className = "Lovark-input";
    inputBox.setAttribute("role", "group");
    inputBox.setAttribute("aria-label", "Área de pergunta à Lovark");

    const questionInput = document.createElement("textarea");
    questionInput.className = "Lovark-question";
    questionInput.rows = 1;
    questionInput.placeholder = "Pergunte à Lovark...";
    questionInput.setAttribute("aria-label", "Pergunte à Lovark");

    const addButton = document.createElement("button");
    addButton.className = "Lovark-input-action Lovark-add";
    addButton.type = "button";
    addButton.setAttribute("aria-label", "Adicionar");
    addButton.innerHTML = '<span class="Lovark-add-icon" aria-hidden="true">+</span>';

    const micButton = document.createElement("button");
    micButton.className = "Lovark-input-action Lovark-mic";
    micButton.type = "button";
    micButton.setAttribute("aria-label", "Iniciar gravação");
    const microphoneIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3"></rect>
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0"></path>
        <path d="M12 17.5V21"></path>
        <path d="M8.5 21h7"></path>
      </svg>
    `;

    const cancelIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12"></path>
        <path d="M18 6 6 18"></path>
      </svg>
    `;

    const confirmIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6"></path>
      </svg>
    `;

    const sendIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V5"></path>
        <path d="m6 11 6-6 6 6"></path>
      </svg>
    `;

    micButton.innerHTML = microphoneIcon;

    const waveform = document.createElement("canvas");
    waveform.className = "Lovark-waveform";
    waveform.setAttribute("aria-hidden", "true");

    const voiceStatus = document.createElement("div");
    voiceStatus.className = "Lovark-voice-status";
    voiceStatus.setAttribute("role", "status");
    voiceStatus.setAttribute("aria-live", "polite");
    voiceStatus.hidden = true;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    let voiceState = "idle";
    let activeSession = null;
    let noticeTimer = null;

    const renderVoiceState = () => {
      const isRecording = voiceState === "recording";
      const isStarting = voiceState === "starting";
      const isActive = isRecording || isStarting;
      const isProcessing = voiceState === "processing";
      const isNotice = voiceState === "notice";

      inputBox.classList.toggle("is-recording", isActive);
      inputBox.classList.toggle("is-processing", isProcessing);
      inputBox.classList.toggle("is-notice", isNotice);
      voiceStatus.hidden = !isProcessing && !isNotice;
      micButton.classList.toggle("is-listening", isActive);
      micButton.setAttribute("aria-pressed", String(isActive));
      micButton.innerHTML = isActive ? cancelIcon : microphoneIcon;
      micButton.setAttribute(
        "aria-label",
        isActive ? "Cancelar gravação" : "Iniciar gravação"
      );
      micButton.title = isActive ? "Cancelar gravação" : "Falar para escrever";
      micButton.disabled = isProcessing;
      questionInput.readOnly = isActive || isProcessing;
      sendButton.innerHTML = isActive ? confirmIcon : sendIcon;
      sendButton.setAttribute(
        "aria-label",
        isActive ? "Confirmar gravação" : "Enviar"
      );
      sendButton.title = isActive ? "Confirmar e transcrever" : "Enviar";
      sendButton.disabled = isStarting || isProcessing;
      addButton.disabled = isActive || isProcessing;
    };

    const showVoiceNotice = (message) => {
      window.clearTimeout(noticeTimer);
      voiceStatus.textContent = message;
      voiceState = "notice";
      renderVoiceState();
      noticeTimer = window.setTimeout(() => {
        if (voiceState !== "notice") return;
        voiceState = "idle";
        renderVoiceState();
      }, 2800);
    };

    const releaseAudio = (session) => {
      if (session.animationFrame) {
        window.cancelAnimationFrame(session.animationFrame);
        session.animationFrame = 0;
      }

      if (session.audioSource) {
        try {
          session.audioSource.disconnect();
        } catch {
          // The source may already be disconnected by the browser.
        }
        session.audioSource = null;
      }

      if (session.stream) {
        session.stream.getTracks().forEach((track) => track.stop());
        session.stream = null;
      }

      if (session.audioContext && session.audioContext.state !== "closed") {
        void session.audioContext.close().catch(() => {});
      }
    };

    const animateWaveform = (session) => {
      if (
        activeSession !== session ||
        !session.analyser ||
        voiceState !== "recording"
      ) {
        return;
      }

      const rect = waveform.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (!width || !height) {
        session.animationFrame = window.requestAnimationFrame(() =>
          animateWaveform(session)
        );
        return;
      }

      const pixelRatio = window.devicePixelRatio || 1;
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);
      if (waveform.width !== pixelWidth || waveform.height !== pixelHeight) {
        waveform.width = pixelWidth;
        waveform.height = pixelHeight;
      }

      const canvasContext = waveform.getContext("2d");
      if (!canvasContext) return;
      canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      canvasContext.clearRect(0, 0, width, height);

      const timeSamples = session.timeSamples;
      const frequencySamples = session.frequencySamples;
      session.analyser.getByteTimeDomainData(timeSamples);
      session.analyser.getByteFrequencyData(frequencySamples);

      let squareSum = 0;
      for (const sample of timeSamples) {
        const amplitude = (sample - 128) / 128;
        squareSum += amplitude * amplitude;
      }
      const rms = Math.sqrt(squareSum / timeSamples.length);
      const noiseGate = 0.009;
      const voiceLevel =
        rms > noiseGate
          ? Math.min(1, Math.pow((rms - noiseGate) / 0.075, 0.62))
          : 0;
      const barCount = Math.max(24, Math.min(92, Math.floor(width / 5.6)));
      const slotWidth = width / barCount;
      const barWidth = Math.max(1.2, Math.min(2.4, slotWidth * 0.43));

      if (!session.barHeights || session.barHeights.length !== barCount) {
        session.barHeights = Array.from(
          { length: barCount },
          (_, index) => 1.8 + ((index * 7) % 4) * 0.12
        );
      }

      for (let index = 0; index < barCount; index += 1) {
        const lowBin = Math.floor(
          (index / barCount) * frequencySamples.length * 0.72
        );
        const highBin = Math.max(
          lowBin + 1,
          Math.floor(((index + 1) / barCount) * frequencySamples.length * 0.72)
        );
        let bandLevel = 0;
        for (
          let bin = lowBin;
          bin < highBin && bin < frequencySamples.length;
          bin += 1
        ) {
          bandLevel += frequencySamples[bin];
        }
        bandLevel /= Math.max(1, highBin - lowBin);

        const texture = 0.25 + (bandLevel / 255) * 0.75;
        const targetHeight =
          voiceLevel > 0
            ? 2 + voiceLevel * (5 + texture * 18)
            : 1.8 + ((index * 7) % 4) * 0.12;
        const currentHeight = session.barHeights[index];
        const smoothing = targetHeight > currentHeight ? 0.48 : 0.18;
        const nextHeight =
          currentHeight + (targetHeight - currentHeight) * smoothing;
        session.barHeights[index] = nextHeight;

        const alpha = 0.58 + Math.min(0.3, voiceLevel * 0.3);
        canvasContext.fillStyle = `rgba(218, 218, 216, ${alpha})`;
        canvasContext.fillRect(
          index * slotWidth + (slotWidth - barWidth) / 2,
          (height - nextHeight) / 2,
          barWidth,
          nextHeight
        );
      }

      session.animationFrame = window.requestAnimationFrame(() =>
        animateWaveform(session)
      );
    };

    const normalizeTranscript = (parts) =>
      parts.join(" ").replace(/\s+([,.;!?])/g, "$1").trim();

    const cleanupSession = (session, abortRecognition = false) => {
      session.cancelled = true;
      if (session.finishTimer) {
        window.clearTimeout(session.finishTimer);
        session.finishTimer = 0;
      }
      releaseAudio(session);

      if (abortRecognition && session.recognition) {
        try {
          session.recognition.abort();
        } catch {
          // The recognition service may already have stopped.
        }
      }

      if (activeSession === session) activeSession = null;
    };

    const cancelRecording = () => {
      if (!activeSession) return;
      cleanupSession(activeSession, true);
      window.clearTimeout(noticeTimer);
      voiceState = "idle";
      renderVoiceState();
    };

    const completeTranscription = (session) => {
      if (activeSession !== session || session.cancelled) return;
      const transcript = normalizeTranscript([
        ...session.completedParts,
        ...session.finalParts,
        ...session.interimParts,
      ]);
      const baseText = session.baseText;

      cleanupSession(session);
      voiceState = "idle";
      renderVoiceState();

      if (!transcript) {
        return;
      }

      const separator =
        baseText && !/\s$/.test(baseText) ? " " : "";
      questionInput.value = `${baseText}${separator}${transcript}`;
      questionInput.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const failRecording = (session, message) => {
      if (activeSession !== session) return;
      cleanupSession(session, true);
      voiceState = "idle";
      renderVoiceState();
      showVoiceNotice(message);
    };

    const confirmRecording = () => {
      const session = activeSession;
      if (!session || voiceState !== "recording") return;

      voiceState = "processing";
      voiceStatus.textContent = "Transcrevendo...";
      renderVoiceState();
      releaseAudio(session);

      const watchdogMs = 10000;
      session.finishTimer = window.setTimeout(
        () => completeTranscription(session),
        watchdogMs
      );

      try {
        session.recognition.stop();
      } catch {
        completeTranscription(session);
      }
    };

    const startRecording = async () => {
      if (!SpeechRecognition) {
        showVoiceNotice(
          "O reconhecimento de voz não está disponível neste navegador."
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        showVoiceNotice("Este navegador não permite aceder ao microfone.");
        return;
      }

      window.clearTimeout(noticeTimer);
      const session = {
        baseText: questionInput.value,
        completedParts: [],
        finalParts: [],
        interimParts: [],
        timeSamples: null,
        frequencySamples: null,
        recognition: null,
        stream: null,
        audioContext: null,
        audioSource: null,
        analyser: null,
        animationFrame: 0,
        finishTimer: 0,
        barHeights: null,
        cancelled: false,
        startedAt: Date.now(),
      };

      activeSession = session;
      voiceState = "starting";
      renderVoiceState();

      try {
        session.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (activeSession !== session || session.cancelled) {
          session.stream.getTracks().forEach((track) => track.stop());
          session.stream = null;
          return;
        }

        const AudioContextConstructor =
          window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
          throw new Error("A análise do microfone não está disponível.");
        }

        session.audioContext = new AudioContextConstructor();
        if (session.audioContext.state === "suspended") {
          await session.audioContext.resume();
        }
        session.audioSource =
          session.audioContext.createMediaStreamSource(session.stream);
        session.analyser = session.audioContext.createAnalyser();
        session.analyser.fftSize = 512;
        session.analyser.smoothingTimeConstant = 0.68;
        session.timeSamples = new Uint8Array(session.analyser.fftSize);
        session.frequencySamples = new Uint8Array(
          session.analyser.frequencyBinCount
        );
        session.audioSource.connect(session.analyser);

        const recognition = new SpeechRecognition();
        session.recognition = recognition;
        recognition.lang = "pt-PT";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (resultEvent) => {
          if (activeSession !== session || session.cancelled) return;
          const finalParts = [];
          const interimParts = [];

          for (
            let index = 0;
            index < resultEvent.results.length;
            index += 1
          ) {
            const transcript = resultEvent.results[index][0]?.transcript?.trim();
            if (!transcript) continue;
            if (resultEvent.results[index].isFinal) {
              finalParts.push(transcript);
            } else {
              interimParts.push(transcript);
            }
          }

          session.finalParts = finalParts;
          session.interimParts = interimParts;
        };

        recognition.onerror = (errorEvent) => {
          if (activeSession !== session || session.cancelled) return;
          if (
            errorEvent.error === "no-speech" &&
            voiceState === "recording"
          ) {
            return;
          }

          const message =
            errorEvent.error === "not-allowed" ||
            errorEvent.error === "service-not-allowed"
              ? "Permita o acesso ao microfone para continuar."
              : "Não foi possível transcrever. Tente novamente.";
          failRecording(session, message);
        };

        recognition.onend = () => {
          if (activeSession !== session || session.cancelled) return;
          if (voiceState === "processing") {
            completeTranscription(session);
            return;
          }

          if (voiceState === "recording") {
            session.completedParts.push(
              ...session.finalParts,
              ...session.interimParts
            );
            session.finalParts = [];
            session.interimParts = [];
            window.setTimeout(() => {
              if (
                activeSession !== session ||
                session.cancelled ||
                voiceState !== "recording"
              ) {
                return;
              }
              try {
                recognition.start();
              } catch {
                failRecording(
                  session,
                  "A gravação foi interrompida. Tente novamente."
                );
              }
            }, 180);
          }
        };

        voiceState = "recording";
        renderVoiceState();
        animateWaveform(session);
        recognition.start();
      } catch (error) {
        console.error("Lovark voice input:", error);
        const message =
          error?.name === "NotAllowedError" ||
          error?.name === "PermissionDeniedError"
            ? "Permita o acesso ao microfone para continuar."
            : "Não foi possível iniciar o microfone. Tente novamente.";
        failRecording(session, message);
      }
    };

    micButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (voiceState === "starting" || voiceState === "recording") {
        cancelRecording();
        return;
      }

      if (voiceState === "idle" || voiceState === "notice") {
        void startRecording();
      }
    });

    const sendButton = document.createElement("button");
    sendButton.className = "Lovark-input-action Lovark-send";
    sendButton.type = "button";
    sendButton.setAttribute("aria-label", "Enviar");
    sendButton.innerHTML = sendIcon;

    sendButton.addEventListener("click", (event) => {
      if (voiceState !== "starting" && voiceState !== "recording") return;
      event.preventDefault();
      event.stopPropagation();
      confirmRecording();
    });

    inputBox.appendChild(questionInput);
    inputBox.appendChild(addButton);
    inputBox.appendChild(waveform);
    inputBox.appendChild(voiceStatus);
    inputBox.appendChild(micButton);
    inputBox.appendChild(sendButton);

    const MIN_INPUT_HEIGHT = 95;
    const MAX_INPUT_PARAGRAPHS = 10;
    const INPUT_ACTIONS_SPACE = 42;
    const QUESTION_VERTICAL_PADDING = 24;
    const QUESTION_LINE_HEIGHT = 20;
    const MAX_INPUT_HEIGHT =
      INPUT_ACTIONS_SPACE +
      QUESTION_VERTICAL_PADDING +
      MAX_INPUT_PARAGRAPHS * QUESTION_LINE_HEIGHT;

    const resizeQuestionArea = () => {
      inputBox.style.setProperty(
        "height",
        `${MIN_INPUT_HEIGHT}px`,
        "important"
      );
      questionInput.style.setProperty(
        "height",
        `${MIN_INPUT_HEIGHT - 42}px`,
        "important"
      );
      const requiredHeight = questionInput.scrollHeight + INPUT_ACTIONS_SPACE;
      const nextHeight = Math.min(
        MAX_INPUT_HEIGHT,
        Math.max(MIN_INPUT_HEIGHT, requiredHeight)
      );

      inputBox.style.setProperty("height", `${nextHeight}px`, "important");
      questionInput.style.setProperty(
        "height",
        `${nextHeight - 42}px`,
        "important"
      );
      questionInput.style.setProperty(
        "overflow-y",
        requiredHeight > MAX_INPUT_HEIGHT ? "auto" : "hidden",
        "important"
      );
    };

    questionInput.addEventListener("input", resizeQuestionArea);

    panel.appendChild(header);
    panel.appendChild(inputBox);
    document.documentElement.appendChild(panel);
    resizeQuestionArea();
    renderVoiceState();

    teardownCurrentPanel = () => {
      window.clearTimeout(noticeTimer);
      if (activeSession) cleanupSession(activeSession, true);
      activeSession = null;
      voiceState = "idle";
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "Lovark_TOGGLE") return;
    toggleLovark();
    sendResponse({ ok: true });
  });
})();