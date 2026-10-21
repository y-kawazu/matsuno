const blogList = document.querySelector('#blog-list');
const blogPost = document.querySelector('#blog-post');
const blogEndpoint = (blogList || blogPost)?.dataset.blogEndpoint;

const loadBlog = async (params, onSuccess, onError) => {
  let displayed = false;
  const display = (payload) => {
    if (payload?.error) throw new Error(payload.error);
    if (params.id) {
      if (!Object.prototype.hasOwnProperty.call(payload || {}, 'post')) throw new Error('Invalid article response');
    } else if (!Array.isArray(payload?.posts)) {
      throw new Error('Invalid article list');
    }
    onSuccess(payload);
    displayed = true;
  };
  const readJson = async (url, timeout) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`Blog request failed (${response.status})`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  };

  // This same-origin copy is generated from the public Sheet feed. It remains
  // available when Google redirects a visitor to the wrong signed-in account.
  try {
    const snapshot = await readJson(new URL('assets/data/blog.json', document.baseURI), 8000);
    if (!Array.isArray(snapshot.posts)) throw new Error('Invalid published article data');
    display(params.id ? { post: snapshot.posts.find(post => post.id === params.id) || null } : snapshot);
  } catch (error) {
    console.warn('Published blog data could not be read.', error);
  }

  // When possible, refresh immediately from Drive without sending Google
  // account cookies. Scheduled publishing refreshes the same-origin copy too.
  if (blogEndpoint) {
    try {
      const url = new URL(blogEndpoint);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
      url.searchParams.set('_', Date.now().toString());
      display(await readJson(url, 8000));
    } catch (error) {
      console.warn('Live blog refresh unavailable; keeping published articles.', error);
    }
  }
  if (!displayed) onError();
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

const mediaUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const renderStoredMedia = (html) => html
  .replace(/画像:\s*(https?:\/\/[^\s<]+)(?:\s*<br>\s*)?リンク:\s*(https?:\/\/[^\s<]+)/g, (_, image, link) => {
    const imageUrl = mediaUrl(image);
    const linkUrl = mediaUrl(link);
    if (!imageUrl) return '';
    const imageTag = `<img src="${imageUrl}" alt="ブログ記事の画像">`;
    return linkUrl ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${imageTag}</a>` : imageTag;
  })
  .replace(/画像:\s*(https?:\/\/[^\s<]+)/g, (_, image) => {
    const imageUrl = mediaUrl(image);
    return imageUrl ? `<img src="${imageUrl}" alt="ブログ記事の画像">` : '';
  })
  .replace(/リンク:\s*(https?:\/\/[^\s<]+)/g, (_, link) => {
    const linkUrl = mediaUrl(link);
    return linkUrl ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkUrl}</a>` : '';
  });

const sanitizeContent = (html) => {
  const template = document.createElement('template');
  const escapedHtml = /&lt;\/?[a-z]/i.test(html || '');
  let content = html || '';
  if (escapedHtml) {
    const decoder = document.createElement('textarea');
    decoder.innerHTML = content;
    content = decoder.value;
  }
  template.innerHTML = renderStoredMedia(content);
  template.content.querySelectorAll('script, iframe, object, embed, form').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};

const renderBlogPost = (post) => {
  if (!blogPost) return;
  if (!post) {
    blogPost.innerHTML = '<p class="download-status">この記事は現在公開されていません。</p>';
    return;
  }
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
  loadBlog(
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
    loadBlog(
      { type: 'blog', id },
      (payload) => renderBlogPost(payload?.post),
      () => { blogPost.innerHTML = '<p class="download-status">記事を読み込めませんでした。時間をおいて再度お試しください。</p>'; }
    );
  }
}
