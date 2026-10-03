chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id == null) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "LOVABURST_TOGGLE"
    });
  } catch (error) {
    console.error("LovaBurst:", error);
  }
});
