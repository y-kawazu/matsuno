const blogList = document.querySelector('#blog-list');
const blogPost = document.querySelector('#blog-post');
const blogEndpoint = (blogList || blogPost)?.dataset.blogEndpoint;

const loadJsonp = (params, onSuccess, onError) => {
  const callback = `matsunoBlog${Date.now()}`;
  const script = document.createElement('script');
  const query = new URLSearchParams({ ...params, callback, _: Date.now().toString() });

  window[callback] = (payload) => {
    onSuccess(payload);
    script.remove();
    delete window[callback];
  };

  script.src = `${blogEndpoint}?${query.toString()}`;
  script.onerror = () => {
    onError();
    script.remove();
    delete window[callback];
  };
  document.head.append(script);
};

const makeArticleLink = (post) => {
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = `blog-post.html?id=${encodeURIComponent(post.id || '')}`;
  link.textContent = '記事を読む →';
  return link;
};

const readableText = (value) => {
  const decoder = document.createElement('textarea');
  decoder.innerHTML = value || '';
  const template = document.createElement('template');
  template.innerHTML = decoder.value;
  return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
};

const renderBlogList = (posts) => {
  if (!blogList || !Array.isArray(posts)) return;
  blogList.replaceChildren();
  if (!posts.length) {
    blogList.innerHTML = '<p class="download-status">現在公開中の記事はありません。</p>';
    return;
  }

  posts.forEach((post) => {
    const article = document.createElement('article');
    article.className = 'blog-card';
    const date = document.createElement('p');
    date.className = 'download-card-label';
    date.textContent = post.date || '';
    const title = document.createElement('h2');
    title.textContent = post.title || 'セガールの独り言';
    const excerpt = document.createElement('p');
    excerpt.textContent = readableText(post.excerpt || post.content || '').slice(0, 150);
    article.append(date, title, excerpt, makeArticleLink(post));
    blogList.append(article);
  });
};

const sanitizeContent = (html) => {
  const template = document.createElement('template');
  const escapedHtml = /&lt;\/?[a-z]/i.test(html || '');
  if (escapedHtml) {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = html;
    template.innerHTML = decoder.value;
  } else {
    template.innerHTML = html || '';
  }
  template.content.querySelectorAll('script, iframe, object, embed, form').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};

const renderBlogPost = (post) => {
  if (!blogPost || !post) return;
  const date = document.createElement('p');
  date.className = 'download-card-label';
  date.textContent = post.date || '';
  const title = document.createElement('h1');
  title.textContent = post.title || 'セガールの独り言';
  const content = document.createElement('div');
  content.className = 'blog-content';
  content.innerHTML = sanitizeContent(post.content);
  const legacy = document.createElement('a');
  legacy.className = 'text-link legacy-link';
  legacy.href = post.url || 'http://blog.livedoor.jp/kuniichi/';
  legacy.target = '_blank';
  legacy.rel = 'noopener noreferrer';
  legacy.textContent = '旧ブログで開く →';
  const returnLink = document.querySelector('.blog-main .page-return');
  const postParts = returnLink ? [date, title, content, returnLink, legacy] : [date, title, content, legacy];
  blogPost.replaceChildren(...postParts);
};

if (blogList && blogEndpoint) {
  loadJsonp(
    { type: 'blog' },
    (payload) => renderBlogList(payload?.posts),
    () => { blogList.innerHTML = '<p class="download-status">記事を読み込めませんでした。時間をおいて再度お試しください。</p>'; }
  );
}

if (blogPost && blogEndpoint) {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    blogPost.innerHTML = '<p class="download-status">記事が指定されていません。</p>';
  } else {
    loadJsonp(
      { type: 'blog', id },
      (payload) => renderBlogPost(payload?.post),
      () => { blogPost.innerHTML = '<p class="download-status">記事を読み込めませんでした。時間をおいて再度お試しください。</p>'; }
    );
  }
}
