import { CustomHtmlContent } from '@/hooks/useActivations';
import { useEffect, useRef } from 'react';

interface CustomHtmlModuleProps {
  content: CustomHtmlContent;
}

export const CustomHtmlModule = ({ content }: CustomHtmlModuleProps) => {
  const { html, css } = content;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (css && containerRef.current) {
      const styleId = `custom-css-${Math.random().toString(36).substr(2, 9)}`;
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }

      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = css;
      document.head.appendChild(styleElement);

      return () => {
        const style = document.getElementById(styleId);
        if (style) {
          style.remove();
        }
      };
    }
  }, [css]);

  // Execute scripts after HTML is injected
  useEffect(() => {
    if (!html || !containerRef.current) return;

    // Find all script tags in the injected HTML and execute them
    const scripts = containerRef.current.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Also wire up onclick attributes and other inline handlers
    const clickables = containerRef.current.querySelectorAll('[onclick]');
    clickables.forEach((el) => {
      const handler = el.getAttribute('onclick');
      if (handler) {
        (el as HTMLElement).onclick = () => {
          try {
            new Function(handler).call(el);
          } catch (e) {
            console.error('Error executing onclick handler:', e);
          }
        };
      }
    });
  }, [html]);

  if (!html) return null;

  return (
    <section className="py-12">
      <div
        ref={containerRef}
        className="custom-html-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
};
