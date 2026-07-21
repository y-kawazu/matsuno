const downloadList = document.querySelector('#download-list');
const appsScriptUrl = downloadList?.dataset.appsScriptUrl;

const formatBytes = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const fileType = (file) => {
  const extension = file.name?.split('.').pop();
  return extension ? extension.toUpperCase() : 'FILE';
};

const downloadUrl = (file) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(file.id)}`;

const renderDownloads = (files) => {
  if (!downloadList || !Array.isArray(files)) return;
  downloadList.replaceChildren();

  if (!files.length) {
    const message = document.createElement('p');
    message.className = 'download-status';
    message.textContent = '現在公開中の資料はありません。';
    downloadList.append(message);
    return;
  }

  files.forEach((file) => {
    const card = document.createElement('article');
    card.className = 'download-card';

    const copy = document.createElement('div');
    const label = document.createElement('p');
    label.className = 'download-card-label';
    label.textContent = fileType(file);
    const title = document.createElement('h2');
    title.textContent = file.name || '資料';
    const detail = document.createElement('p');
    detail.textContent = formatBytes(file.size);
    copy.append(label, title, detail);

    const link = document.createElement('a');
    link.className = 'download-button';
    link.href = downloadUrl(file);
    link.innerHTML = 'ダウンロード<span>→</span>';
    card.append(copy, link);
    downloadList.append(card);
  });
};

if (downloadList && appsScriptUrl) {
  const callbackName = `matsunoDownloads${Date.now()}`;
  const script = document.createElement('script');

  window[callbackName] = (payload) => {
    renderDownloads(payload?.files);
    script.remove();
    delete window[callbackName];
  };

  script.src = `${appsScriptUrl}?callback=${callbackName}&_=${Date.now()}`;
  script.onerror = () => {
    script.remove();
    delete window[callbackName];
  };
  document.head.append(script);
}
