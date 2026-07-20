const adminGateKey = 'matsuno-admin-gate';
const adminPasswordHash = '7b55e6a242d24baef93a2673652a0ca947e3ef8e4815eb21c30f1809824657c5';

const hashPassword = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const isAuthorized = () => sessionStorage.getItem(adminGateKey) === 'granted';

if (document.body.classList.contains('admin-page') && !isAuthorized()) {
  window.location.replace('download.html#admin-access');
}

const adminEntryForm = document.querySelector('#admin-entry-form');
if (adminEntryForm) {
  const passwordInput = document.querySelector('#admin-entry-password');
  const entryMessage = document.querySelector('#admin-entry-message');

  adminEntryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const hash = await hashPassword(passwordInput.value);
    if (hash !== adminPasswordHash) {
      entryMessage.textContent = 'パスワードが違います。';
      passwordInput.select();
      return;
    }
    sessionStorage.setItem(adminGateKey, 'granted');
    window.location.assign('admin.html');
  });
}
