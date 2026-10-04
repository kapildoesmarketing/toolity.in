/* Designed by Kapil Pidhwani: Network-agnostic ad loader for Toolity.in
 *
 * Markup:  <div class="ad-unit" data-ad-slot="tool-below-workspace"></div>
 * Config:  SLOTS below. Switching ad networks = edit this file (and /ads.txt).
 *
 * Why this exists: vendor snippets were copy-pasted into the partial and two
 * units raced on the same global `atOptions`. Now each unit is rendered
 * sequentially, picking exactly one creative size for the current viewport.
 */
(function () {
  'use strict';

  const MOBILE_BREAKPOINT = 768; // ad creative width (728 vs 320 banner), independent of the nav breakpoint

  // Slot name -> per-viewport creative. Add 'adsense' etc. here later.
  const SLOTS = {
    'tool-below-workspace': {
      desktop: { network: 'adsterra', key: '173f3c31e644a6feb61843877787aa01', width: 728, height: 90 },
      mobile:  { network: 'adsterra', key: 'd494b0cbcfa90ae4f358b33b28092221', width: 320, height: 50 }
    }
  };

  // One renderer per network. Must return a Promise that resolves when the
  // vendor script has loaded (or failed) so the next unit can start safely.
  const NETWORKS = {
    adsterra(unit, creative) {
      return new Promise((resolve) => {
        window.atOptions = { key: creative.key, format: 'iframe', height: creative.height, width: creative.width, params: {} };
        const s = document.createElement('script');
        s.src = `https://www.highrevenueformat.com/${creative.key}/invoke.js`;
        s.onload = s.onerror = resolve;
        unit.appendChild(s);
      });
    }
    // adsense(unit, creative) { ... }  <- future
  };

  function render() {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const units = document.querySelectorAll('.ad-unit[data-ad-slot]:not([data-ad-rendered])');
    let chain = Promise.resolve();
    units.forEach((unit) => {
      const slot = SLOTS[unit.dataset.adSlot];
      const creative = slot && (isMobile ? slot.mobile : slot.desktop);
      if (!creative || !NETWORKS[creative.network]) return;
      unit.dataset.adRendered = creative.network;
      // Reserve space before the creative arrives (CLS protection).
      unit.style.minHeight = creative.height + 'px';
      unit.style.maxWidth = creative.width + 'px';
      chain = chain.then(() => NETWORKS[creative.network](unit, creative));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
