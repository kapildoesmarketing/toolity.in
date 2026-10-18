/* Designed by Kapil Pidhwani: Schema Markup Generator — 13 schema.org types as declarative field lists (key, label, kind,
 * required) rendered by one form builder; repeatable groups (FAQ questions, How-to steps, breadcrumbs) are list fields with
 * Add / remove. make(v) per type maps the flat values to JSON-LD; empty values are pruned so no blank properties ship.
 * Ceiling: one entity per output (combine with @graph by hand); no fetch-to-prefill; eligibility notes live in the FAQ. */
(function () {
  'use strict';
  const { mount } = window.ToolityWeb;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const F = (key, label, kind = 'text', req = false, o = {}) => Object.assign({ key, label, kind, req }, o);
  const ADDR = [F('street', 'Street address'), F('city', 'City', 'text', true), F('region', 'State / region'), F('postal', 'Postal code'), F('country', 'Country code', 'text', true, { ph: 'IN' })];
  const CUR = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY'];
  const addr = (v) => ({ '@type': 'PostalAddress', streetAddress: v.street, addressLocality: v.city, addressRegion: v.region, postalCode: v.postal, addressCountry: v.country });
  const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const num = (s) => (s === '' || s === undefined ? undefined : +s);
  const rating = (v) => (v.ratingValue ? { '@type': 'AggregateRating', ratingValue: num(v.ratingValue), reviewCount: num(v.reviewCount), bestRating: 5 } : undefined);
  const TYPES = {
    Organization: { fields: [F('name', 'Organization name', 'text', true), F('url', 'Website URL', 'url', true), F('logo', 'Logo URL', 'url'), F('description', 'Description', 'textarea'), F('email', 'Contact email', 'email'), F('telephone', 'Phone', 'tel'), F('sameAs', 'Social profile URLs', 'lines', false, { ph: 'https://www.linkedin.com/company/…\nhttps://x.com/…' }), ...ADDR.map((f) => Object.assign({}, f, { req: false }))], make: (v) => ({ name: v.name, url: v.url, logo: v.logo, description: v.description, email: v.email, telephone: v.telephone, sameAs: lines(v.sameAs), address: v.city || v.street ? addr(v) : undefined }) },
    LocalBusiness: { fields: [F('name', 'Business name', 'text', true), F('image', 'Photo URL', 'url', true), F('url', 'Website URL', 'url'), F('telephone', 'Phone', 'tel', true), F('priceRange', 'Price range', 'text', false, { ph: '₹₹' }), ...ADDR, F('lat', 'Latitude', 'number'), F('lng', 'Longitude', 'number'), F('openingHours', 'Opening hours', 'lines', false, { ph: 'Mo-Fr 09:00-18:00\nSa 10:00-14:00' }), F('sameAs', 'Social profile URLs', 'lines')], make: (v) => ({ name: v.name, image: v.image, url: v.url, telephone: v.telephone, priceRange: v.priceRange, address: addr(v), geo: v.lat && v.lng ? { '@type': 'GeoCoordinates', latitude: num(v.lat), longitude: num(v.lng) } : undefined, openingHours: lines(v.openingHours), sameAs: lines(v.sameAs) }) },
    Person: { fields: [F('name', 'Full name', 'text', true), F('url', 'Profile / website URL', 'url'), F('image', 'Photo URL', 'url'), F('jobTitle', 'Job title'), F('worksFor', 'Works for (organization)'), F('email', 'Email', 'email'), F('description', 'Bio', 'textarea'), F('sameAs', 'Social profile URLs', 'lines')], make: (v) => ({ name: v.name, url: v.url, image: v.image, jobTitle: v.jobTitle, worksFor: v.worksFor ? { '@type': 'Organization', name: v.worksFor } : undefined, email: v.email, description: v.description, sameAs: lines(v.sameAs) }) },
    WebSite: { fields: [F('name', 'Site name', 'text', true), F('url', 'Site URL', 'url', true), F('search', 'Search URL pattern', 'url', false, { ph: 'https://example.com/search?q={search_term_string}', desc: 'enables the sitelinks search box' })], make: (v) => ({ name: v.name, url: v.url, potentialAction: v.search ? { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: v.search }, 'query-input': 'required name=search_term_string' } : undefined }) },
    Article: { fields: [F('kind', 'Article type', 'select', true, { options: [['Article', 'Article'], ['BlogPosting', 'Blog post'], ['NewsArticle', 'News article']] }), F('headline', 'Headline', 'text', true, { max: 110 }), F('image', 'Image URL', 'url', true), F('datePublished', 'Published', 'datetime', true), F('dateModified', 'Last modified', 'datetime'), F('author', 'Author name', 'text', true), F('authorUrl', 'Author URL', 'url'), F('publisher', 'Publisher name', 'text', true), F('publisherLogo', 'Publisher logo URL', 'url'), F('url', 'Article URL', 'url'), F('description', 'Description', 'textarea')], type: (v) => v.kind || 'Article', make: (v) => ({ headline: v.headline, image: v.image ? [v.image] : undefined, datePublished: v.datePublished, dateModified: v.dateModified, author: { '@type': 'Person', name: v.author, url: v.authorUrl }, publisher: v.publisher ? { '@type': 'Organization', name: v.publisher, logo: v.publisherLogo ? { '@type': 'ImageObject', url: v.publisherLogo } : undefined } : undefined, mainEntityOfPage: v.url, description: v.description }) },
    Product: { fields: [F('name', 'Product name', 'text', true), F('image', 'Image URL', 'url', true), F('description', 'Description', 'textarea'), F('brand', 'Brand'), F('sku', 'SKU'), F('gtin', 'GTIN / barcode'), F('price', 'Price', 'number', true), F('priceCurrency', 'Currency', 'select', true, { options: CUR.map((c) => [c, c]) }), F('availability', 'Availability', 'select', false, { options: [['InStock', 'In stock'], ['OutOfStock', 'Out of stock'], ['PreOrder', 'Pre-order'], ['LimitedAvailability', 'Limited']] }), F('offerUrl', 'Buy URL', 'url'), F('priceValidUntil', 'Price valid until', 'date'), F('ratingValue', 'Rating (1–5)', 'number', false, { min: 1, max: 5 }), F('reviewCount', 'Review count', 'number')], make: (v) => ({ name: v.name, image: v.image ? [v.image] : undefined, description: v.description, brand: v.brand ? { '@type': 'Brand', name: v.brand } : undefined, sku: v.sku, gtin: v.gtin, offers: { '@type': 'Offer', price: v.price, priceCurrency: v.priceCurrency, availability: v.availability ? 'https://schema.org/' + v.availability : undefined, url: v.offerUrl, priceValidUntil: v.priceValidUntil }, aggregateRating: rating(v) }) },
    FAQPage: { fields: [F('qa', 'Questions', 'list', true, { sub: [F('q', 'Question', 'text', true), F('a', 'Answer', 'textarea', true)], min: 1 })], make: (v) => ({ mainEntity: (v.qa || []).map((r) => ({ '@type': 'Question', name: r.q, acceptedAnswer: { '@type': 'Answer', text: r.a } })) }) },
    HowTo: { fields: [F('name', 'Title', 'text', true), F('description', 'Description', 'textarea'), F('image', 'Image URL', 'url'), F('totalTime', 'Total time', 'text', false, { ph: 'PT30M', desc: 'ISO 8601 duration' }), F('supply', 'Supplies', 'lines'), F('tool', 'Tools', 'lines'), F('steps', 'Steps', 'list', true, { sub: [F('name', 'Step title'), F('text', 'Instruction', 'textarea', true), F('image', 'Step image URL', 'url')], min: 2 })], make: (v) => ({ name: v.name, description: v.description, image: v.image, totalTime: v.totalTime, supply: lines(v.supply).map((n) => ({ '@type': 'HowToSupply', name: n })), tool: lines(v.tool).map((n) => ({ '@type': 'HowToTool', name: n })), step: (v.steps || []).map((s) => ({ '@type': 'HowToStep', name: s.name, text: s.text, image: s.image })) }) },
    Event: { fields: [F('name', 'Event name', 'text', true), F('startDate', 'Starts', 'datetime', true), F('endDate', 'Ends', 'datetime'), F('mode', 'Attendance', 'select', false, { options: [['OfflineEventAttendanceMode', 'In person'], ['OnlineEventAttendanceMode', 'Online'], ['MixedEventAttendanceMode', 'Hybrid']] }), F('venue', 'Venue name', 'text', true), ...ADDR, F('onlineUrl', 'Online event URL', 'url'), F('image', 'Image URL', 'url'), F('description', 'Description', 'textarea'), F('status', 'Status', 'select', false, { options: [['EventScheduled', 'Scheduled'], ['EventPostponed', 'Postponed'], ['EventRescheduled', 'Rescheduled'], ['EventCancelled', 'Cancelled'], ['EventMovedOnline', 'Moved online']] }), F('price', 'Ticket price (0 = free)', 'number'), F('priceCurrency', 'Currency', 'select', false, { options: CUR.map((c) => [c, c]) }), F('ticketUrl', 'Ticket URL', 'url'), F('performer', 'Performer'), F('organizer', 'Organizer'), F('organizerUrl', 'Organizer URL', 'url')], make: (v) => ({ name: v.name, startDate: v.startDate, endDate: v.endDate, eventAttendanceMode: v.mode ? 'https://schema.org/' + v.mode : undefined, eventStatus: v.status ? 'https://schema.org/' + v.status : undefined, location: v.mode === 'OnlineEventAttendanceMode' ? { '@type': 'VirtualLocation', url: v.onlineUrl } : { '@type': 'Place', name: v.venue, address: addr(v) }, image: v.image ? [v.image] : undefined, description: v.description, offers: v.price !== '' && v.price !== undefined ? { '@type': 'Offer', price: v.price, priceCurrency: v.priceCurrency, url: v.ticketUrl, availability: 'https://schema.org/InStock' } : undefined, performer: v.performer ? { '@type': 'PerformingGroup', name: v.performer } : undefined, organizer: v.organizer ? { '@type': 'Organization', name: v.organizer, url: v.organizerUrl } : undefined }) },
    BreadcrumbList: { fields: [F('items', 'Trail (home first)', 'list', true, { sub: [F('name', 'Name', 'text', true), F('url', 'URL', 'url', true)], min: 2 })], make: (v) => ({ itemListElement: (v.items || []).map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, item: r.url })) }) },
    Recipe: { fields: [F('name', 'Recipe name', 'text', true), F('image', 'Image URL', 'url', true), F('author', 'Author', 'text', true), F('datePublished', 'Published', 'date'), F('description', 'Description', 'textarea'), F('prepTime', 'Prep time', 'text', false, { ph: 'PT15M' }), F('cookTime', 'Cook time', 'text', false, { ph: 'PT30M' }), F('recipeYield', 'Yield', 'text', false, { ph: '4 servings' }), F('recipeCategory', 'Category', 'text', false, { ph: 'Dinner' }), F('recipeCuisine', 'Cuisine', 'text', false, { ph: 'Indian' }), F('keywords', 'Keywords'), F('calories', 'Calories per serving', 'number'), F('ingredients', 'Ingredients', 'lines', true), F('instructions', 'Steps', 'lines', true), F('ratingValue', 'Rating (1–5)', 'number', false, { min: 1, max: 5 }), F('reviewCount', 'Review count', 'number')], make: (v) => ({ name: v.name, image: v.image ? [v.image] : undefined, author: { '@type': 'Person', name: v.author }, datePublished: v.datePublished, description: v.description, prepTime: v.prepTime, cookTime: v.cookTime, recipeYield: v.recipeYield, recipeCategory: v.recipeCategory, recipeCuisine: v.recipeCuisine, keywords: v.keywords, nutrition: v.calories ? { '@type': 'NutritionInformation', calories: `${v.calories} calories` } : undefined, recipeIngredient: lines(v.ingredients), recipeInstructions: lines(v.instructions).map((t) => ({ '@type': 'HowToStep', text: t })), aggregateRating: rating(v) }) },
    VideoObject: { fields: [F('name', 'Title', 'text', true), F('description', 'Description', 'textarea', true), F('thumbnailUrl', 'Thumbnail URL', 'url', true), F('uploadDate', 'Upload date', 'datetime', true), F('duration', 'Duration', 'text', false, { ph: 'PT4M20S' }), F('contentUrl', 'Video file URL', 'url'), F('embedUrl', 'Embed URL', 'url')], make: (v) => ({ name: v.name, description: v.description, thumbnailUrl: v.thumbnailUrl ? [v.thumbnailUrl] : undefined, uploadDate: v.uploadDate, duration: v.duration, contentUrl: v.contentUrl, embedUrl: v.embedUrl }) },
    JobPosting: { fields: [F('title', 'Job title', 'text', true), F('description', 'Description (HTML allowed)', 'textarea', true), F('datePosted', 'Date posted', 'date', true), F('validThrough', 'Apply by', 'datetime'), F('employmentType', 'Employment type', 'select', false, { options: [['FULL_TIME', 'Full-time'], ['PART_TIME', 'Part-time'], ['CONTRACTOR', 'Contract'], ['INTERN', 'Internship'], ['TEMPORARY', 'Temporary']] }), F('org', 'Company name', 'text', true), F('orgUrl', 'Company URL', 'url'), F('orgLogo', 'Company logo URL', 'url'), F('remote', 'Remote job', 'select', false, { options: [['', 'No'], ['yes', 'Yes — fully remote']] }), ...ADDR, F('salaryMin', 'Salary min', 'number'), F('salaryMax', 'Salary max', 'number'), F('salaryCurrency', 'Currency', 'select', false, { options: CUR.map((c) => [c, c]) }), F('salaryUnit', 'Per', 'select', false, { options: [['YEAR', 'year'], ['MONTH', 'month'], ['HOUR', 'hour']] })], make: (v) => ({ title: v.title, description: v.description, datePosted: v.datePosted, validThrough: v.validThrough, employmentType: v.employmentType, hiringOrganization: { '@type': 'Organization', name: v.org, sameAs: v.orgUrl, logo: v.orgLogo }, jobLocationType: v.remote ? 'TELECOMMUTE' : undefined, jobLocation: { '@type': 'Place', address: addr(v) }, baseSalary: v.salaryMin || v.salaryMax ? { '@type': 'MonetaryAmount', currency: v.salaryCurrency, value: { '@type': 'QuantitativeValue', minValue: num(v.salaryMin), maxValue: num(v.salaryMax), unitText: v.salaryUnit } } : undefined }) }
  };

  /* ── form ── */
  const INPUT = { text: 'text', url: 'url', email: 'email', tel: 'tel', number: 'number', date: 'date', datetime: 'datetime-local' };
  function control(f, id, v = '') {
    const lab = `<label class="form-label" for="${id}"><span>${f.label}${f.req ? ' <b class="sc-req" title="Required">*</b>' : ''}</span>${f.desc ? `<span class="form-label-desc">${f.desc}</span>` : ''}</label>`;
    if (f.kind === 'textarea' || f.kind === 'lines') return `<div class="form-group">${lab}<textarea id="${id}" class="textarea-clean" rows="${f.kind === 'lines' ? 3 : 3}" placeholder="${esc(f.ph || (f.kind === 'lines' ? 'One per line' : ''))}" data-key="${f.key}">${esc(v)}</textarea></div>`;
    if (f.kind === 'select') return `<div class="form-group">${lab}<select id="${id}" class="select-clean" data-key="${f.key}">${f.options.map(([o, l]) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
    return `<div class="form-group">${lab}<input type="${INPUT[f.kind] || 'text'}" id="${id}" class="input-clean" data-key="${f.key}" value="${esc(v)}" placeholder="${esc(f.ph || '')}"${f.max ? ` maxlength="${f.max}"` : ''}${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined && f.kind === 'number' ? ` max="${f.max}"` : ''}${f.kind === 'number' ? ' step="any" inputmode="decimal"' : ''} autocomplete="off"></div>`;
  }
  const row = (f, i) => `<div class="sc-row" data-list="${f.key}"><div class="sc-row-head"><span class="web-muted">#${i + 1}</span><button type="button" class="sc-del" title="Remove" aria-label="Remove item"><iconify-icon icon="lucide:x" width="14" height="14"></iconify-icon></button></div>${f.sub.map((s) => control(s, `f-${f.key}-${Date.now().toString(36)}${i}-${s.key}`)).join('')}</div>`;
  function renderForm($, type) {
    const T = TYPES[type];
    $('sc-fields').innerHTML = T.fields.map((f) => f.kind === 'list'
      ? `<div class="form-group sc-list" data-key="${f.key}"><span class="form-label"><span>${f.label} <b class="sc-req" title="Required">*</b></span></span><div class="sc-rows">${Array.from({ length: f.min || 1 }, (_, i) => row(f, i)).join('')}</div><button type="button" class="btn-toolbar-sm sc-add" data-key="${f.key}"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon><span>Add</span></button></div>`
      : control(f, `f-${f.key}`)).join('');
  }
  function read($, type) {
    const v = {}; const T = TYPES[type];
    for (const f of T.fields) {
      if (f.kind !== 'list') { v[f.key] = ($(`f-${f.key}`) || {}).value || ''; continue; }
      v[f.key] = [...$('sc-fields').querySelectorAll(`.sc-row[data-list="${f.key}"]`)].map((r) => Object.fromEntries(f.sub.map((s) => [s.key, (r.querySelector(`[data-key="${s.key}"]`) || {}).value || ''])));
    }
    return v;
  }
  const isUrl = (s) => { try { const u = new URL(s); return /^https?:$/.test(u.protocol); } catch (e) { return false; } };
  function check(type, v) {
    const out = []; const T = TYPES[type];
    const one = (f, val, where) => {
      if (f.req && (val === '' || val === undefined)) out.push(['fail', `${where}${f.label} is required`]);
      if (val && f.kind === 'url' && !isUrl(val)) out.push(['fail', `${where}${f.label} must be an absolute http(s) URL`]);
      if (val && f.kind === 'number' && isNaN(+val)) out.push(['fail', `${where}${f.label} must be a number`]);
      if (val && f.kind === 'number' && f.min !== undefined && (+val < f.min || +val > f.max)) out.push(['fail', `${where}${f.label} must be ${f.min}–${f.max}`]);
      if (val && f.key === 'headline' && val.length > 110) out.push(['warn', 'Headline over 110 characters — Google truncates it']);
    };
    for (const f of T.fields) {
      if (f.kind !== 'list') { one(f, v[f.key], ''); continue; }
      if ((v[f.key] || []).length < (f.min || 1)) out.push(['fail', `${f.label}: add at least ${f.min || 1}`]);
      v[f.key].forEach((r, i) => f.sub.forEach((s) => one(s, r[s.key], `${f.label} #${i + 1}: `)));
    }
    if (type === 'Product' && !v.ratingValue) out.push(['warn', 'No rating — stars need aggregateRating or a review']);
    if (type === 'Event' && !v.image) out.push(['warn', 'Add an image — recommended for Event rich results']);
    if (type === 'FAQPage') out.push(['warn', 'Google shows FAQ rich results only for authoritative government/health sites (2023+)']);
    return out;
  }
  const prune = (x) => { if (Array.isArray(x)) { const a = x.map(prune).filter((y) => y !== undefined); return a.length ? a : undefined; } if (x && typeof x === 'object') { const o = {}; for (const [k, y] of Object.entries(x)) { const p = prune(y); if (p !== undefined) o[k] = p; } return Object.keys(o).some((k) => k !== '@type') ? o : undefined; } return x === '' || x === undefined || x === null || (typeof x === 'number' && isNaN(x)) ? undefined : x; };
  const isoDate = (s) => (s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? s + ':00' + (() => { const o = -new Date(s).getTimezoneOffset(), a = Math.abs(o); return (o >= 0 ? '+' : '-') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0'); })() : s);

  let curType = null;
  const api = mount({
    slug: 'schema-markup-generator', debounce: 150,
    ready: () => true,
    summary: ({ val }) => [val('opt-indent') === '0' ? 'minified' : `${val('opt-indent')}-space indent`, val('opt-context') ? 'with @context' : 'no @context', val('opt-id') ? '@id' : null].filter(Boolean).join(' · '),
    run: ({ $, val }) => {
      const type = val('sc-type');
      if (type !== curType) { renderForm($, type); curType = type; }
      const T = TYPES[type], v = read($, type);
      for (const f of T.fields) if (f.kind === 'datetime') v[f.key] = isoDate(v[f.key]);
      const issues = check(type, v), body = prune(T.make(v)) || {};
      const obj = Object.assign(val('opt-context') ? { '@context': 'https://schema.org' } : {}, { '@type': T.type ? T.type(v) : type }, val('opt-id') && isUrl(v.url || v.offerUrl || '') ? { '@id': (v.url || v.offerUrl) + '#' + type.toLowerCase() } : {}, body);
      const json = JSON.stringify(obj, null, +val('opt-indent') || 0), code = `<script type="application/ld+json">\n${json}\n</script>`;
      $('output-text').textContent = code;
      const fails = issues.filter((i) => i[0] === 'fail').length;
      $('output-issues').innerHTML = (issues.length ? issues : [['pass', 'All required fields present']]).slice(0, 20).map(([k, s]) => `<span class="web-tag ${k}">${esc(s)}</span>`).join('');
      const filled = T.fields.filter((f) => f.kind !== 'select' && (Array.isArray(v[f.key]) ? v[f.key].some((r) => Object.values(r).some(Boolean)) : v[f.key])).length; // selects always have a value — they don't count as typing
      if (!filled) { $('output-issues').innerHTML = ''; return null; }
      return { text: code, json, ext: 'html', mime: 'text/html;charset=utf-8', badge: `${type} · ${fails ? `${fails} issue${fails === 1 ? '' : 's'}` : 'valid'}`, note: fails ? 'Fill the required fields' : 'Ready to paste', ok: !fails, copyMsg: 'JSON-LD copied' };
    },
    download: (fmt, { S, val }) => (fmt === 'json' ? { text: S.out.json + '\n', name: `${val('sc-type').toLowerCase()}-schema.json`, mime: 'application/ld+json' } : { text: S.out.text + '\n', name: `${val('sc-type').toLowerCase()}-schema.html`, mime: 'text/html;charset=utf-8' }),
    onReset: ({ $ }) => { curType = null; $('output-text').textContent = ''; $('output-issues').innerHTML = ''; }
  });
  api.$('sc-fields').addEventListener('click', (e) => {
    const add = e.target.closest('.sc-add'), del = e.target.closest('.sc-del');
    if (add) { const f = TYPES[curType].fields.find((x) => x.key === add.dataset.key), box = add.previousElementSibling; box.insertAdjacentHTML('beforeend', row(f, box.children.length)); box.lastElementChild.querySelector('input,textarea').focus(); api.run(); }
    if (del) { const r = del.closest('.sc-row'), box = r.parentElement; if (box.children.length > 1) { r.remove(); [...box.children].forEach((c, i) => { c.querySelector('.web-muted').textContent = `#${i + 1}`; }); api.run(); } else api.toast('Keep at least one'); }
  });
})();
