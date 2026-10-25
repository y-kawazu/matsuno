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

const downloadUrl = (file) => {
  const url = new URL('https://drive.google.com/uc');
  url.searchParams.set('export', 'download');
  url.searchParams.set('id', file.id);
  if (file.resourceKey) url.searchParams.set('resourcekey', file.resourceKey);
  return url.href;
};

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

if (downloadList) {
  (async () => {
    let rendered = false;
    const load = async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Download feed unavailable');
        const payload = await response.json();
        if (payload.error || !Array.isArray(payload.files)) throw new Error('Invalid download feed');
        renderDownloads(payload.files);
        rendered = true;
      } finally {
        clearTimeout(timer);
      }
    };
    try { await load(downloadList.dataset.snapshotUrl || 'assets/data/downloads.json'); } catch (_) { /* Try live feed next. */ }
    if (appsScriptUrl) {
      try { await load(appsScriptUrl); } catch (_) { /* Keep the published snapshot on temporary failures. */ }
    }
    if (!rendered) downloadList.textContent = '資料を読み込めませんでした。時間をおいて再度お試しください。';
  })();
}
