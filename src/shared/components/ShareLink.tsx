import { useEffect, useState } from 'react';
import styles from './ShareLink.module.css';

/**
 * Copies the current URL, which carries the whole setup — algorithm, size,
 * input shape and the seed the input was generated from. Anyone opening the
 * link sees the identical run rather than a fresh random one.
 */
export function ShareLink({ label = 'Copy link' }: { label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the URL is still in the address bar.
      setCopied(false);
    }
  };

  return (
    <button
      className={copied ? styles.copied : undefined}
      onClick={copy}
      title="Copy a link that reproduces this exact setup"
    >
      {copied ? '✓ Copied' : label}
    </button>
  );
}
