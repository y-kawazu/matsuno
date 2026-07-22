const header = document.querySelector('#header');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('#main-nav');

if (header && nav) {
  header.classList.remove('scrolled');
  nav.className = 'main-nav';
  nav.innerHTML = '<a href="index.html#works">施工事例</a><a href="index.html#about">私たちについて</a><a href="index.html#process">仕事の流れ</a><a href="index.html#company">会社案内</a><a href="blog.html">セガールの独り言</a><a href="http://blog.livedoor.jp/kuniichi/" target="_blank" rel="noopener noreferrer">旧ブログ</a><a href="download.html">資料ダウンロード</a><a class="nav-contact" href="index.html#contact">お問い合わせ <span>→</span></a>';
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'メニューを開く' : 'メニューを閉じる');
  nav.classList.toggle('open', !isOpen);
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'メニューを開く');
  nav.classList.remove('open');
}));
