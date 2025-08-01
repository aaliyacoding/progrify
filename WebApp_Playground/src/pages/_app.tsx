import { CloudProvider } from "@/cloud/useCloud";
import "@livekit/components-styles/components/participant";
import "@/styles/home.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ToastProvider } from "@/components/toast/ToasterProvider";
import { ConfigProvider } from "@/hooks/useConfig";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CloudProvider>
      <ToastProvider>
        <ConfigProvider>
          <Component {...pageProps} />
        </ConfigProvider>
      </ToastProvider>
    </CloudProvider>
  );
}
