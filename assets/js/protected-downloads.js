(() => {
  const list = document.querySelector('#download-list');
  const form = document.querySelector('#download-login');
  const password = document.querySelector('#download-password');
  const status = document.querySelector('#download-auth-status');
  const logout = document.querySelector('#download-logout');
  if (!list || !form) return;
  let token = '';
  let expiry;
  const messages = {
    INVALID_PASSWORD: 'パスワードが違います。もう一度入力してください。',
    AUTH_REQUIRED: '認証の有効期限が切れました。もう一度パスワードを入力してください。',
    RATE_LIMITED: '試行回数が上限に達しました。5分ほど待って再度お試しください。',
    FILE_TOO_LARGE: 'この資料は25MBを超えています。管理者にお問い合わせください。',
    EXPORT_REQUIRED: 'この資料はPDFなどのファイル形式で登録する必要があります。',
    NOT_FOUND: '資料が見つかりません。削除または移動された可能性があります。'
  };
  const api = async (values) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(list.dataset.appsScriptUrl, {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        body: new URLSearchParams(values), signal: controller.signal
      });
      if (!response.ok) throw new Error('SERVICE_UNAVAILABLE');
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    } finally { clearTimeout(timer); }
  };
  const lock = (message = '') => {
    token = '';
    clearTimeout(expiry);
    list.replaceChildren();
    list.hidden = true;
    form.hidden = false;
    logout.hidden = true;
    password.value = '';
    status.textContent = message;
  };
  const errorMessage = (error) => messages[error.message] || '通信に失敗しました。時間をおいてもう一度お試しください。';
  const render = (files) => {
    list.replaceChildren();
    if (!files.length) list.textContent = '現在ご案内中の資料はありません。';
    for (const file of files) {
      const card = document.createElement('article');
      card.className = 'download-card';
      const copy = document.createElement('div');
      const type = document.createElement('p');
      type.className = 'download-card-label';
      type.textContent = file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'FILE';
      const title = document.createElement('h2');
      title.textContent = file.name;
      const size = document.createElement('p');
      size.textContent = file.size >= 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.ceil(file.size / 1024)} KB`;
      copy.append(type, title, size);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'download-button';
      button.textContent = 'ダウンロード →';
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = '準備しています…';
        status.textContent = '';
        try {
          const result = await api({action: 'download', token, id: file.id});
          const bytes = Uint8Array.from(atob(result.data), (char) => char.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], {type: result.mimeType || 'application/octet-stream'}));
          const link = document.createElement('a');
          link.href = url;
          link.download = result.name;
          document.body.append(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          status.textContent = 'ダウンロードを開始しました。';
        } catch (error) {
          if (error.message === 'AUTH_REQUIRED') lock(errorMessage(error));
          else status.textContent = errorMessage(error);
        } finally {
          button.disabled = false;
          button.textContent = 'ダウンロード →';
        }
      });
      card.append(copy, button);
      list.append(card);
    }
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button');
    submit.disabled = true;
    status.textContent = '確認しています…';
    try {
      const result = await api({action: 'login', password: password.value});
      password.value = '';
      if (!result.token || !Array.isArray(result.files)) throw new Error('SERVICE_UNAVAILABLE');
      token = result.token;
      render(result.files);
      list.hidden = false;
      form.hidden = true;
      logout.hidden = false;
      status.textContent = '認証しました。有効時間は15分です。';
      expiry = setTimeout(() => lock(messages.AUTH_REQUIRED), Math.max(0, result.expiresAt - Date.now()));
    } catch (error) { lock(errorMessage(error)); }
    finally { submit.disabled = false; }
  });
  logout.addEventListener('click', () => {
    const oldToken = token;
    lock('ログアウトしました。');
    api({action: 'logout', token: oldToken}).catch(() => {});
  });
  window.addEventListener('pagehide', () => lock());
  lock();
})();
