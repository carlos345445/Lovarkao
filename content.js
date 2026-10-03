(() => {
  const PANEL_WIDTH = 400;
  const CHAT_MESSAGE_PREVIEW_LENGTH = 85;
  const PANEL_ID = "__Lovark_panel__";
  const STYLE_ID = "__Lovark_style__";
  const PAGE_SHIFT_CLASS = "__Lovark_page_shift__";
  const INTER_FONT_URL = chrome.runtime.getURL("fonts/Inter-Regular.woff2");
  const hostname = window.location.hostname;
  const LOVABLE_COUNTER_TEXT = "999999 | Lovark";
  let teardownCurrentPanel = null;
  let addedPageShiftClass = false;
  let lovableCreditObserver = null;
  let lovableCreditEffectActive = false;
  let lovableCreditSyncFrame = null;
  const pendingLovableCreditChangedNodes = new Set();
  const pendingLovableCreditAddedNodes = new Set();
  const originalLovableCounterTexts = new Map();
  const overriddenLovableCounterParagraphs = new Set();
  const originalLovableMeterStates = new Map();
  const lovableMeterObservers = new Map();

  function isLovarkOnline() {
    return (
      window.location.protocol === "https:" &&
      hostname.toLowerCase() === "lovable.dev" &&
      window.navigator.onLine &&
      /^\/projects\/[^/]+(?:\/.*)?$/.test(window.location.pathname)
    );
  }

  function shouldApplyLovableCreditEffect() {
    return (
      hostname.toLowerCase() === "lovable.dev" &&
      isLovarkOnline() &&
      Boolean(document.getElementById(PANEL_ID))
    );
  }

  function getCreditParagraphFromParent(parent) {
    if (
      !parent ||
      parent.nodeType !== Node.ELEMENT_NODE ||
      !parent.matches("div.flex.items-center.gap-px")
    ) {
      return null;
    }

    const paragraph = parent.querySelector(":scope > p");
    if (!paragraph) return null;

    // O Lovable identifica a ação de créditos pelo texto "Upgrade".
    // A detecção textual é mais estável entre versões do ícone/SVG e navegadores.
    return paragraph.textContent?.trim() === "Upgrade" ? paragraph : null;
  }

  function getCreditParagraph(node) {
    const element =
      node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    const paragraph = element?.closest?.("p");
    if (paragraph) {
      return getCreditParagraphFromParent(paragraph.parentElement);
    }
    return getCreditParagraphFromParent(element);
  }

  function replaceLovableUpgradeParagraph(paragraph) {
    if (
      !paragraph ||
      paragraph.nodeType !== Node.ELEMENT_NODE ||
      paragraph.tagName !== "P" ||
      !paragraph.parentElement?.matches("div.flex.items-center.gap-px")
    ) {
      return false;
    }

    if (paragraph.textContent?.trim() !== "Upgrade") return false;

    const currentText = paragraph.textContent ?? "";
    originalLovableCounterTexts.set(paragraph, currentText);
    overriddenLovableCounterParagraphs.add(paragraph);
    paragraph.textContent = LOVABLE_COUNTER_TEXT;
    return true;
  }

  function replaceLovableUpgradeParagraphs(root = document) {
    const paragraphs = root.querySelectorAll?.(
      'div.flex.items-center.gap-px > p'
    ) || [];

    let replaced = false;
    for (const paragraph of paragraphs) {
      if (replaceLovableUpgradeParagraph(paragraph)) {
        replaced = true;
      }
    }
    return replaced;
  }

  function collectCreditParagraphs(node, paragraphs) {
    if (node?.nodeType !== Node.ELEMENT_NODE) return;
    const directParagraph = getCreditParagraph(node);
    if (directParagraph) paragraphs.add(directParagraph);
    for (const paragraph of node.querySelectorAll(
      "div.flex.items-center.gap-px > p"
    )) {
      const matchedParagraph = getCreditParagraphFromParent(
        paragraph.parentElement
      );
      if (matchedParagraph) paragraphs.add(matchedParagraph);
    }
  }

  function getCreditMeter(node) {
    const element =
      node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return element?.closest?.('[data-slot="meter"]') || null;
  }

  function collectCreditMeters(node, meters) {
    if (node?.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches('[data-slot="meter"]')) meters.add(node);

    for (const meter of node.querySelectorAll('[data-slot="meter"]')) {
      meters.add(meter);
    }
  }

  function captureInlineProperties(element, properties) {
    return new Map(
      properties.map((property) => [
        property,
        {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        },
      ])
    );
  }

  function restoreInlineProperties(element, originalProperties) {
    for (const [property, original] of originalProperties) {
      if (original.value) {
        element.style.setProperty(property, original.value, original.priority);
      } else {
        element.style.removeProperty(property);
      }
    }
  }

  const LOVABLE_METER_INDICATOR_PROPERTIES = [
    "position",
    "left",
    "right",
    "width",
    "height",
    "transform",
    "background",
    "background-color",
    "opacity",
    "visibility",
  ];

  function captureMeterIndicator(indicator) {
    return {
      element: indicator,
      styles: captureInlineProperties(
        indicator,
        LOVABLE_METER_INDICATOR_PROPERTIES
      ),
    };
  }

  function restoreMeterIndicator(state) {
    if (!state) return;
    restoreInlineProperties(state.element, state.styles);
  }

  function setImportantStyleIfDifferent(element, property, value) {
    if (
      element.style.getPropertyValue(property) !== value ||
      element.style.getPropertyPriority(property) !== "important"
    ) {
      element.style.setProperty(property, value, "important");
    }
  }

  function applyCreditMeter(meter, state) {
    const indicator = meter.querySelector(
      '[data-slot="meter-indicator"]'
    );
    if (state.indicator?.element !== indicator) {
      restoreMeterIndicator(state.indicator);
      state.indicator = indicator ? captureMeterIndicator(indicator) : null;
    }
    if (!indicator) {
      restoreMeterIndicator(state.indicator);
      state.indicator = null;
      restoreInlineProperties(meter, state.styles);
      return;
    }

    setImportantStyleIfDifferent(meter, "--credits-fill-width", "100%");
    setImportantStyleIfDifferent(indicator, "position", "absolute");
    setImportantStyleIfDifferent(indicator, "left", "0px");
    setImportantStyleIfDifferent(indicator, "right", "0px");
    setImportantStyleIfDifferent(indicator, "width", "auto");
    setImportantStyleIfDifferent(indicator, "height", "100%");
    setImportantStyleIfDifferent(indicator, "transform", "none");
    setImportantStyleIfDifferent(indicator, "background", "#2563eb");
    setImportantStyleIfDifferent(indicator, "background-color", "#2563eb");
    setImportantStyleIfDifferent(indicator, "opacity", "1");
    setImportantStyleIfDifferent(indicator, "visibility", "visible");
  }

  function restoreCreditMeter(meter, state) {
    restoreMeterIndicator(state.indicator);
    restoreInlineProperties(meter, state.styles);
  }

  function restoreLovableCounterParagraph(paragraph) {
    if (!overriddenLovableCounterParagraphs.has(paragraph)) return;

    const originalText = originalLovableCounterTexts.get(paragraph);
    overriddenLovableCounterParagraphs.delete(paragraph);
    originalLovableCounterTexts.delete(paragraph);

    if (
      paragraph.textContent === LOVABLE_COUNTER_TEXT &&
      typeof originalText === "string"
    ) {
      paragraph.textContent = originalText;
    }
  }

  function restoreLovableCreditEffect() {
    for (const paragraph of Array.from(
      overriddenLovableCounterParagraphs
    )) {
      restoreLovableCounterParagraph(paragraph);
    }
    for (const [meter, state] of originalLovableMeterStates) {
      restoreCreditMeter(meter, state);
    }
    originalLovableMeterStates.clear();
    lovableCreditEffectActive = false;
  }

  function disconnectLovableCreditObserver() {
    lovableCreditObserver?.disconnect();
    lovableCreditObserver = null;
    for (const observer of lovableMeterObservers.values()) {
      observer.disconnect();
    }
    lovableMeterObservers.clear();
    if (lovableCreditSyncFrame !== null) {
      window.cancelAnimationFrame(lovableCreditSyncFrame);
      lovableCreditSyncFrame = null;
    }
    pendingLovableCreditChangedNodes.clear();
    pendingLovableCreditAddedNodes.clear();
  }

  function scheduleLovableCreditSync(changedNodes, addedNodes = []) {
    for (const node of changedNodes) {
      pendingLovableCreditChangedNodes.add(node);
    }
    for (const node of addedNodes) {
      pendingLovableCreditAddedNodes.add(node);
    }
    if (lovableCreditSyncFrame !== null) return;

    lovableCreditSyncFrame = window.requestAnimationFrame(() => {
      lovableCreditSyncFrame = null;
      const changed = Array.from(pendingLovableCreditChangedNodes);
      const added = Array.from(pendingLovableCreditAddedNodes);
      pendingLovableCreditChangedNodes.clear();
      pendingLovableCreditAddedNodes.clear();
      syncLovableCreditEffect(changed, added);
    });
  }

  function observeLovableCreditMeter(meter) {
    if (lovableMeterObservers.has(meter)) return;
    const observer = new MutationObserver(() => {
      scheduleLovableCreditSync([meter]);
    });
    observer.observe(meter, {
      attributes: true,
      attributeFilter: ["class", "data-slot", "style"],
      subtree: true,
    });
    lovableMeterObservers.set(meter, observer);
  }

  function observeLovableCreditChanges() {
    disconnectLovableCreditObserver();
    lovableCreditObserver = new MutationObserver((records) => {
      const changedNodes = [];
      const addedNodes = [];
      for (const record of records) {
        const targetElement =
          record.target.nodeType === Node.ELEMENT_NODE
            ? record.target
            : record.target.parentElement;
        if (targetElement?.closest?.(`#${PANEL_ID}`)) continue;

        if (
          record.type === "childList" ||
          record.type === "characterData" ||
          record.attributeName === "d" ||
          record.attributeName === "data-slot"
        ) {
          changedNodes.push(record.target);

          // Substitui "Upgrade" imediatamente quando o Lovable recria o
          // contador, evitando um frame em que os dois textos aparecem.
          if (record.type === "childList") {
            for (const node of record.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue;
              replaceLovableUpgradeParagraphs(node);
            }
          } else if (record.target.nodeType === Node.ELEMENT_NODE) {
            const paragraph = record.target.closest?.("p");
            if (paragraph) replaceLovableUpgradeParagraph(paragraph);
          }
        }
        if (record.type === "childList") {
          for (const node of record.addedNodes) {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              !node.closest(`#${PANEL_ID}`)
            ) {
              addedNodes.push(node);
            }
          }
        }
      }
      scheduleLovableCreditSync(changedNodes, addedNodes);
    });
    lovableCreditObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["d", "data-slot"],
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  function syncLovableCreditEffect(changedNodes = null, addedNodes = []) {
    const shouldBeActive = shouldApplyLovableCreditEffect();
    if (!shouldBeActive) {
      if (lovableCreditEffectActive || originalLovableMeterStates.size) {
        restoreLovableCreditEffect();
      }
      disconnectLovableCreditObserver();
      return;
    }

    const becameActive = !lovableCreditEffectActive;
    lovableCreditEffectActive = true;
    if (becameActive) observeLovableCreditChanges();
    const paragraphs = new Set();
    const meters = new Set();

    if (becameActive) {
      replaceLovableUpgradeParagraphs(document.documentElement);
      collectCreditParagraphs(document.documentElement, paragraphs);
      collectCreditMeters(document.documentElement, meters);
    } else if (changedNodes) {
      for (const node of changedNodes) {
        const changedParagraph = getCreditParagraph(node);
        if (changedParagraph) paragraphs.add(changedParagraph);

        const changedMeter = getCreditMeter(node);
        if (changedMeter) meters.add(changedMeter);
      }
      for (const node of addedNodes) {
        collectCreditParagraphs(node, paragraphs);
        collectCreditMeters(node, meters);
      }
    } else {
      for (const paragraph of overriddenLovableCounterParagraphs) {
        paragraphs.add(paragraph);
      }
      for (const meter of originalLovableMeterStates.keys()) {
        meters.add(meter);
      }
    }

    for (const paragraph of Array.from(
      overriddenLovableCounterParagraphs
    )) {
      if (
        !paragraph.isConnected ||
        !getCreditParagraphFromParent(paragraph.parentElement)
      ) {
        restoreLovableCounterParagraph(paragraph);
      }
    }

    for (const paragraph of paragraphs) {
      if (paragraph.textContent?.trim() === "Upgrade") {
        replaceLovableUpgradeParagraph(paragraph);
      }
    }

    for (const [meter, state] of Array.from(
      originalLovableMeterStates
    )) {
      if (!meter.isConnected || !meter.matches('[data-slot="meter"]')) {
        restoreCreditMeter(meter, state);
        originalLovableMeterStates.delete(meter);
        lovableMeterObservers.get(meter)?.disconnect();
        lovableMeterObservers.delete(meter);
      }
    }

    for (const meter of meters) {
      let state = originalLovableMeterStates.get(meter);
      if (!state) {
        state = {
          styles: captureInlineProperties(meter, [
            "--credits-fill-width",
          ]),
          indicator: null,
        };
        originalLovableMeterStates.set(meter, state);
      }
      observeLovableCreditMeter(meter);
      applyCreditMeter(meter, state);
    }
  }

  function updateLovableCreditEffectState() {
    syncLovableCreditEffect();
  }

  function startLovableCreditEffectController() {
    if (hostname.toLowerCase() !== "lovable.dev") return;

    // O efeito só fica ativo num projeto HTTPS, online e com o painel aberto.
    // A identificação do contador é feita pelo texto "Upgrade", sem depender
    // do desenho do ícone/SVG usado pelo Lovable.
    syncLovableCreditEffect();

    // Online/offline altera apenas o estado do efeito; não cria timers.
    window.addEventListener("online", updateLovableCreditEffectState);
    window.addEventListener("offline", updateLovableCreditEffectState);

    // Navegação dentro de lovable.dev pode mudar o projeto/rota sem
    // recarregar o content script.
    window.addEventListener("popstate", updateLovableCreditEffectState);
    window.addEventListener("hashchange", updateLovableCreditEffectState);
    window.addEventListener("pageshow", updateLovableCreditEffectState);
    window.navigation?.addEventListener(
      "currententrychange",
      updateLovableCreditEffectState
    );
  }


  function toggleLovark() {
    const existingPanel = document.getElementById(PANEL_ID);
    const existingStyle = document.getElementById(STYLE_ID);

    if (existingPanel) {
      teardownCurrentPanel?.();
      teardownCurrentPanel = null;
      existingPanel.remove();
      existingStyle?.remove();
      if (addedPageShiftClass) {
        document.documentElement.classList.remove(PAGE_SHIFT_CLASS);
        addedPageShiftClass = false;
      }
      syncLovableCreditEffect();
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
    @font-face {
      font-family: "Inter";
      src: url("${INTER_FONT_URL}") format("woff2");
      font-style: normal;
      font-weight: 400;
      font-display: swap;
    }

    #${PANEL_ID},
    #${PANEL_ID} * {
      font-family: "Inter", Arial, sans-serif !important;
      font-synthesis: weight !important;
    }

    html.${PAGE_SHIFT_CLASS} {
      margin-right: ${PANEL_WIDTH}px !important;
      width: calc(100% - ${PANEL_WIDTH}px) !important;
      max-width: calc(100% - ${PANEL_WIDTH}px) !important;
      box-sizing: border-box !important;
      transition: margin-right 180ms ease, width 180ms ease;
    }

    html.${PAGE_SHIFT_CLASS} body {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
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
      border-bottom: 0 !important;
      z-index: 1 !important;
      display: flex !important;
      align-items: center !important;
      gap: 9px !important;
      padding: 0 12px !important;
    }

    #${PANEL_ID} .Lovark-header::after {
      content: "" !important;
      position: absolute !important;
      left: 12px !important;
      right: 12px !important;
      bottom: 0 !important;
      height: 2px !important;
      background: #272726 !important;
      pointer-events: none !important;
    }

    #${PANEL_ID} .Lovark-avatar {
      width: 28px !important;
      min-width: 28px !important;
      max-width: 28px !important;
      height: 28px !important;
      min-height: 28px !important;
      max-height: 28px !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 1.5px solid transparent !important;
      border-radius: 50% !important;
      background:
        linear-gradient(#1d1d1c, #1d1d1c) padding-box,
        conic-gradient(
          from 230deg,
          #304dfb,
          #6c33d4,
          #e838d2,
          #fc5fa0,
          #fd9b61,
          #304dfb
        ) border-box !important;
      box-shadow:
        0 0 8px rgba(108, 51, 212, 0.36),
        0 0 12px rgba(232, 56, 210, 0.14) !important;
      overflow: hidden !important;
    }

    #${PANEL_ID} .Lovark-avatar img {
      width: 22px !important;
      min-width: 22px !important;
      max-width: 22px !important;
      height: 22px !important;
      min-height: 22px !important;
      max-height: 22px !important;
      display: block !important;
      object-fit: contain !important;
      border-radius: 50% !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
    }

    #${PANEL_ID} .Lovark-profile-info {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      min-width: 0 !important;
      height: 30px !important;
      line-height: 1 !important;
    }

    #${PANEL_ID} .Lovark-header-actions {
      height: 100% !important;
      margin-left: auto !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      flex: none !important;
      color: #c2c2c2 !important;
      pointer-events: none !important;
      user-select: none !important;
    }

    #${PANEL_ID} .Lovark-header-icon {
      width: 24px !important;
      min-width: 24px !important;
      height: 24px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-sizing: border-box !important;
      border: 0 !important;
      background: transparent !important;
      color: inherit !important;
    }

    #${PANEL_ID} .Lovark-header-icon svg {
      width: 19px !important;
      height: 19px !important;
      display: block !important;
      fill: currentColor !important;
      stroke: none !important;
    }

    #${PANEL_ID} .Lovark-profile-name,
    #${PANEL_ID} .Lovark-profile-name span {
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
      color: #f1f1ef !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 14px !important;
    }

    #${PANEL_ID} .Lovark-profile-name {
      user-select: none !important;
      -webkit-user-drag: none !important;
    }

    #${PANEL_ID} .Lovark-verified-badge {
      display: block !important;
      width: 10px !important;
      min-width: 10px !important;
      height: 10px !important;
      min-height: 10px !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
      flex: none !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
    }

    #${PANEL_ID} .Lovark-profile-status {
      color: #858583 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 8px !important;
      font-weight: 700 !important;
      line-height: 10px !important;
    }

    #${PANEL_ID} .Lovark-profile-status.is-online {
      color: #b18aff !important;
    }

    #${PANEL_ID} .Lovark-profile-name span,
    #${PANEL_ID} .Lovark-profile-status,
    #${PANEL_ID} .Lovark-detection-title,
    #${PANEL_ID} .Lovark-question::placeholder,
    #${PANEL_ID} .Lovark-voice-status {
      -webkit-text-stroke: 0.3px currentColor !important;
    }

    #${PANEL_ID} {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: ${PANEL_WIDTH}px !important;
      height: 100vh !important;
      --Lovark-input-left: 11px;
      --Lovark-input-width: 378px;
      --Lovark-control-size: 24px;
      --Lovark-control-gap: 8px;
      --Lovark-control-right-inset: 12px;
      --Lovark-mode-width: 84px;
      --Lovark-mode-height: 26px;
      --Lovark-mode-right: calc(
        var(--Lovark-control-right-inset) +
        var(--Lovark-control-size) +
        var(--Lovark-control-gap) +
        var(--Lovark-control-size) +
        var(--Lovark-control-gap)
      );
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

    #${PANEL_ID} .Lovark-input.has-service-prompt {
      border-radius: 0 0 8px 8px !important;
    }

    #${PANEL_ID} .Lovark-service-prompts {
      position: absolute !important;
      left: 11px !important;
      right: 11px !important;
      bottom: calc(7px + var(--Lovark-input-height, 80px) - 1px) !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      box-sizing: border-box !important;
      z-index: 6 !important;
      opacity: 0 !important;
      transform: translateY(8px) !important;
      pointer-events: none !important;
      transition:
        opacity 180ms ease,
        transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
        bottom 180ms ease !important;
      will-change: opacity, transform !important;
    }

    #${PANEL_ID} .Lovark-service-prompts[hidden] {
      display: none !important;
    }

    #${PANEL_ID} .Lovark-service-prompts.is-visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
      pointer-events: auto !important;
    }

    #${PANEL_ID} .Lovark-detection-card {
      min-height: 42px !important;
      padding: 5px 8px 5px 10px !important;
      box-sizing: border-box !important;
      display: grid !important;
      grid-template-columns: 24px minmax(0, 1fr) auto 28px !important;
      grid-template-rows: 30px !important;
      column-gap: 8px !important;
      row-gap: 0 !important;
      align-items: center !important;
      background: #212120 !important;
      border: 1px solid #2b2b2a !important;
      border-radius: 10px !important;
      color: #f1f1ef !important;
    }

    #${PANEL_ID} .Lovark-detection-card[hidden] {
      display: none !important;
    }

    #${PANEL_ID} .Lovark-detection-icon {
      width: 22px !important;
      height: 22px !important;
      display: block !important;
      object-fit: contain !important;
      overflow: visible !important;
      grid-column: 1 !important;
      grid-row: 1 !important;
      justify-self: center !important;
      align-self: center !important;
      pointer-events: none !important;
    }

    #${PANEL_ID} .Lovark-detection-title {
      min-width: 0 !important;
      height: 30px !important;
      display: flex !important;
      align-items: center !important;
      text-align: left !important;
      color: #f1f1ef !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      line-height: 18px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      grid-column: 2 !important;
      grid-row: 1 !important;
    }

    #${PANEL_ID} .Lovark-detection-close {
      width: 28px !important;
      min-width: 28px !important;
      height: 28px !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 0 !important;
      border-radius: 6px !important;
      background: transparent !important;
      color: #858583 !important;
      cursor: pointer !important;
      grid-column: 4 !important;
      grid-row: 1 !important;
    }

    #${PANEL_ID} .Lovark-detection-close:hover {
      background: #2b2b2a !important;
      color: #f1f1ef !important;
    }

    #${PANEL_ID} .Lovark-detection-connect {
      min-width: 58px !important;
      height: 25px !important;
      padding: 0 8px !important;
      box-sizing: border-box !important;
      border: 0 !important;
      border-radius: 5px !important;
      outline: none !important;
      background: #f1f1ef !important;
      color: #272726 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      line-height: 25px !important;
      -webkit-text-stroke: 0.3px currentColor !important;
      text-align: center !important;
      cursor: pointer !important;
      grid-column: 3 !important;
      grid-row: 1 !important;
      align-self: center !important;
    }

    #${PANEL_ID} .Lovark-detection-connect:hover {
      background: #ffffff !important;
    }

    #${PANEL_ID} .Lovark-detection-connect:focus-visible {
      outline: 2px solid #858583 !important;
      outline-offset: 2px !important;
    }

    #${PANEL_ID} .Lovark-detection-close svg,
    #${PANEL_ID} .Lovark-input-action svg {
      width: 14px !important;
      height: 14px !important;
      display: block !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 2.5 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    @media (prefers-reduced-motion: reduce) {
      #${PANEL_ID} .Lovark-service-prompts {
        transition: none !important;
      }
      #${PANEL_ID} .Lovark-scroll-down {
        transition: none !important;
      }
      #${PANEL_ID} .Lovark-mode-chevron {
        transition: none !important;
      }
      #${PANEL_ID} .Lovark-add svg {
        transition: none !important;
      }
    }

    #${PANEL_ID} .Lovark-message-list {
      position: absolute !important;
      top: 58px !important;
      left: 11px !important;
      right: 11px !important;
      bottom: calc(7px + var(--Lovark-input-height, 80px) + 12px) !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      padding: 8px 5px 10px !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
      scrollbar-width: thin !important;
      scrollbar-color: #4b4b49 transparent !important;
      z-index: 2 !important;
    }

    #${PANEL_ID} .Lovark-message-list[hidden] {
      display: none !important;
    }

    #${PANEL_ID} .Lovark-scroll-down {
      position: absolute !important;
      left: 50% !important;
      bottom: calc(7px + var(--Lovark-input-height, 80px) + 6px) !important;
      width: 36px !important;
      height: 36px !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 1px solid #626261 !important;
      border-radius: 50% !important;
      outline: none !important;
      background: #363634 !important;
      color: #c2c2c2 !important;
      cursor: pointer !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: translate(-50%, 5px) !important;
      transition:
        opacity 150ms ease,
        transform 150ms ease,
        visibility 150ms ease !important;
      z-index: 7 !important;
    }

    #${PANEL_ID} .Lovark-scroll-down:hover {
      background: #41413f !important;
    }

    #${PANEL_ID} .Lovark-scroll-down:focus-visible {
      outline: 2px solid #8d6ad8 !important;
      outline-offset: 2px !important;
    }

    #${PANEL_ID} .Lovark-scroll-down.is-visible {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
      transform: translate(-50%, 0) !important;
    }

    #${PANEL_ID} .Lovark-scroll-down-arrow {
      position: relative !important;
      width: 16px !important;
      height: 18px !important;
      display: block !important;
      pointer-events: none !important;
    }

    #${PANEL_ID} .Lovark-scroll-down-shaft,
    #${PANEL_ID} .Lovark-scroll-down-head-left,
    #${PANEL_ID} .Lovark-scroll-down-head-right {
      position: absolute !important;
      display: block !important;
      background: currentColor !important;
      border-radius: 1px !important;
    }

    #${PANEL_ID} .Lovark-scroll-down-shaft {
      top: 1px !important;
      left: 7px !important;
      width: 2px !important;
      height: 13px !important;
    }

    #${PANEL_ID} .Lovark-scroll-down-head-left,
    #${PANEL_ID} .Lovark-scroll-down-head-right {
      top: 10px !important;
      width: 8px !important;
      height: 2px !important;
    }

    #${PANEL_ID} .Lovark-scroll-down-head-left {
      left: 1px !important;
      transform: rotate(45deg) !important;
    }

    #${PANEL_ID} .Lovark-scroll-down-head-right {
      left: 7px !important;
      transform: rotate(-45deg) !important;
    }

    #${PANEL_ID} .Lovark-message-list::-webkit-scrollbar {
      width: 4px !important;
      display: block !important;
    }

    #${PANEL_ID} .Lovark-message-list::-webkit-scrollbar-thumb {
      border-radius: 4px !important;
      background: #4b4b49 !important;
    }

    #${PANEL_ID} .Lovark-message-row {
      width: 100% !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 3px !important;
    }

    #${PANEL_ID} .Lovark-message-row:first-child {
      margin-top: auto !important;
    }

    #${PANEL_ID} .Lovark-message-bubble {
      position: relative !important;
      min-width: 44px !important;
      max-width: 82% !important;
      padding: 8px 11px !important;
      box-sizing: border-box !important;
      border: 1px solid #3b3b39 !important;
      border-radius: 15px 15px 0 15px !important;
      background: #292928 !important;
      color: #f1f1ef !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 13px !important;
      font-weight: 400 !important;
      line-height: 19px !important;
      white-space: pre-wrap !important;
      overflow-wrap: anywhere !important;
      word-break: normal !important;
    }

    #${PANEL_ID} .Lovark-message-bubble.is-truncated {
      padding: 13px 16px 12px !important;
      border-color: #41413f !important;
      font-size: 15px !important;
      font-weight: 500 !important;
      line-height: 22px !important;
    }

    #${PANEL_ID} .Lovark-message-show-more {
      display: block !important;
      margin: 9px 0 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      color: #aaa9a6 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 13px !important;
      font-weight: 400 !important;
      line-height: 18px !important;
      text-align: left !important;
      cursor: pointer !important;
    }

    #${PANEL_ID} .Lovark-message-show-more:hover {
      color: #e0e0dd !important;
    }

    #${PANEL_ID} .Lovark-message-show-more:focus-visible {
      outline: 1px solid #8d6ad8 !important;
      outline-offset: 2px !important;
    }

    #${PANEL_ID} .Lovark-message-meta {
      min-height: 26px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 7px !important;
      padding-right: 1px !important;
      box-sizing: border-box !important;
      opacity: 0 !important;
      transform: translateY(2px) !important;
      transition: opacity 130ms ease, transform 130ms ease !important;
    }

    #${PANEL_ID} .Lovark-message-row:hover .Lovark-message-meta,
    #${PANEL_ID} .Lovark-message-row:focus-within .Lovark-message-meta {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }

    #${PANEL_ID} .Lovark-message-time {
      color: #aaa9a6 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      line-height: 16px !important;
      white-space: nowrap !important;
    }

    #${PANEL_ID} .Lovark-message-copy {
      position: relative !important;
      width: 18px !important;
      min-width: 18px !important;
      height: 20px !important;
      min-height: 20px !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #bcbcb9 !important;
      cursor: pointer !important;
      transition: color 140ms ease !important;
    }

    #${PANEL_ID} .Lovark-message-copy svg {
      width: 14px !important;
      height: 14px !important;
      display: block !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 1.8 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    #${PANEL_ID} .Lovark-message-copy:hover,
    #${PANEL_ID} .Lovark-message-copy:focus-visible {
      outline: none !important;
      color: #f1f1ef !important;
    }

    #${PANEL_ID} .Lovark-message-copy.is-copied {
      border: 0 !important;
      background: transparent !important;
      color: #bcbcb9 !important;
      box-shadow: none !important;
      filter: none !important;
    }

    #${PANEL_ID} .Lovark-message-copy.is-copied svg {
      color: #b18aff !important;
    }

    #${PANEL_ID} .Lovark-message-copy::after {
      content: attr(data-tooltip) !important;
      position: absolute !important;
      right: 50% !important;
      bottom: calc(100% + 7px) !important;
      padding: 5px 9px !important;
      border: 1px solid #454543 !important;
      border-radius: 8px !important;
      background: #30302f !important;
      color: #f1f1ef !important;
      box-shadow: 0 5px 16px rgba(0, 0, 0, 0.34) !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 11px !important;
      font-weight: 525 !important;
      line-height: 16px !important;
      white-space: nowrap !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transform: translate(50%, 3px) !important;
      transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease !important;
      z-index: 20 !important;
    }

    #${PANEL_ID} .Lovark-message-copy:hover::after,
    #${PANEL_ID} .Lovark-message-copy:focus-visible::after,
    #${PANEL_ID} .Lovark-message-copy.is-copied::after {
      opacity: 1 !important;
      visibility: visible !important;
      transform: translate(50%, 0) !important;
    }

    #${PANEL_ID} .Lovark-input {
      position: absolute !important;
      left: var(--Lovark-input-left) !important;
      bottom: 7px !important;
      transform: none !important;
      width: var(--Lovark-input-width) !important;
      min-width: var(--Lovark-input-width) !important;
      max-width: var(--Lovark-input-width) !important;
      height: 80px !important;
      min-height: 80px !important;
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
      min-height: 38px !important;
      max-height: calc(100% - 42px) !important;
      margin: 0 !important;
      padding: 8px 14px !important;
      box-sizing: border-box !important;
      background: transparent !important;
      color: #f1f1ef !important;
      caret-color: #f1f1ef !important;
      border: 0 !important;
      outline: none !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 14px !important;
      font-weight: 400 !important;
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
    #${PANEL_ID} .Lovark-input.is-processing .Lovark-question,
    #${PANEL_ID} .Lovark-input.is-notice .Lovark-question {
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
      top: 8px !important;
      left: 14px !important;
      right: 48px !important;
      display: none !important;
      overflow: hidden !important;
      color: #565654 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 14px !important;
      font-weight: 700 !important;
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
      bottom: 14px !important;
      width: var(--Lovark-control-size) !important;
      min-width: var(--Lovark-control-size) !important;
      max-width: var(--Lovark-control-size) !important;
      height: var(--Lovark-control-size) !important;
      min-height: var(--Lovark-control-size) !important;
      max-height: var(--Lovark-control-size) !important;
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
    #${PANEL_ID} .Lovark-mode-toggle,
    #${PANEL_ID} .Lovark-mic {
      background: #363634 !important;
      border: 1px solid #626261 !important;
      color: #c2c2c2 !important;
    }

    #${PANEL_ID} .Lovark-add {
      left: 12px !important;
    }

    #${PANEL_ID} .Lovark-mode-toggle {
      left: auto !important;
      right: var(--Lovark-mode-right) !important;
      bottom: 13px !important;
      width: var(--Lovark-mode-width) !important;
      min-width: var(--Lovark-mode-width) !important;
      max-width: var(--Lovark-mode-width) !important;
      height: var(--Lovark-mode-height) !important;
      min-height: var(--Lovark-mode-height) !important;
      max-height: var(--Lovark-mode-height) !important;
      padding: 0 7px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 6px !important;
      border-radius: 999px !important;
      font-size: 11px !important;
      font-weight: 525 !important;
      line-height: 1 !important;
      -webkit-text-stroke: 0.225px currentColor !important;
    }

    #${PANEL_ID} .Lovark-mode-toggle:hover {
      background: #41413f !important;
    }

    #${PANEL_ID} .Lovark-mode-chevron {
      width: 12px !important;
      height: 12px !important;
      min-width: 12px !important;
      flex: none !important;
      transition: transform 180ms ease !important;
    }

    #${PANEL_ID} .Lovark-mode-toggle .Lovark-mode-chevron {
      width: 12px !important;
      height: 12px !important;
      min-width: 12px !important;
    }

    #${PANEL_ID} .Lovark-mode-toggle.is-open .Lovark-mode-chevron {
      transform: rotate(180deg) !important;
    }

    #${PANEL_ID} .Lovark-mode-menu {
      position: absolute !important;
      left: auto !important;
      right: calc(
        100% - var(--Lovark-input-left) - var(--Lovark-input-width) +
        var(--Lovark-mode-right)
      ) !important;
      bottom: calc(7px + 13px + var(--Lovark-mode-height) + 3px) !important;
      width: 250px !important;
      max-width: calc(100% - 22px) !important;
      padding: 4px !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 1px !important;
      background: #242423 !important;
      border: 1px solid #41413f !important;
      border-radius: 8px !important;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.38) !important;
      z-index: 10 !important;
      transform-origin: bottom right !important;
      animation: Lovark-mode-menu-in 150ms ease-out both !important;
    }

    #${PANEL_ID} .Lovark-mode-menu[hidden] {
      display: none !important;
    }

    #${PANEL_ID} .Lovark-mode-option {
      width: 100% !important;
      min-height: 38px !important;
      padding: 4px 7px !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      gap: 7px !important;
      border: 0 !important;
      border-radius: 6px !important;
      background: transparent !important;
      color: #f1f1ef !important;
      text-align: left !important;
      cursor: pointer !important;
    }

    #${PANEL_ID} .Lovark-mode-option:hover,
    #${PANEL_ID} .Lovark-mode-option:focus-visible {
      background: #30302f !important;
      outline: none !important;
    }

    #${PANEL_ID} .Lovark-mode-option-copy {
      min-width: 0 !important;
      flex: 1 1 auto !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }

    #${PANEL_ID} .Lovark-mode-option-title {
      color: #f1f1ef !important;
      font-size: 13px !important;
      font-weight: 525 !important;
      line-height: 15px !important;
      white-space: nowrap !important;
      -webkit-text-stroke: 0.225px currentColor !important;
    }

    #${PANEL_ID} .Lovark-mode-option-description {
      color: #aaa9a6 !important;
      font-size: 11px !important;
      font-weight: 400 !important;
      line-height: 14px !important;
      white-space: nowrap !important;
    }

    #${PANEL_ID} .Lovark-mode-option-check {
      width: 14px !important;
      height: 14px !important;
      min-width: 14px !important;
      margin-left: auto !important;
      fill: none !important;
      stroke: #bcbcb9 !important;
      stroke-width: 2.3 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
      opacity: 0 !important;
      flex: none !important;
    }

    #${PANEL_ID} .Lovark-mode-option[aria-checked="true"] .Lovark-mode-option-check {
      opacity: 1 !important;
    }

    #${PANEL_ID} .Lovark-mode-menu-footer {
      min-height: 22px !important;
      margin-top: 1px !important;
      padding: 4px 7px 0 !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      border-top: 1px solid #3a3a38 !important;
      color: #9b9a97 !important;
      font-size: 10px !important;
      font-weight: 400 !important;
      line-height: 14px !important;
      white-space: nowrap !important;
    }

    #${PANEL_ID} .Lovark-mode-menu-footer kbd {
      padding: 1px 4px !important;
      border: 1px solid #494947 !important;
      border-radius: 3px !important;
      background: #353533 !important;
      color: #c8c8c5 !important;
      font-family: Inter, Arial, sans-serif !important;
      font-size: 9px !important;
      font-weight: 525 !important;
      line-height: 12px !important;
      -webkit-text-stroke: 0.1875px currentColor !important;
    }

    @keyframes Lovark-mode-menu-in {
      from {
        opacity: 0;
        transform: translateY(5px) scale(0.985);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${PANEL_ID} .Lovark-mode-menu {
        animation: none !important;
      }
    }

    #${PANEL_ID} .Lovark-mic {
      right: calc(
        var(--Lovark-control-right-inset) +
        var(--Lovark-control-size) +
        var(--Lovark-control-gap)
      ) !important;
    }

    #${PANEL_ID} .Lovark-mic.is-listening {
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      color: #f1f1ef !important;
    }

    #${PANEL_ID} .Lovark-send {
      right: var(--Lovark-control-right-inset) !important;
      background: #898989 !important;
      border: 0 !important;
      color: #272726 !important;
    }

    #${PANEL_ID} .Lovark-send.has-text {
      background: #f4f4f3 !important;
    }

    #${PANEL_ID} .Lovark-input-action svg {
      width: 14px !important;
      height: 14px !important;
      display: block !important;
      fill: none !important;
      stroke: currentColor !important;
      stroke-width: 2.5 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
    }

    #${PANEL_ID} .Lovark-send svg {
      width: 13px !important;
      height: 13px !important;
    }

    #${PANEL_ID} .Lovark-add svg {
      transform: rotate(0deg) !important;
      transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    }

    #${PANEL_ID} .Lovark-add.is-open svg {
      transform: rotate(45deg) !important;
    }

    #${PANEL_ID} .Lovark-input-action:disabled {
      cursor: default !important;
      opacity: 0.55 !important;
    }
    `;

    addedPageShiftClass =
      !document.documentElement.classList.contains(PAGE_SHIFT_CLASS);
    if (addedPageShiftClass) {
      document.documentElement.classList.add(PAGE_SHIFT_CLASS);
    }
    document.documentElement.appendChild(style);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    const messageList = document.createElement("div");
    messageList.className = "Lovark-message-list";
    messageList.hidden = false;
    messageList.setAttribute("role", "log");
    messageList.setAttribute("aria-label", "Conversa partilhada do Lovark");
    messageList.setAttribute("aria-live", "polite");

    const scrollDownButton = document.createElement("button");
    scrollDownButton.className = "Lovark-scroll-down";
    scrollDownButton.type = "button";
    scrollDownButton.setAttribute(
      "aria-label",
      "Ir para as mensagens mais recentes"
    );
    scrollDownButton.setAttribute("aria-hidden", "true");
    scrollDownButton.tabIndex = -1;
    scrollDownButton.innerHTML = `
      <span class="Lovark-scroll-down-arrow" aria-hidden="true">
        <span class="Lovark-scroll-down-shaft"></span>
        <span class="Lovark-scroll-down-head-left"></span>
        <span class="Lovark-scroll-down-head-right"></span>
      </span>
    `;

    const updateScrollDownButton = () => {
      const distanceFromBottom =
        messageList.scrollHeight -
        messageList.scrollTop -
        messageList.clientHeight;
      const shouldShow = distanceFromBottom > 48;
      scrollDownButton.classList.toggle("is-visible", shouldShow);
      scrollDownButton.setAttribute("aria-hidden", String(!shouldShow));
      scrollDownButton.tabIndex = shouldShow ? 0 : -1;
    };

    messageList.addEventListener("scroll", updateScrollDownButton, {
      passive: true,
    });
    scrollDownButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: "smooth",
      });
    });

    const copyFeedbackTimers = new Set();

    const header = document.createElement("div");
    header.className = "Lovark-header";
    header.setAttribute("role", "banner");

    const avatar = document.createElement("div");
    avatar.className = "Lovark-avatar";
    avatar.setAttribute("role", "img");
    avatar.setAttribute("aria-label", "Foto de perfil de Lovark");
    const avatarImage = document.createElement("img");
    avatarImage.src = chrome.runtime.getURL("icons/avatar.png");
    avatarImage.alt = "";
    avatarImage.setAttribute("aria-hidden", "true");
    avatarImage.decoding = "async";
    avatarImage.draggable = false;
    avatar.appendChild(avatarImage);

    const profileInfo = document.createElement("div");
    profileInfo.className = "Lovark-profile-info";

    const profileName = document.createElement("div");
    profileName.className = "Lovark-profile-name";
    const profileNameText = document.createElement("span");
    profileNameText.textContent = "Lovark";

    const verifiedBadge = document.createElement("div");
    verifiedBadge.className = "Lovark-verified-badge";
    verifiedBadge.setAttribute("role", "img");
    verifiedBadge.setAttribute("aria-label", "Conta verificada");
    verifiedBadge.style.backgroundImage = `url("${chrome.runtime.getURL(
      "icons/verified.png"
    )}")`;
    verifiedBadge.setAttribute("draggable", "false");
    profileName.setAttribute("draggable", "false");
    verifiedBadge.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });
    profileName.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    profileName.appendChild(profileNameText);
    profileName.appendChild(verifiedBadge);

    const profileStatus = document.createElement("div");
    profileStatus.className = "Lovark-profile-status";
    profileStatus.textContent = "offline";
    profileStatus.setAttribute("role", "status");
    profileStatus.setAttribute("aria-live", "polite");

    const updateProfileStatus = () => {
      const isOnline = isLovarkOnline();
      profileStatus.textContent = isOnline ? "online" : "offline";
      profileStatus.classList.toggle("is-online", isOnline);
    };

    const profileStatusEvents = [
      "online",
      "offline",
      "popstate",
      "hashchange",
      "pageshow",
    ];
    for (const eventName of profileStatusEvents) {
      window.addEventListener(eventName, updateProfileStatus);
    }
    window.navigation?.addEventListener(
      "currententrychange",
      updateProfileStatus
    );
    updateProfileStatus();

    profileInfo.appendChild(profileName);
    profileInfo.appendChild(profileStatus);
    header.appendChild(avatar);
    header.appendChild(profileInfo);

    const headerActions = document.createElement("div");
    headerActions.className = "Lovark-header-actions";
    headerActions.setAttribute("role", "group");
    headerActions.setAttribute(
      "aria-label",
      "Notificações e definições"
    );

    const createHeaderIcon = (label, paths) => {
      const icon = document.createElement("span");
      icon.className = "Lovark-header-icon";
      icon.setAttribute("role", "img");
      icon.setAttribute("aria-label", label);
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          ${paths}
        </svg>
      `;
      return icon;
    };

    headerActions.appendChild(
      createHeaderIcon(
        "Notificações",
        `<path d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.568c0 2.06.574 4.08 1.662 5.83l.705 1.13A1.5 1.5 0 0 1 19.84 18.75H4.16a1.5 1.5 0 0 1-1.277-2.222l.705-1.13a11.25 11.25 0 0 0 1.662-5.83V9Z"></path>
         <path d="M9 21a3 3 0 0 0 6 0H9Z"></path>`
      )
    );
    headerActions.appendChild(
      createHeaderIcon(
        "Definições",
        `<path fill-rule="evenodd" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.28 7.28 0 0 0-1.63-.94l-.36-2.54A.48.48 0 0 0 13.88 2h-3.76a.48.48 0 0 0-.49.41l-.36 2.54c-.59.23-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.72 8.47a.5.5 0 0 0 .12.64l2.03 1.58c-.05.3-.07.61-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.39 1.04.71 1.63.94l.36 2.54a.48.48 0 0 0 .49.41h3.76a.48.48 0 0 0 .49-.41l.36-2.54c.59-.23 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path>`
      )
    );
    header.appendChild(headerActions);

    const inputBox = document.createElement("div");
    inputBox.className = "Lovark-input";
    inputBox.setAttribute("role", "group");
    inputBox.setAttribute("aria-label", "Área de pergunta à Lovark");

    const questionInput = document.createElement("textarea");
    questionInput.className = "Lovark-question";
    questionInput.rows = 1;
    questionInput.placeholder = "Pergunte à Lovark...";
    questionInput.setAttribute("aria-label", "Pergunte à Lovark");

    const servicePrompt = document.createElement("div");
    servicePrompt.className = "Lovark-service-prompts";
    servicePrompt.hidden = true;
    servicePrompt.setAttribute("role", "group");
    servicePrompt.setAttribute("aria-label", "Deteção de serviços");
    servicePrompt.setAttribute("aria-hidden", "true");

    const createDetectionCard = (
      displayName,
      serviceName,
      iconPath
    ) => {
      const card = document.createElement("div");
      card.className = "Lovark-detection-card";
      card.hidden = true;
      card.setAttribute("role", "group");
      card.setAttribute("aria-label", `Conectar ${serviceName}`);

      const icon = document.createElement("img");
      icon.className = "Lovark-detection-icon";
      icon.src = chrome.runtime.getURL(iconPath);
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      icon.draggable = false;

      const title = document.createElement("div");
      title.className = "Lovark-detection-title";
      title.textContent = `Conectar ${displayName}`;

      const connectButton = document.createElement("button");
      connectButton.className = "Lovark-detection-connect";
      connectButton.type = "button";
      connectButton.textContent = "Conectar";
      connectButton.setAttribute("aria-label", `Conectar ${serviceName}`);

      const closeButton = document.createElement("button");
      closeButton.className = "Lovark-detection-close";
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", `Fechar aviso do ${serviceName}`);
      closeButton.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12"></path>
          <path d="M18 6 6 18"></path>
        </svg>
      `;

      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(connectButton);
      card.appendChild(closeButton);
      servicePrompt.appendChild(card);

      return { card, closeButton };
    };

    const githubDetection = createDetectionCard(
      "GitHub",
      "GitHub",
      "icons/github.svg"
    );
    const chatGPTDetection = createDetectionCard(
      "ChatGPT",
      "ChatGPT",
      "icons/chatgpt.svg"
    );
    const supabaseDetection = createDetectionCard(
      "Supabase",
      "Supabase",
      "icons/supabase.svg"
    );

    let lastServicePromptValue = "";
    const dismissedServiceValues = {
      github: null,
      chatGPT: null,
      supabase: null,
    };
    let servicePromptShown = false;
    let servicePromptHideTimer = 0;
    let servicePromptAnimationFrame = 0;

    const extractMatchingServiceUrl = (value, pattern, isAllowedHost) => {
      const match = value.match(pattern);
      const rawCandidate = match?.[1]?.replace(/[),.;!?]+$/, "");
      if (!rawCandidate) return false;

      try {
        const normalizedCandidate = /^https?:\/\//i.test(rawCandidate)
          ? rawCandidate
          : `https://${rawCandidate}`;
        const url = new URL(normalizedCandidate);
        return (
          ["https:", "http:"].includes(url.protocol) &&
          isAllowedHost(url.hostname.toLowerCase())
        );
      } catch {
        return false;
      }
    };

    const isGithubLink = (value) =>
      extractMatchingServiceUrl(
        value,
        /(?:^|[^A-Za-z0-9.-])((?:https?:\/\/)?(?:www\.)?github\.com(?![A-Za-z0-9.-])(?:\/[^\s<>"'`]*)?)/i,
        (hostname) =>
          hostname === "github.com" || hostname === "www.github.com"
      );

    const isChatGPTLink = (value) =>
      extractMatchingServiceUrl(
        value,
        /(?:^|[^A-Za-z0-9.-])((?:https?:\/\/)?(?:www\.)?(?:chatgpt\.com|chat\.openai\.com)(?![A-Za-z0-9.-])(?:\/[^\s<>"'`]*)?)/i,
        (hostname) =>
          hostname === "chatgpt.com" ||
          hostname === "www.chatgpt.com" ||
          hostname === "chat.openai.com"
      );

    const isSupabaseLink = (value) =>
      extractMatchingServiceUrl(
        value,
        /(?:^|[^A-Za-z0-9.-])((?:https?:\/\/)?(?:(?:[A-Za-z0-9-]+\.)*supabase\.co|(?:www\.)?supabase\.com)(?![A-Za-z0-9.-])(?:\/[^\s<>"'`]*)?)/i,
        (hostname) =>
          hostname === "supabase.com" ||
          hostname === "www.supabase.com" ||
          hostname === "supabase.co" ||
          hostname.endsWith(".supabase.co")
      );

    const setServicePromptVisible = (visible) => {
      window.clearTimeout(servicePromptHideTimer);
      if (servicePromptAnimationFrame) {
        window.cancelAnimationFrame(servicePromptAnimationFrame);
        servicePromptAnimationFrame = 0;
      }

      if (servicePromptShown === visible) return;

      servicePromptShown = visible;
      inputBox.classList.toggle("has-service-prompt", visible);

      if (visible) {
        servicePrompt.hidden = false;
        servicePrompt.setAttribute("aria-hidden", "false");
        void servicePrompt.offsetHeight;
        servicePromptAnimationFrame = window.requestAnimationFrame(() => {
          servicePrompt.classList.add("is-visible");
          servicePromptAnimationFrame = 0;
        });
        return;
      }

      servicePrompt.classList.remove("is-visible");
      servicePrompt.setAttribute("aria-hidden", "true");
      servicePromptHideTimer = window.setTimeout(() => {
        if (!servicePromptShown) servicePrompt.hidden = true;
      }, 240);
    };

    const updateDetectedServicePrompts = () => {
      const value = questionInput.value;
      if (value !== lastServicePromptValue) {
        dismissedServiceValues.github = null;
        dismissedServiceValues.chatGPT = null;
        dismissedServiceValues.supabase = null;
        lastServicePromptValue = value;
      }

      const showGithub =
        isGithubLink(value) && dismissedServiceValues.github !== value;
      const showChatGPT =
        isChatGPTLink(value) && dismissedServiceValues.chatGPT !== value;
      const showSupabase =
        isSupabaseLink(value) && dismissedServiceValues.supabase !== value;

      githubDetection.card.hidden = !showGithub;
      chatGPTDetection.card.hidden = !showChatGPT;
      supabaseDetection.card.hidden = !showSupabase;
      setServicePromptVisible(showGithub || showChatGPT || showSupabase);
    };

    const attachDismissHandler = (serviceKey, detection) => {
      detection.closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dismissedServiceValues[serviceKey] = questionInput.value;
        updateDetectedServicePrompts();
        questionInput.focus();
      });
    };

    attachDismissHandler("github", githubDetection);
    attachDismissHandler("chatGPT", chatGPTDetection);
    attachDismissHandler("supabase", supabaseDetection);


    const addButton = document.createElement("button");
    addButton.className = "Lovark-input-action Lovark-add";
    addButton.type = "button";
    addButton.setAttribute("aria-label", "Adicionar");
    addButton.setAttribute("aria-pressed", "false");
    addButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14"></path>
        <path d="M5 12h14"></path>
      </svg>
    `;
    addButton.addEventListener("click", () => {
      const isOpen = addButton.classList.toggle("is-open");
      addButton.setAttribute("aria-pressed", String(isOpen));
    });

    const modeDefinitions = {
      build: {
        title: "Construir",
        description: "Faça alterações diretamente",
      },
      chat: {
        title: "Chat",
        description: "Pergunte qualquer coisa, explore ideias",
      },
    };
    let selectedMode = "build";

    const modeButton = document.createElement("button");
    modeButton.className = "Lovark-input-action Lovark-mode-toggle";
    modeButton.type = "button";
    modeButton.setAttribute("aria-haspopup", "menu");
    modeButton.setAttribute("aria-expanded", "false");

    const modeLabel = document.createElement("span");
    modeLabel.className = "Lovark-mode-label";

    const modeChevron = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    modeChevron.classList.add("Lovark-mode-chevron");
    modeChevron.setAttribute("viewBox", "0 0 24 24");
    modeChevron.setAttribute("aria-hidden", "true");
    modeChevron.innerHTML = '<path d="m6 9 6 6 6-6"></path>';
    modeButton.appendChild(modeLabel);
    modeButton.appendChild(modeChevron);

    const modeMenu = document.createElement("div");
    modeMenu.className = "Lovark-mode-menu";
    modeMenu.hidden = true;
    modeMenu.setAttribute("role", "menu");
    modeMenu.setAttribute("aria-label", "Escolher modo");

    const modeOptionButtons = new Map();
    const modeOptionEntries = Object.entries(modeDefinitions);

    const renderSelectedMode = () => {
      const currentMode = modeDefinitions[selectedMode];
      modeLabel.textContent = currentMode.title;
      modeButton.setAttribute("aria-label", `Modo selecionado: ${currentMode.title}`);
      for (const [mode, option] of modeOptionButtons) {
        option.setAttribute("aria-checked", String(mode === selectedMode));
      }
    };

    for (const [mode, details] of modeOptionEntries) {
      const option = document.createElement("button");
      option.className = "Lovark-mode-option";
      option.type = "button";
      option.setAttribute("role", "menuitemradio");
      option.setAttribute("aria-checked", "false");

      const copy = document.createElement("span");
      copy.className = "Lovark-mode-option-copy";

      const title = document.createElement("span");
      title.className = "Lovark-mode-option-title";
      title.textContent = details.title;

      const description = document.createElement("span");
      description.className = "Lovark-mode-option-description";
      description.textContent = details.description;

      const check = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      check.classList.add("Lovark-mode-option-check");
      check.setAttribute("viewBox", "0 0 24 24");
      check.setAttribute("aria-hidden", "true");
      check.innerHTML = '<path d="m5 12 4 4L19 6"></path>';

      copy.appendChild(title);
      copy.appendChild(description);
      option.appendChild(copy);
      option.appendChild(check);
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectMode(mode);
      });

      modeOptionButtons.set(mode, option);
      modeMenu.appendChild(option);
    }

    const modeFooter = document.createElement("div");
    modeFooter.className = "Lovark-mode-menu-footer";
    modeFooter.appendChild(document.createTextNode("Alterne entre modos com"));
    const altKey = document.createElement("kbd");
    altKey.textContent = "Alt";
    const pKey = document.createElement("kbd");
    pKey.textContent = "P";
    modeFooter.appendChild(altKey);
    modeFooter.appendChild(pKey);
    modeMenu.appendChild(modeFooter);

    const setModeMenuOpen = (open) => {
      modeMenu.hidden = !open;
      modeButton.classList.toggle("is-open", open);
      modeButton.setAttribute("aria-expanded", String(open));
    };

    const selectMode = (mode) => {
      if (!modeDefinitions[mode]) return;
      selectedMode = mode;
      renderSelectedMode();
      setModeMenuOpen(false);
    };

    modeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setModeMenuOpen(modeMenu.hidden);
    });

    const handleModeMenuOutsidePointer = (event) => {
      if (
        !modeMenu.hidden &&
        !modeMenu.contains(event.target) &&
        !modeButton.contains(event.target)
      ) {
        setModeMenuOpen(false);
      }
    };

    const handleModeMenuKeydown = (event) => {
      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.repeat &&
        event.key.toLowerCase() === "p"
      ) {
        event.preventDefault();
        event.stopPropagation();
        selectMode(selectedMode === "build" ? "chat" : "build");
        return;
      }

      if (event.key === "Escape" && !modeMenu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        setModeMenuOpen(false);
        modeButton.focus();
      }
    };

    document.addEventListener("pointerdown", handleModeMenuOutsidePointer, true);
    document.addEventListener("keydown", handleModeMenuKeydown, true);
    renderSelectedMode();

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
      micButton.disabled = isProcessing;
      questionInput.readOnly = isActive || isProcessing;
      sendButton.innerHTML = isActive ? confirmIcon : sendIcon;
      sendButton.setAttribute(
        "aria-label",
        isActive ? "Confirmar gravação" : "Enviar"
      );
      sendButton.disabled = isStarting || isProcessing;
      sendButton.classList.toggle(
        "has-text",
        questionInput.value.trim().length > 0
      );
      addButton.disabled = isActive || isProcessing;
      modeButton.disabled = isActive || isProcessing;
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
      session.analyser.getByteTimeDomainData(timeSamples);

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
      const dotCount = Math.max(1, Math.floor(width / 2.35));
      const dotSpacing = width / dotCount;
      const dotRadius = Math.min(1.4, dotSpacing * 0.59);
      const amplitudeScale = 7 + voiceLevel * 8;
      if (!session.dotOffsets || session.dotOffsets.length !== dotCount) {
        session.dotOffsets = Array.from({ length: dotCount }, () => 0);
      }

      canvasContext.fillStyle = `rgba(218, 218, 216, ${0.58 + voiceLevel * 0.3})`;
      canvasContext.beginPath();
      for (let index = 0; index < dotCount; index += 1) {
        const sampleIndex = Math.round(
          (index / Math.max(1, dotCount - 1)) * (timeSamples.length - 1)
        );
        const signal = (timeSamples[sampleIndex] - 128) / 128;
        const targetOffset =
          signal * amplitudeScale * (voiceLevel > 0 ? 0.65 : 0.08);
        const currentOffset = session.dotOffsets[index];
        const smoothing = Math.abs(targetOffset) > Math.abs(currentOffset)
          ? 0.42
          : 0.3;
        const nextOffset =
          currentOffset + (targetOffset - currentOffset) * smoothing;
        session.dotOffsets[index] = nextOffset;

        canvasContext.arc(
          (index + 0.5) * dotSpacing,
          height / 2 - nextOffset,
          dotRadius,
          0,
          Math.PI * 2
        );
      }
      canvasContext.fill();

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
        recognition: null,
        stream: null,
        audioContext: null,
        audioSource: null,
        analyser: null,
        animationFrame: 0,
        finishTimer: 0,
        dotOffsets: null,
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
        session.analyser.smoothingTimeConstant = 0.48;
        session.timeSamples = new Uint8Array(session.analyser.fftSize);
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

    const copyMessageToClipboard = async (text) => {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API indisponível");
        }
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        const fallbackInput = document.createElement("textarea");
        fallbackInput.value = text;
        fallbackInput.setAttribute("readonly", "");
        fallbackInput.style.position = "fixed";
        fallbackInput.style.left = "-9999px";
        fallbackInput.style.top = "0";
        document.documentElement.appendChild(fallbackInput);
        fallbackInput.select();
        const copied = document.execCommand("copy");
        fallbackInput.remove();
        if (!copied) throw new Error("Não foi possível copiar a mensagem");
      }
    };

    const messagePreviewSegmenter =
      typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter("pt-PT", { granularity: "grapheme" })
        : null;

    const appendChatMessage = (text) => {
      const messageRow = document.createElement("div");
      messageRow.className = "Lovark-message-row";

      const characters = messagePreviewSegmenter
        ? Array.from(
            messagePreviewSegmenter.segment(text),
            (part) => part.segment
          )
        : Array.from(text);
      const isLongMessage = characters.length > CHAT_MESSAGE_PREVIEW_LENGTH;
      const previewText = isLongMessage
        ? `${characters.slice(0, CHAT_MESSAGE_PREVIEW_LENGTH).join("")}...`
        : text;

      const bubble = document.createElement("div");
      bubble.className = "Lovark-message-bubble";
      const bubbleContent = document.createElement("div");
      bubbleContent.className = "Lovark-message-content";
      bubbleContent.textContent = previewText;
      bubble.appendChild(bubbleContent);

      if (isLongMessage) {
        bubble.classList.add("is-truncated");
        const showMoreButton = document.createElement("button");
        showMoreButton.className = "Lovark-message-show-more";
        showMoreButton.type = "button";
        showMoreButton.textContent = "Mostrar mais";
        showMoreButton.setAttribute("aria-expanded", "false");
        showMoreButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const isExpanded =
            showMoreButton.getAttribute("aria-expanded") !== "true";
          showMoreButton.setAttribute("aria-expanded", String(isExpanded));
          bubbleContent.textContent = isExpanded ? text : previewText;
          showMoreButton.textContent = isExpanded
            ? "Mostrar menos"
            : "Mostrar mais";
          window.requestAnimationFrame(updateScrollDownButton);
        });
        bubble.appendChild(showMoreButton);
      }
      messageRow.appendChild(bubble);

      const meta = document.createElement("div");
      meta.className = "Lovark-message-meta";

      const time = document.createElement("span");
      time.className = "Lovark-message-time";
      const sentTime = new Intl.DateTimeFormat("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
      time.textContent = `Hoje às ${sentTime}`;

      const copyButton = document.createElement("button");
      copyButton.className = "Lovark-message-copy";
      copyButton.type = "button";
      copyButton.setAttribute("aria-label", "Copiar mensagem");
      copyButton.setAttribute("data-tooltip", "Copiar mensagem");
      const copyIcon = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="8" y="8" width="11" height="12" rx="2"></rect>
          <path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v10A1.5 1.5 0 0 0 6.5 18H8"></path>
        </svg>
      `;
      const copiedIcon = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="m8 12 2.5 2.5L16 9"></path>
        </svg>
      `;
      copyButton.innerHTML = copyIcon;
      copyButton.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await copyMessageToClipboard(text);
          if (copyButton.copyFeedbackTimer) {
            window.clearTimeout(copyButton.copyFeedbackTimer);
            copyFeedbackTimers.delete(copyButton.copyFeedbackTimer);
          }
          copyButton.classList.add("is-copied");
          copyButton.innerHTML = copiedIcon;
          copyButton.setAttribute("aria-label", "Copiado");
          copyButton.setAttribute("data-tooltip", "Copiado");
          copyButton.copyFeedbackTimer = window.setTimeout(() => {
            copyButton.classList.remove("is-copied");
            copyButton.innerHTML = copyIcon;
            copyButton.setAttribute("aria-label", "Copiar mensagem");
            copyButton.setAttribute("data-tooltip", "Copiar mensagem");
            copyFeedbackTimers.delete(copyButton.copyFeedbackTimer);
            copyButton.copyFeedbackTimer = null;
          }, 1500);
          copyFeedbackTimers.add(copyButton.copyFeedbackTimer);
        } catch (error) {
          console.warn("Lovark: falha ao copiar mensagem.", error);
          copyButton.setAttribute("aria-label", "Falha ao copiar");
          copyButton.setAttribute("data-tooltip", "Falha ao copiar");
        }
      });

      meta.appendChild(copyButton);
      meta.appendChild(time);
      messageRow.appendChild(meta);
      messageList.appendChild(messageRow);
      messageList.hidden = false;
      window.requestAnimationFrame(() => {
        messageList.scrollTop = messageList.scrollHeight;
        updateScrollDownButton();
      });
    };

    const sendChatMessage = () => {
      const text = questionInput.value.trim();
      if (!text) return;
      appendChatMessage(text);
      questionInput.value = "";
      questionInput.dispatchEvent(new Event("input", { bubbles: true }));
      questionInput.focus();
    };

    sendButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (voiceState === "starting" || voiceState === "recording") {
        confirmRecording();
        return;
      }
      sendChatMessage();
    });

    inputBox.appendChild(questionInput);
    inputBox.appendChild(addButton);
    inputBox.appendChild(modeButton);
    inputBox.appendChild(waveform);
    inputBox.appendChild(voiceStatus);
    inputBox.appendChild(micButton);
    inputBox.appendChild(sendButton);
    panel.appendChild(servicePrompt);

    const MIN_INPUT_HEIGHT = 80;
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
      servicePrompt.style.setProperty(
        "--Lovark-input-height",
        `${nextHeight}px`
      );
      panel.style.setProperty("--Lovark-input-height", `${nextHeight}px`);

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
    questionInput.addEventListener("input", updateDetectedServicePrompts);
    questionInput.addEventListener("input", renderVoiceState);
    questionInput.addEventListener("keydown", (event) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.isComposing
      ) {
        return;
      }
      event.preventDefault();
      sendChatMessage();
    });

    panel.appendChild(header);
    panel.appendChild(messageList);
    panel.appendChild(inputBox);
    panel.appendChild(scrollDownButton);
    panel.appendChild(modeMenu);
    document.documentElement.appendChild(panel);
    resizeQuestionArea();
    renderVoiceState();
    updateDetectedServicePrompts();

    teardownCurrentPanel = () => {
      window.clearTimeout(noticeTimer);
      window.clearTimeout(servicePromptHideTimer);
      for (const eventName of profileStatusEvents) {
        window.removeEventListener(eventName, updateProfileStatus);
      }
      window.navigation?.removeEventListener(
        "currententrychange",
        updateProfileStatus
      );
      for (const timer of copyFeedbackTimers) window.clearTimeout(timer);
      copyFeedbackTimers.clear();
      document.removeEventListener(
        "pointerdown",
        handleModeMenuOutsidePointer,
        true
      );
      document.removeEventListener(
        "keydown",
        handleModeMenuKeydown,
        true
      );
      if (servicePromptAnimationFrame) {
        window.cancelAnimationFrame(servicePromptAnimationFrame);
        servicePromptAnimationFrame = 0;
      }
      if (activeSession) cleanupSession(activeSession, true);
      activeSession = null;
      voiceState = "idle";
    };
    syncLovableCreditEffect();
  }

  startLovableCreditEffectController();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "Lovark_TOGGLE") return;
    toggleLovark();
    sendResponse({ ok: true });
  });
})();