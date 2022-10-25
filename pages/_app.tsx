import type { AppProps } from "next/app";
import { QueryClient } from "@tanstack/query-core";
import { QueryClientProvider } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import "styles/globals.css";

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
  return persister ? (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: Infinity }}
    >
      <Component {...pageProps} />
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}

export default MyApp;
