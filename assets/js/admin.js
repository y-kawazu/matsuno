const repository = {
  owner: 'y-kawazu',
  name: 'matsuno',
  branch: 'main',
  directory: 'admin-downloads',
};
const acceptedExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip']);
const maxFileSize = 20 * 1024 * 1024;
let accessToken = sessionStorage.getItem('matsuno-admin-token') || '';

const loginSection = document.querySelector('#admin-login');
const workspace = document.querySelector('#admin-workspace');
const authForm = document.querySelector('#auth-form');
const tokenInput = document.querySelector('#access-token');
const authMessage = document.querySelector('#auth-message');
const accountName = document.querySelector('#admin-account');
const uploadZone = document.querySelector('#upload-zone');
const fileInput = document.querySelector('#file-input');
const uploadQueue = document.querySelector('#upload-queue');
const logoutButton = document.querySelector('#logout-button');

const api = (path, options = {}) => fetch(`https://api.github.com${path}`, {
  ...options,
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...options.headers,
  },
});

const setAuthMessage = (message) => { authMessage.textContent = message; };
const safeName = (name) => name.replace(/[\\/:*?"<>|]/g, '-').replace(/^\.+/, '') || 'document';

const base64FromFile = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const showWorkspace = (login) => {
  accountName.textContent = `GitHub: ${login}`;
  loginSection.hidden = true;
  workspace.hidden = false;
};

const verifyAccess = async () => {
  const userResponse = await api('/user');
  if (!userResponse.ok) throw new Error('認証に失敗しました。');
  const user = await userResponse.json();
  const repoResponse = await api(`/repos/${repository.owner}/${repository.name}`);
  if (!repoResponse.ok || !((await repoResponse.json()).permissions || {}).push) {
    throw new Error('このリポジトリへの書き込み権限がありません。');
  }
  showWorkspace(user.login);
};

const createQueueItem = (name) => {
  const item = document.createElement('div');
  item.className = 'queue-item';
  const fileName = document.createElement('span');
  fileName.textContent = name;
  const state = document.createElement('small');
  state.textContent = 'アップロード中';
  item.append(fileName, state);
  uploadQueue.prepend(item);
  return state;
};

const uploadFile = async (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  if (!acceptedExtensions.has(extension)) throw new Error('対応していないファイル形式です。');
  if (file.size > maxFileSize) throw new Error('20MB以下のファイルを選択してください。');

  const state = createQueueItem(file.name);
  const filename = safeName(file.name);
  const path = `${repository.directory}/${filename}`.split('/').map(encodeURIComponent).join('/');
  const endpoint = `/repos/${repository.owner}/${repository.name}/contents/${path}`;
  const existing = await api(`${endpoint}?ref=${repository.branch}`);
  const payload = {
    message: `Upload ${filename}`,
    content: await base64FromFile(file),
    branch: repository.branch,
  };
  if (existing.ok) payload.sha = (await existing.json()).sha;

  const response = await api(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('GitHubへの保存に失敗しました。');
  state.textContent = '保存しました。公開ページへ反映中です。';
};

const handleFiles = async (files) => {
  for (const file of files) {
    try {
      await uploadFile(file);
    } catch (error) {
      const state = createQueueItem(file.name);
      state.textContent = error.message;
      state.classList.add('has-error');
    }
  }
};

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accessToken = tokenInput.value.trim();
  setAuthMessage('認証を確認しています。');
  try {
    await verifyAccess();
    sessionStorage.setItem('matsuno-admin-token', accessToken);
  } catch (error) {
    accessToken = '';
    setAuthMessage(error.message);
  }
});

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') fileInput.click();
});
uploadZone.addEventListener('dragover', (event) => { event.preventDefault(); uploadZone.classList.add('is-dragging'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('is-dragging'));
uploadZone.addEventListener('drop', (event) => {
  event.preventDefault();
  uploadZone.classList.remove('is-dragging');
  handleFiles(event.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));
logoutButton.addEventListener('click', () => {
  accessToken = '';
  sessionStorage.removeItem('matsuno-admin-token');
  workspace.hidden = true;
  loginSection.hidden = false;
  tokenInput.value = '';
  setAuthMessage('');
});

if (accessToken) {
  verifyAccess().catch(() => {
    accessToken = '';
    sessionStorage.removeItem('matsuno-admin-token');
  });
}
