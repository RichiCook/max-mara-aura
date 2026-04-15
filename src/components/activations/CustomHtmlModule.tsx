import { CustomHtmlContent } from '@/hooks/useActivations';
import { useEffect, useMemo, useRef } from 'react';

interface CustomHtmlModuleProps {
  content: CustomHtmlContent;
}

const HEIGHT_BRIDGE_STYLE = `
  html, body {
    margin: 0;
    padding: 0;
    min-height: auto !important;
    overflow: visible !important;
  }
`;

const HEIGHT_BRIDGE_SCRIPT = `
(function () {
  const getHeight = () => {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      html ? html.scrollHeight : 0,
      html ? html.offsetHeight : 0,
      html ? html.clientHeight : 0
    );
  };

  const sendHeight = () => {
    window.parent.postMessage(
      { type: 'custom-html-module-height', height: getHeight() },
      '*'
    );
  };

  const scheduleHeightSync = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(sendHeight);
    });
  };

  window.addEventListener('load', scheduleHeightSync);
  window.addEventListener('resize', scheduleHeightSync);
  document.addEventListener('click', () => {
    scheduleHeightSync();
    setTimeout(sendHeight, 150);
    setTimeout(sendHeight, 350);
    setTimeout(sendHeight, 700);
  }, true);
  document.addEventListener('transitionend', scheduleHeightSync, true);
  document.addEventListener('animationend', scheduleHeightSync, true);
  document.addEventListener('input', scheduleHeightSync, true);

  if (document.body) {
    new MutationObserver(scheduleHeightSync).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(scheduleHeightSync);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }

  setInterval(sendHeight, 1000);
  scheduleHeightSync();
})();
`;

const injectEnhancements = (markup: string, css?: string) => {
  const styleTag = `<style>${HEIGHT_BRIDGE_STYLE}${css ? `\n${css}` : ''}</style>`;
  const scriptTag = `<script>${HEIGHT_BRIDGE_SCRIPT}</script>`;

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

  const srcDoc = useMemo(() => buildSrcDoc(html, css), [html, css]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      if (event.data?.type !== 'custom-html-module-height') return;

      const nextHeight = Math.max(Number(event.data.height) || 0, 120);
      iframe.style.height = `${nextHeight}px`;
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const syncHeightFallback = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;

    const nextHeight = Math.max(
      doc.body?.scrollHeight || 0,
      doc.body?.offsetHeight || 0,
      doc.documentElement?.scrollHeight || 0,
      doc.documentElement?.offsetHeight || 0,
      120,
    );

    iframe.style.height = `${nextHeight}px`;
  };

  if (!html) return null;

  return (
    <section className="py-12">
      <iframe
        ref={iframeRef}
        title="Custom HTML activation"
        srcDoc={srcDoc}
        onLoad={() => {
          syncHeightFallback();
          setTimeout(syncHeightFallback, 150);
          setTimeout(syncHeightFallback, 400);
        }}
        className="w-full border-0 bg-transparent overflow-hidden"
        style={{ overflow: 'hidden', height: '120px' }}
        scrolling="no"
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
      />
    </section>
  );
};