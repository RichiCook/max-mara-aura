import { CustomHtmlContent } from '@/hooks/useActivations';
import { useEffect, useMemo, useRef } from 'react';

interface CustomHtmlModuleProps {
  content: CustomHtmlContent;
}

const buildSrcDoc = (html?: string, css?: string) => {
  if (!html) return '';

  const hasFullDocument = /<html[\s>]|<body[\s>]|<!doctype/i.test(html);

  if (hasFullDocument) {
    if (!css) return html;
    return html.includes('</head>')
      ? html.replace('</head>', `<style>${css}</style></head>`)
      : `${html}<style>${css}</style>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${css ? `<style>${css}</style>` : ''}
  </head>
  <body>
    ${html}
  </body>
</html>`;
};

export const CustomHtmlModule = ({ content }: CustomHtmlModuleProps) => {
  const { html, css } = content;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => buildSrcDoc(html, css), [html, css]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !srcDoc) return;

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let rafId: number | null = null;

    const syncHeight = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const body = doc.body;
      const htmlEl = doc.documentElement;
      const nextHeight = Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        htmlEl?.scrollHeight || 0,
        htmlEl?.offsetHeight || 0,
      );
      const h = Math.max(nextHeight, 120);
      if (iframe.style.height !== `${h}px`) {
        iframe.style.height = `${h}px`;
      }
    };

    const debouncedSync = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncHeight);
    };

    const handleLoad = () => {
      syncHeight();
      const doc = iframe.contentDocument;
      if (!doc) return;

      resizeObserver = new ResizeObserver(debouncedSync);
      resizeObserver.observe(doc.body);
      resizeObserver.observe(doc.documentElement);

      // Watch for DOM changes (expand/collapse, dynamic content)
      mutationObserver = new MutationObserver(debouncedSync);
      mutationObserver.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden', 'open'],
      });

      // Listen to transition/animation ends inside iframe
      doc.addEventListener('transitionend', debouncedSync);
      doc.addEventListener('animationend', debouncedSync);
      // Click may trigger expand — re-measure after
      doc.addEventListener('click', () => {
        debouncedSync();
        setTimeout(syncHeight, 300);
        setTimeout(syncHeight, 600);
      });
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [srcDoc]);

  if (!html) return null;

  return (
    <section className="py-12">
      <iframe
        ref={iframeRef}
        title="Custom HTML activation"
        srcDoc={srcDoc}
        className="w-full border-0 bg-transparent"
        sandbox="allow-scripts allow-forms allow-popups allow-modals"
      />
    </section>
  );
};
