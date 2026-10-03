chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id == null) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "Lovark_TOGGLE"
    });
  } catch (error) {
    console.error("Lovark:", error);
  }
});
