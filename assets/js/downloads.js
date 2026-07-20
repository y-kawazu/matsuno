const downloadList = document.querySelector('#download-list');
const downloadBase = downloadList?.dataset.downloadBase;

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const buildFileUrl = (file) => `${downloadBase}/${file.split('/').map(encodeURIComponent).join('/')}`;

const renderDownloads = (files) => {
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
    label.textContent = file.extension.replace('.', '').toUpperCase();
    const title = document.createElement('h2');
    title.textContent = file.title;
    const detail = document.createElement('p');
    detail.textContent = formatBytes(file.size);
    copy.append(label, title, detail);

    const link = document.createElement('a');
    link.className = 'download-button';
    link.href = buildFileUrl(file.file);
    link.download = '';
    link.innerHTML = 'ダウンロード <span>↓</span>';
    card.append(copy, link);
    downloadList.append(card);
  });
};

if (downloadList && downloadBase) {
  fetch(`${downloadBase}/manifest.json`, { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : []))
    .then((files) => renderDownloads(Array.isArray(files) ? files : []))
    .catch(() => renderDownloads([]));
}
