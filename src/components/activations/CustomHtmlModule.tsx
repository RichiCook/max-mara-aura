import { CustomHtmlContent } from '@/hooks/useActivations';
import { useEffect, useMemo, useRef, useState } from 'react';

interface CustomHtmlModuleProps {
  content: CustomHtmlContent;
}

const HEIGHT_BRIDGE_STYLE = `
  html, body {
    margin: 0;
    padding: 0;
    min-height: 0 !important;
    height: auto !important;
    overflow: visible !important;
    background: transparent;
  }
`;

const HEIGHT_BRIDGE_SCRIPT = `
(function () {
  var lastHeight = 0;

  function getContentHeight() {
    var h = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.body ? document.body.offsetHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.documentElement ? document.documentElement.offsetHeight : 0
    );
    // Also check bounding rect of all direct children
    if (document.body) {
      var children = document.body.children;
      for (var i = 0; i < children.length; i++) {
        var rect = children[i].getBoundingClientRect();
        var bottom = rect.top + rect.height;
        if (bottom > h) h = bottom;
      }
    }
    return Math.ceil(h) || 0;
  }

  function sendHeight() {
    var h = getContentHeight();
    // Always send so parent can shrink
    lastHeight = h;
    window.parent.postMessage({ type: 'custom-html-height', height: h }, '*');
  }

  function schedule() {
    requestAnimationFrame(function () {
      requestAnimationFrame(sendHeight);
    });
  }

  window.addEventListener('load', function () {
    schedule();
    setTimeout(sendHeight, 100);
    setTimeout(sendHeight, 300);
    setTimeout(sendHeight, 600);
    setTimeout(sendHeight, 1200);
  });
  window.addEventListener('resize', schedule);

  document.addEventListener('click', function () {
    schedule();
    setTimeout(sendHeight, 50);
    setTimeout(sendHeight, 150);
    setTimeout(sendHeight, 350);
    setTimeout(sendHeight, 700);
  }, true);
  document.addEventListener('input', schedule, true);
  document.addEventListener('change', schedule, true);
  document.addEventListener('transitionend', function () {
    schedule();
    setTimeout(sendHeight, 50);
  }, true);
  document.addEventListener('animationend', schedule, true);

  // Watch for images loading
  document.addEventListener('load', function (e) {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'IFRAME')) {
      schedule();
      setTimeout(sendHeight, 100);
    }
  }, true);

  // Font readiness
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      schedule();
      setTimeout(sendHeight, 100);
    });
  }

  // MutationObserver
  if (document.body) {
    new MutationObserver(function () {
      schedule();
      setTimeout(sendHeight, 50);
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }

  // ResizeObserver
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(schedule);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
  }

  // Periodic fallback
  setInterval(sendHeight, 2000);
  schedule();
})();
`;

const injectEnhancements = (markup: string, css?: string) => {
  const styleTag = `<style>${HEIGHT_BRIDGE_STYLE}${css ? `\n${css}` : ''}</style>`;
  const scriptTag = `<script>${HEIGHT_BRIDGE_SCRIPT}<\/script>`;

  let nextMarkup = markup;

  if (nextMarkup.includes('</head>')) {
    nextMarkup = nextMarkup.replace('</head>', `${styleTag}</head>`);
  } else {
    nextMarkup = `${styleTag}${nextMarkup}`;
  }

  if (nextMarkup.includes('</body>')) {
    nextMarkup = nextMarkup.replace('</body>', `${scriptTag}</body>`);
  } else {
    nextMarkup = `${nextMarkup}${scriptTag}`;
  }

  return nextMarkup;
};

const buildSrcDoc = (html?: string, css?: string) => {
  if (!html) return '';

  const hasFullDocument = /<html[\s>]|<body[\s>]|<!doctype/i.test(html);

  if (hasFullDocument) {
    return injectEnhancements(html, css);
  }

  return injectEnhancements(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    ${html}
  </body>
</html>`, css);
};

export const CustomHtmlModule = ({ content }: CustomHtmlModuleProps) => {
  const { html, css } = content;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);

  const srcDoc = useMemo(() => buildSrcDoc(html, css), [html, css]);

  // Reset height when content changes
  useEffect(() => {
    setHeight(0);
  }, [srcDoc]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      if (event.data?.type !== 'custom-html-height') return;

      const reportedHeight = event.data.height;
      if (typeof reportedHeight === 'number' && reportedHeight > 0) {
        setHeight(reportedHeight);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!html) return null;

  return (
    <div>
      <iframe
        ref={iframeRef}
        title="Custom HTML activation"
        srcDoc={srcDoc}
        className="w-full border-0 bg-transparent"
        style={{
          overflow: 'hidden',
          height: height > 0 ? `${height}px` : '0px',
          display: height > 0 || !srcDoc ? 'block' : 'block',
        }}
        scrolling="no"
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
};
