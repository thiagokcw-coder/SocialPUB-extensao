// O painel abre numa ABA, e não num popup: o popup morre quando a aba do X
// ganha o foco, e levaria junto o arquivo escolhido e o trabalho no meio.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('painel.html') });
});
