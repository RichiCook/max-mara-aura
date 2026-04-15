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
      iframe.style.height = `${Math.max(nextHeight, 120)}px`;
    };

    const handleLoad = () => {
      syncHeight();
      const doc = iframe.contentDocument;
      if (!doc) return;

      const observer = new ResizeObserver(() => syncHeight());
      observer.observe(doc.body);
      observer.observe(doc.documentElement);

      iframe.dataset.resizeObserverAttached = 'true';
      (iframe as HTMLIFrameElement & { __cleanup?: () => void }).__cleanup = () => observer.disconnect();
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      (iframe as HTMLIFrameElement & { __cleanup?: () => void }).__cleanup?.();
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
