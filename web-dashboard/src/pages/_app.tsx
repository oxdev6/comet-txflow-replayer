import "@/styles/globals.css";
import type { AppProps } from "next/app";

import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);
  return <Component {...pageProps} />;
}
