import type { AppProps } from "next/app";
import { QueryClient } from "@tanstack/query-core";
import { QueryClientProvider } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
  PersistQueryClientProvider,
  persistQueryClientRestore,
} from "@tanstack/react-query-persist-client";

import "styles/globals.css";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { cacheTime: Infinity } },
});

const persister =
  typeof window !== "undefined"
    ? createSyncStoragePersister({
        storage: window.localStorage,
      })
    : undefined;

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (persister) {
      console.log("restoring state");
      persistQueryClientRestore({ queryClient, persister }).catch((err) =>
        console.error(err)
      );
    }
  }, []);

  return persister ? (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: Infinity,
      }}
    >
      <Component {...pageProps} />
      <Analytics />
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <Analytics />
    </QueryClientProvider>
  );
}

export default MyApp;
