import type { AppProps } from "next/app";
import { QueryClient } from "@tanstack/query-core";
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
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persister ? { persister } : { persister: null }}
    >
      <Component {...pageProps} />
    </PersistQueryClientProvider>
  );
}

export default MyApp;
