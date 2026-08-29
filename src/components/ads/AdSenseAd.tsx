import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

// Google AdSense publisher and ad unit. The loader is created only after an
// eligible publisher-content page mounts this component; it is not present in
// the site-wide HTML shell.
const ADSENSE_CLIENT = 'ca-pub-2674524487916692';
const ADSENSE_SLOT = '4529179585';
const ADSENSE_SCRIPT_ID = 'studyainow-adsense-loader';

let adsenseLoader: Promise<void> | undefined;

function loadAdSense() {
  if (adsenseLoader) return adsenseLoader;

  adsenseLoader = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(ADSENSE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.adsbygoogle) resolve();
      else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('AdSense failed to load')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('AdSense failed to load')), { once: true });
    document.head.appendChild(script);
  });

  return adsenseLoader;
}

export function AdSenseAd({ className = '' }: { className?: string }) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const element = insRef.current;
    if (!element || element.dataset.adsenseInitialized === 'true') return;
    element.dataset.adsenseInitialized = 'true';
    let active = true;

    loadAdSense()
      .then(() => {
        if (!active) return;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      })
      .catch(() => {
        // A blocked or unavailable advertising request must not affect access
        // to the publisher content around it.
      });

    return () => { active = false; };
  }, []);

  return (
    <div className={className}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
