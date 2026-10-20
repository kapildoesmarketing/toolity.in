/* Toolity.in — shared tag/consent scanner (window.ToolityTagScan) used by Tag Detector and Consent Mode Checker.
 * scan(html, baseUrl, { scripts, gtm, fetchPage }) → { corpus, tags, gtmIds, ga4Ids, issues, consent, cmp, stats }.
 * Designed by Kapil Pidhwani: static analysis of HTML + (optionally) first-party scripts and the GTM containers themselves,
 * fetched through web-common's direct→relay path. Ceiling: tags injected only after consent or by server-side GTM are invisible
 * to any static scan — the FAQ says so. ~60 signatures; add a line to SIG to teach it a new vendor. */
(function () {
  'use strict';
  // [id, name, category, pattern (src or inline), idPattern?, docs?]
  const SIG = [
    ['gtm', 'Google Tag Manager', 'tagmanager', /googletagmanager\.com\/gtm\.js|googletagmanager\.com\/ns\.html|['"]gtm\.start['"]/i, /GTM-[A-Z0-9]{4,10}/g],
    ['ga4', 'Google Analytics 4', 'analytics', /googletagmanager\.com\/gtag\/js\?id=G-|gtag\(\s*['"]config['"]\s*,\s*['"]G-|\bG-[A-Z0-9]{6,12}\b/, /\bG-[A-Z0-9]{6,12}\b/g],
    ['ua', 'Universal Analytics (legacy)', 'analytics', /google-analytics\.com\/analytics\.js|google-analytics\.com\/ga\.js|\bUA-\d{4,10}-\d{1,3}\b/, /\bUA-\d{4,10}-\d{1,3}\b/g],
    ['gads', 'Google Ads', 'advertising', /gtag\/js\?id=AW-|\bAW-\d{6,12}\b|googleadservices\.com\/pagead\/conversion/, /\bAW-\d{6,12}\b/g],
    ['dv360', 'Google Floodlight / DV360', 'advertising', /\bDC-\d{5,10}\b|fls\.doubleclick\.net/, /\bDC-\d{5,10}\b/g],
    ['gtag', 'gtag.js', 'tagmanager', /googletagmanager\.com\/gtag\/js/],
    ['meta', 'Meta Pixel', 'advertising', /connect\.facebook\.net\/[a-z_A-Z]+\/fbevents\.js|fbq\(\s*['"]init['"]|facebook\.com\/tr\?/, /fbq\(\s*['"]init['"]\s*,\s*['"](\d{8,20})['"]|facebook\.com\/tr\?id=(\d{8,20})/g],
    ['tiktok', 'TikTok Pixel', 'advertising', /analytics\.tiktok\.com\/i18n\/pixel|ttq\.load\(/, /ttq\.load\(\s*['"]([A-Z0-9]{10,30})['"]/g],
    ['pinterest', 'Pinterest Tag', 'advertising', /s\.pinimg\.com\/ct\/core\.js|pintrk\(\s*['"]load['"]/, /pintrk\(\s*['"]load['"]\s*,\s*['"](\d{10,16})['"]/g],
    ['linkedin', 'LinkedIn Insight Tag', 'advertising', /snap\.licdn\.com\/li\.lms-analytics|_linkedin_partner_id/, /_linkedin_partner_id\s*=\s*['"](\d{4,10})['"]/g],
    ['snap', 'Snap Pixel', 'advertising', /sc-static\.net\/scevent\.min\.js|snaptr\(\s*['"]init['"]/, /snaptr\(\s*['"]init['"]\s*,\s*['"]([a-f0-9-]{20,40})['"]/g],
    ['twitter', 'X / Twitter Pixel', 'advertising', /static\.ads-twitter\.com\/uwt\.js|twq\(\s*['"](?:init|config)['"]/, /twq\(\s*['"](?:init|config)['"]\s*,\s*['"]([a-z0-9]{5,8})['"]/g],
    ['bing', 'Microsoft Ads UET', 'advertising', /bat\.bing\.com\/bat\.js|UET\(/, /ti\s*:\s*['"]?(\d{6,10})/g],
    ['reddit', 'Reddit Pixel', 'advertising', /redditstatic\.com\/ads\/pixel\.js|rdt\(\s*['"]init['"]/, /rdt\(\s*['"]init['"]\s*,\s*['"]([a-z0-9_]{6,20})['"]/g],
    ['quora', 'Quora Pixel', 'advertising', /a\.quora\.com\/qevents\.js/],
    ['criteo', 'Criteo', 'advertising', /static\.criteo\.net\/js\/ld\/ld\.js|dynamic\.criteo\.com/],
    ['taboola', 'Taboola', 'advertising', /cdn\.taboola\.com\/libtrc/],
    ['outbrain', 'Outbrain', 'advertising', /amplify\.outbrain\.com|widgets\.outbrain\.com/],
    ['amazonads', 'Amazon Ads', 'advertising', /amazon-adsystem\.com\/aax2\/apstag|s\.amazon-adsystem\.com\/iu3/],
    ['clarity', 'Microsoft Clarity', 'heatmaps', /clarity\.ms\/tag\/|window\.clarity\s*=|['"]clarity['"]\s*,\s*['"]script['"]/, /clarity\.ms\/tag\/([a-z0-9]{6,14})|clarity['"]?\s*,\s*['"]script['"]\s*,\s*['"]([a-z0-9]{6,14})['"]/g],
    ['hotjar', 'Hotjar', 'heatmaps', /static\.hotjar\.com\/c\/hotjar-|hjid\s*:/, /hjid\s*:\s*(\d{5,9})|hotjar-(\d{5,9})\.js/g],
    ['fullstory', 'FullStory', 'heatmaps', /fullstory\.com\/s\/fs\.js|window\[['"]_fs_org['"]\]/, /_fs_org['"]\]\s*=\s*['"]([A-Z0-9]{3,10})['"]/g],
    ['luckyorange', 'Lucky Orange', 'heatmaps', /luckyorange\.com\/lo\.js|tools\.luckyorange\.com/],
    ['mouseflow', 'Mouseflow', 'heatmaps', /cdn\.mouseflow\.com\/projects/],
    ['crazyegg', 'Crazy Egg', 'heatmaps', /script\.crazyegg\.com/],
    ['matomo', 'Matomo', 'analytics', /matomo\.js|piwik\.js|_paq\.push/],
    ['plausible', 'Plausible', 'analytics', /plausible\.io\/js\/|data-domain=["'][^"']+["'][^>]*plausible/],
    ['fathom', 'Fathom', 'analytics', /cdn\.usefathom\.com\/script\.js/],
    ['umami', 'Umami', 'analytics', /umami\.js|data-website-id=/],
    ['posthog', 'PostHog', 'analytics', /posthog\.init\(|app\.posthog\.com|us\.i\.posthog\.com|eu\.i\.posthog\.com/, /posthog\.init\(\s*['"](phc_[A-Za-z0-9]{20,60})['"]/g],
    ['mixpanel', 'Mixpanel', 'analytics', /cdn\.mxpnl\.com|mixpanel\.init\(/, /mixpanel\.init\(\s*['"]([a-f0-9]{32})['"]/g],
    ['amplitude', 'Amplitude', 'analytics', /cdn\.amplitude\.com|amplitude\.init\(|amplitude\.getInstance\(\)\.init\(/],
    ['heap', 'Heap', 'analytics', /cdn\.heapanalytics\.com|heap\.load\(/, /heap\.load\(\s*['"](\d{8,12})['"]/g],
    ['segment', 'Segment', 'tagmanager', /cdn\.segment\.com\/analytics\.js|analytics\.load\(/, /analytics\.load\(\s*['"]([A-Za-z0-9]{20,40})['"]/g],
    ['tealium', 'Tealium iQ', 'tagmanager', /tags\.tiqcdn\.com\/utag/],
    ['adobelaunch', 'Adobe Launch / Tags', 'tagmanager', /assets\.adobedtm\.com/],
    ['adobeanalytics', 'Adobe Analytics', 'analytics', /\bs_code\.js|AppMeasurement|omtrdc\.net|2o7\.net/],
    ['yandex', 'Yandex Metrica', 'analytics', /mc\.yandex\.ru\/metrika|ym\(\s*\d+\s*,\s*['"]init['"]/, /ym\(\s*(\d{6,10})\s*,/g],
    ['baidu', 'Baidu Tongji', 'analytics', /hm\.baidu\.com\/hm\.js/],
    ['cloudflare', 'Cloudflare Web Analytics', 'analytics', /static\.cloudflareinsights\.com\/beacon/],
    ['vercel', 'Vercel Analytics', 'analytics', /\/_vercel\/insights\/script\.js|va\.vercel-scripts\.com/],
    ['gaoptimize', 'Google Optimize (sunset)', 'abtesting', /googleoptimize\.com\/optimize\.js/],
    ['optimizely', 'Optimizely', 'abtesting', /cdn\.optimizely\.com\/js/],
    ['vwo', 'VWO', 'abtesting', /dev\.visualwebsiteoptimizer\.com|_vwo_code/],
    ['abtasty', 'AB Tasty', 'abtesting', /try\.abtasty\.com/],
    ['intercom', 'Intercom', 'chat', /widget\.intercom\.io|window\.intercomSettings/],
    ['drift', 'Drift', 'chat', /js\.driftt\.com/],
    ['crisp', 'Crisp', 'chat', /client\.crisp\.chat|CRISP_WEBSITE_ID/],
    ['tawk', 'Tawk.to', 'chat', /embed\.tawk\.to/],
    ['zendesk', 'Zendesk', 'chat', /static\.zdassets\.com|zopim\.com/],
    ['hubspot', 'HubSpot', 'marketing', /js\.hs-scripts\.com|js\.hsforms\.net|js\.hs-analytics\.net/, /hs-scripts\.com\/(\d{5,10})\.js/g],
    ['klaviyo', 'Klaviyo', 'marketing', /static\.klaviyo\.com\/onsite\/js|klaviyo\.js\?company_id=/, /company_id=([A-Za-z0-9]{6})/g],
    ['mailchimp', 'Mailchimp', 'marketing', /chimpstatic\.com\/mcjs-connected/],
    ['sentry', 'Sentry', 'errors', /browser\.sentry-cdn\.com|js\.sentry-cdn\.com|Sentry\.init\(/],
    ['newrelic', 'New Relic Browser', 'errors', /js-agent\.newrelic\.com|NREUM/],
    ['datadog', 'Datadog RUM', 'errors', /datadoghq-browser-agent\.com|DD_RUM/],
    ['shopify', 'Shopify (store)', 'ecommerce', /cdn\.shopify\.com\/shopifycloud|Shopify\.theme|shopify-features/],
    ['woocommerce', 'WooCommerce', 'ecommerce', /woocommerce[^"']*\.js|wc-add-to-cart/],
    ['recaptcha', 'Google reCAPTCHA', 'other', /google\.com\/recaptcha\/api\.js|recaptcha\/enterprise\.js/],
    ['youtube', 'YouTube embed', 'other', /youtube\.com\/embed\/|youtube-nocookie\.com\/embed\//],
    ['gfonts', 'Google Fonts', 'other', /fonts\.googleapis\.com/],
    ['jquery', 'jQuery', 'other', /jquery(?:\.min)?\.js|jquery-\d/i]
  ];
  const CMP = [
    ['cookiebot', 'Cookiebot', /consent\.cookiebot\.com\/uc\.js|cookiebot/i], ['onetrust', 'OneTrust', /cdn\.cookielaw\.org|otSDKStub|OneTrust/], ['usercentrics', 'Usercentrics', /app\.usercentrics\.eu|usercentrics/i],
    ['cookieyes', 'CookieYes', /cdn-cookieyes\.com|cookieyes/i], ['complianz', 'Complianz', /complianz/i], ['didomi', 'Didomi', /sdk\.privacy-center\.org|didomi/i], ['iubenda', 'iubenda', /cdn\.iubenda\.com|_iub\.csConfiguration/],
    ['termly', 'Termly', /app\.termly\.io/], ['axeptio', 'Axeptio', /static\.axept\.io|axeptioSettings/], ['osano', 'Osano', /cmp\.osano\.com/], ['quantcast', 'Quantcast Choice', /quantcast\.mgr\.consensu\.org|quantcast\.com\/choice/],
    ['sourcepoint', 'Sourcepoint', /sourcepoint|_sp_\.config/i], ['trustarc', 'TrustArc', /consent\.trustarc\.com|trustarc\.com\/notice|TrustArc/], ['borlabs', 'Borlabs Cookie', /borlabs-cookie/i], ['klaro', 'Klaro', /klaro(?:\.min)?\.js|klaroConfig/],
    ['cookiefirst', 'CookieFirst', /consent\.cookiefirst\.com/], ['consentmanager', 'consentmanager', /cdn\.consentmanager\.net|delivery\.consentmanager\.net/], ['secureprivacy', 'Secure Privacy', /app\.secureprivacy\.ai/],
    ['enzuzo', 'Enzuzo', /app\.enzuzo\.com/], ['cookiescript', 'Cookie Script', /cdn\.cookie-script\.com/], ['illow', 'illow', /platform\.illow\.io/], ['clym', 'Clym', /widget\.clym\.io/], ['cookieinfo', 'Cookie Information', /policy\.app\.cookieinformation\.com/],
    ['piwikpro', 'Piwik PRO Consent', /piwik\.pro\/ppms\.js|containers\.piwik\.pro/], ['gcmp', 'Google-certified CMP (generic)', /funding-choices|fundingchoicesmessages\.google\.com/], ['moove', 'GDPR Cookie Compliance (Moove)', /moove_gdpr|gdpr-cookie-compliance/i], ['cookienotice', 'Cookie Notice (WP)', /cookie-notice\/js|cnArgs/], ['real', 'Real Cookie Banner', /real-cookie-banner/i]
  ];
  const CATS = { tagmanager: 'Tag management', analytics: 'Analytics', advertising: 'Advertising & pixels', heatmaps: 'Heatmaps & session replay', abtesting: 'A/B testing', chat: 'Chat & support', marketing: 'Marketing automation', errors: 'Error & performance monitoring', ecommerce: 'E-commerce platform', other: 'Other scripts', cmp: 'Consent management' };
  const STORAGE = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization', 'functionality_storage', 'personalization_storage', 'security_storage'];

  function corpusFromHtml(html, baseUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html'), items = [], abs = (u) => { try { return new URL(u, baseUrl || 'https://example.invalid/').href; } catch (e) { return u; } };
    const headEnd = html.search(/<\/head\s*>/i);
    // Designed by Kapil Pidhwani: position by src or first 50 chars of content (outerHTML re-serialises attributes, so it can't be searched)
    const posOf = (el) => { const src = el.getAttribute && (el.getAttribute('src') || el.getAttribute('href')); const key = src || (el.textContent || '').trim().slice(0, 50); if (!key) return -1; const i = html.indexOf(key); return i < 0 ? html.indexOf(key.replace(/&/g, '&amp;')) : i; };
    doc.querySelectorAll('script').forEach((s) => { const pos = posOf(s), loc = pos >= 0 && headEnd >= 0 && pos < headEnd ? 'head' : 'body'; if (s.src) items.push({ kind: 'script', url: abs(s.getAttribute('src')), text: abs(s.getAttribute('src')), loc, async: s.async, defer: s.defer, type: s.type || '', pos }); else if (s.textContent.trim()) items.push({ kind: 'inline', text: s.textContent, loc, type: s.type || '', pos }); });
    doc.querySelectorAll('noscript').forEach((n) => items.push({ kind: 'noscript', text: n.innerHTML || n.textContent, loc: 'body', pos: posOf(n) }));
    doc.querySelectorAll('iframe[src], img[src]').forEach((e) => items.push({ kind: e.tagName.toLowerCase(), text: abs(e.getAttribute('src')), url: abs(e.getAttribute('src')), loc: 'body', pos: posOf(e) }));
    doc.querySelectorAll('link[href]').forEach((l) => { const rel = (l.getAttribute('rel') || '').toLowerCase(); if (/preconnect|dns-prefetch|preload/.test(rel)) items.push({ kind: 'link', text: abs(l.getAttribute('href')), url: abs(l.getAttribute('href')), loc: 'head', pos: posOf(l), rel }); });
    return { items, doc };
  }
  const matchIds = (re, text) => { if (!re) return []; const out = new Set(); re.lastIndex = 0; let m; while ((m = re.exec(text))) { out.add((m.slice(1).find(Boolean) || m[0]).trim()); if (!re.global) break; } return [...out]; };
  function parseConsentCalls(text) {
    // gtag('consent','default',{...}) | dataLayer.push(['consent','default',{...}]) | gtag("consent", "update", {...})
    const out = [], re = /(?:gtag|dataLayer\.push)\s*\(\s*\[?\s*['"]consent['"]\s*,\s*['"](default|update)['"]\s*,\s*(\{[\s\S]*?\})\s*\]?\s*\)/g; let m;
    while ((m = re.exec(text))) {
      const body = m[2], obj = {}; const kv = /['"]?([a-z_]+)['"]?\s*:\s*(['"]([^'"]*)['"]|(\d+)|(\[[^\]]*\])|(true|false))/g; let k;
      while ((k = kv.exec(body))) obj[k[1]] = k[3] !== undefined ? k[3] : k[4] !== undefined ? +k[4] : k[5] !== undefined ? k[5].replace(/['"\s\[\]]/g, '').split(',').filter(Boolean) : k[6] === 'true';
      out.push({ type: m[1], obj, index: m.index, raw: m[0].slice(0, 400) });
    }
    return out;
  }
  // Designed by Kapil Pidhwani: gtm.js = `var data = {…};` (the container's tags/triggers/templates) + Google's runtime library.
  // Only the data object says what THIS container does; the library mentions every vendor string and would be all false positives.
  function gtmData(js) { const a = js.indexOf('var data = {'); if (a < 0) return js; const b = js.indexOf('\n};', a); return b < 0 ? js.slice(a) : js.slice(a, b + 3); }
  async function scan(html, baseUrl, opt = {}) {
    const { items, doc } = corpusFromHtml(html, baseUrl), corpus = items.map((it, i) => ({ ...it, id: i, origin: 'page' }));
    const host = (() => { try { return new URL(baseUrl).hostname; } catch (e) { return ''; } })();
    const fetched = { scripts: [], gtm: [] }, fetchPage = opt.fetchPage;
    if (opt.scripts && fetchPage && host) {
      const firstParty = corpus.filter((c) => c.kind === 'script' && c.url && (() => { try { const h = new URL(c.url).hostname; return h === host || h.endsWith('.' + host.replace(/^www\./, '')); } catch (e) { return false; } })()).slice(0, 10);
      await Promise.all(firstParty.map(async (c) => { try { const r = await fetchPage(c.url, 10000); if (r.html && r.html.length < 400000) { corpus.push({ kind: 'fetched', text: r.html, loc: c.loc, origin: 'script', from: c.url, id: corpus.length }); fetched.scripts.push(c.url); } } catch (e) { /* skip */ } }));
    }
    const allText = () => corpus.map((c) => c.text).join('\n');
    let gtmIds = [...new Set(matchIds(/GTM-[A-Z0-9]{4,10}/g, allText()))];
    if (opt.gtm && fetchPage) {
      await Promise.all(gtmIds.slice(0, 4).map(async (id) => { try { const r = await fetchPage(`https://www.googletagmanager.com/gtm.js?id=${id}`, 15000); if (r.html && /google|gtm/i.test(r.html.slice(0, 2000))) { corpus.push({ kind: 'gtm', text: gtmData(r.html), loc: 'gtm', origin: 'gtm', from: id, id: corpus.length }); fetched.gtm.push(id); } } catch (e) { /* skip */ } }));
      gtmIds = [...new Set(matchIds(/GTM-[A-Z0-9]{4,10}/g, allText()))];
    }
    // signatures
    const tags = [];
    for (const [id, name, cat, re, idRe] of SIG) {
      const hits = corpus.filter((c) => re.test(c.text)); if (!hits.length) continue;
      const ids = [...new Set(hits.flatMap((c) => matchIds(idRe, c.text)))].filter((x) => !/^GTM-/.test(x) || id === 'gtm');
      const where = { head: hits.some((c) => c.origin === 'page' && c.loc === 'head'), body: hits.some((c) => c.origin === 'page' && c.loc === 'body'), gtm: hits.some((c) => c.origin === 'gtm'), script: hits.some((c) => c.origin === 'script'), noscript: hits.some((c) => c.kind === 'noscript') };
      const ext = hits.filter((c) => c.kind === 'script'), asyncOk = ext.length ? ext.every((c) => c.async || c.defer) : null;
      tags.push({ id, name, cat, ids, where, hits: hits.length, asyncOk, viaGtmOnly: where.gtm && !where.head && !where.body && !where.script, sources: hits.map((c) => (c.origin === 'gtm' ? `GTM ${c.from}` : c.origin === 'script' ? c.from : `${c.kind} (${c.loc})`)) });
    }
    const cmp = CMP.filter(([, , re]) => re.test(allText())).map(([id, name]) => ({ id, name }));
    // consent
    const pageInline = corpus.filter((c) => c.origin === 'page' && (c.kind === 'inline')), calls = [];
    pageInline.forEach((c) => parseConsentCalls(c.text).forEach((k) => calls.push({ ...k, loc: c.loc, pos: c.pos })));
    const gtmCalls = corpus.filter((c) => c.origin === 'gtm').flatMap((c) => parseConsentCalls(c.text).map((k) => ({ ...k, loc: 'gtm', pos: -1 })));
    const gtmConsentHints = corpus.filter((c) => c.origin === 'gtm').some((c) => /gtm\.init_consent|setDefaultConsentState|updateConsentState|"vtp_(?:adStorage|analyticsStorage|adUserData|adPersonalization|consentSettings|command)"|"denied"/.test(c.text));
    const firstLoader = corpus.filter((c) => c.origin === 'page' && c.pos >= 0 && /googletagmanager\.com\/(gtm|gtag)|['"]gtm\.start['"]/.test(c.text)).sort((a, b) => a.pos - b.pos)[0];
    const defaults = calls.filter((c) => c.type === 'default');
    const consent = {
      present: defaults.length > 0 || gtmCalls.some((c) => c.type === 'default') || gtmConsentHints, defaults, updates: calls.filter((c) => c.type === 'update'), gtmDefaults: gtmCalls.filter((c) => c.type === 'default'), gtmHints: gtmConsentHints,
      merged: Object.assign({}, ...defaults.map((d) => d.obj)), firstLoaderPos: firstLoader ? firstLoader.pos : -1, firstDefaultPos: defaults.length ? Math.min(...defaults.map((d) => d.pos)) : -1,
      redaction: /ads_data_redaction['"]?\s*,\s*true|ads_data_redaction\s*:\s*true/.test(allText()), passthrough: /url_passthrough['"]?\s*,\s*true|url_passthrough\s*:\s*true/.test(allText()), tcf: /__tcfapi/.test(allText()), devId: /developer_id\./.test(allText())
    };
    consent.v2 = STORAGE.slice(2, 4).every((k) => consent.merged[k] !== undefined);
    const stats = { scripts: corpus.filter((c) => c.kind === 'script' && c.origin === 'page').length, inline: pageInline.length, thirdParty: [...new Set(corpus.filter((c) => c.kind === 'script' && c.url).map((c) => { try { return new URL(c.url).hostname; } catch (e) { return ''; } }).filter((h) => h && host && !(h === host || h.endsWith('.' + host.replace(/^www\./, '')))))], fetched };
    return { corpus, tags, gtmIds, ga4Ids: (tags.find((t) => t.id === 'ga4') || { ids: [] }).ids, cmp, consent, stats, title: (doc.querySelector('title') || {}).textContent || '' };
  }
  window.ToolityTagScan = { SIG, CMP, CATS, STORAGE, scan, parseConsentCalls, corpusFromHtml, gtmData };
})();
