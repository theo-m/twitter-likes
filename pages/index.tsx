import Head from "next/head";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ComponentType, useState } from "react";
import { type TweetV2 } from "twitter-api-v2";
import type * as icons from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import Fuse from "fuse.js";
import classNames from "classnames";
import { TwitterTweetEmbed } from "react-twitter-embed";

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

const fuse = new Fuse<TweetV2>([], {
  keys: ["text"],
  isCaseSensitive: false,
  distance: 20,
  includeScore: true,
  shouldSort: true,
});
const pageSize = 30;

export default function Home() {
  const [handle, setHandle] = useState<string>();
  const [search, setSearch] = useState<string>();
  const [results, setResults] = useState<Fuse.FuseResult<TweetV2>[]>([]);
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
    onSuccess: (d) => {
      d.forEach((t) => fuse.add(t));
      setResults(d.slice(0, 30).map((it) => ({ item: it, refIndex: 0 })));
    },
  });

  return (
    <div>
      <Head>
        <title>Twitter likes explorer</title>
      </Head>

      <main className="h-screen w-screen flex flex-col items-center gap-8 px-4">
        <h1 className="mt-8 text-4xl font-black text-black">
          Twitter Likes Explorer
        </h1>
        <p className="max-w-[400px]">
          This is a personal tiny tool to be able to browse the tweets I've
          personally liked. The API key is subjected to a 75 query / 15min
          quota, which is quickly running out.
          <br />
          Feel free to fork the project to use it on your own.
        </p>
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
            className={classNames(
              "py-2 px-4 rounded-xl border placeholder:text-gray-200",
              handle && "bg-gray-100"
            )}
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
        {likesQuery.data && (
          <div>
            Found{" "}
            <span className="text-black font-bold">
              {likesQuery.data.length.toLocaleString()}
            </span>{" "}
            tweets liked
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="font-bold text-black" htmlFor="search">
            Search
          </label>
          <input
            type="text"
            name="search"
            placeholder="border"
            onChange={(e) =>
              setSearch(() => {
                const s = e.target.value ?? "";
                const sd = fuse.search(s);
                console.log(s, sd, e.target.value);
                setResults(sd);
                return s;
              })
            }
            className="py-2 px-4 rounded-xl border placeholder:text-gray-200"
          />
        </div>

        <div>
          Found{" "}
          <span className="text-black font-bold">
            {results.length.toLocaleString()}
          </span>{" "}
          tweets liked matching &ldquo;
          <span className="text-blue-400">{search ?? "-"}</span>&rdquo;
        </div>

        {results?.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              className={classNames(
                "text-white rounded-full px-4 py-1",
                "focus:ring",
                "bg-gray-500 hover:bg-opacity-80 disabled:bg-gray-200"
              )}
              disabled={page < pageSize}
              onClick={() => setPage(page - pageSize)}
            >
              <HeroIcon name="ChevronLeftIcon" />
            </button>
            <span>
              {1 + Math.floor(page / pageSize)} /{" "}
              {Math.ceil(results.length / pageSize)}
            </span>
            <button
              className={classNames(
                "text-white rounded-full px-4 py-1",
                "focus:ring",
                "bg-gray-500 hover:bg-opacity-80 disabled:bg-gray-200"
              )}
              disabled={page + pageSize >= results.length}
              onClick={() => setPage(page + pageSize)}
            >
              <HeroIcon name="ChevronRightIcon" />
            </button>
          </div>
        )}

        <div className="flex relative flex-col gap-4 max-w-[600px]">
          {results?.slice(page, page + pageSize).map(({ item: it, score }) => (
            <div key={it.id} className="flex p-4 sm:w-[600px] flex-col gap-2">
              <TwitterTweetEmbed tweetId={it.id} placeholder={it.text} />
              <span className="text-sm text-gray-200 font-bold">
                Score: {score}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
