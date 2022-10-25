import Head from "next/head";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ComponentType, useState } from "react";
import { type TweetV2 } from "twitter-api-v2";
import type * as icons from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";

const HeroIcon = ({
  name,
  className = "h-6 w-6",
}: {
  name: keyof typeof icons;
  className?: string;
}) => {
  const Icon: ComponentType<{ className: string }> = dynamic(() =>
    import("@heroicons/react/24/solid").then((mod) => mod[name])
  );

  return <Icon className={className} aria-hidden={true} />;
};

export default function Home() {
  const [handle, setHandle] = useState<string>();
  const [page, setPage] = useState(0);
  const likesQuery = useQuery(["likes", handle], {
    enabled: !!handle,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retryOnMount: false,
    retry: false,
    queryFn: ({ queryKey: [, value] }) =>
      fetch(
        `/api/twitter-likes?handle=${encodeURIComponent(value ?? "")}`,
        {}
      ).then<TweetV2[]>((r) => {
        if (r.status > 399)
          return r.text().then((t) => {
            console.log(t);
            throw new Error(t);
          });
        return r.json();
      }),
  });

  return (
    <div>
      <Head>
        <title>Twitter likes explorer</title>
      </Head>

      <main className="h-screen w-screen flex flex-col items-center gap-8">
        <h1 className="mt-8 text-4xl font-black text-black">
          Twitter Likes Explorer
        </h1>
        <div className="flex items-center gap-2">
          <label className="font-bold text-black" htmlFor="handle">
            Handle
          </label>
          <input
            type="text"
            name="handle"
            placeholder="tintin"
            onKeyDown={(e) =>
              e.key === "Enter" && setHandle(e.currentTarget.value)
            }
            className="py-2 px-4 rounded-xl border"
          />
        </div>
        {likesQuery.isError && (
          <div className="p-4 rounded-xl bg-red-500 text-white flex flex-col gap-2 w-[400px]">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <HeroIcon name="ExclamationTriangleIcon" />
              <span>Error querying</span>
            </h2>
            <p className="whitespace-prewrap font-mono rounded text-xs p-2 bg-white text-gray-500">
              {JSON.stringify(likesQuery.error, null, 2)}
            </p>
          </div>
        )}
        {likesQuery.isFetching && <div>Loading...</div>}
        <div className="flex relative flex-col gap-4 max-w-[600px]">
          {likesQuery.data?.slice(page, page + 100).map((it) => (
            <div
              key={it.id}
              className="flex rounded-xl p-4 bg-white shadow-sm border flex-col gap-2"
            >
              <span className="text-black">{it.author_id}</span>
              <p>{it.text}</p>
              <a href={`https://twitter.com/twitter/status/${it.id}`}>
                <HeroIcon name="LinkIcon" />
              </a>
            </div>
          ))}
          <div className="absolute bottom-4 right-4">
            <button
              onClick={() =>
                setPage(
                  Math.min(page + 100, (likesQuery.data?.length ?? 1e6) - 100)
                )
              }
            >
              <HeroIcon name="PlusCircleIcon" />
            </button>
            <button onClick={() => setPage(Math.max(0, page - 100))}>
              <HeroIcon name="MinusCircleIcon" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
