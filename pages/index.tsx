import Head from "next/head";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as React from "react";
import { ComponentType, useState } from "react";
import { type TweetV2 } from "twitter-api-v2";
import type * as icons from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import Fuse from "fuse.js";
import classNames from "classnames";
import { TwitterTweetEmbed } from "react-twitter-embed";
import useLocalStorage from "../lib/useLocalStorage";

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
  includeScore: true,
  shouldSort: true,
  // search params
  ignoreLocation: true,
  // location: 0,
  // distance: 20,
  threshold: 0.3,
});
const pageSize = 10;

export default function Home() {
  const [handle, setHandle] = useLocalStorage<string | undefined>(
    "handle",
    undefined
  );
  const [validHandle, setvalidHandle] = useState(false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);
  const [sort, setSort] = useState<"date" | "score">("score");
  const [results, setResults] = useState<Fuse.FuseResult<TweetV2>[]>([]);
  const [page, setPage] = useState(0);
  const likesQuery = useInfiniteQuery(["likes", handle], {
    enabled: !!handle && validHandle,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retryOnMount: false,
    retry: false,
    keepPreviousData: true,
    queryFn: ({ queryKey: [, values] }) =>
      fetch(`/api/twitter-likes?handle=${encodeURIComponent(values ?? "")}`)
        .then<{ next?: string; tweets: TweetV2[] }>((r) => {
          if (r.status > 399)
            return r.text().then((t) => {
              console.log(t);
              throw new Error(t);
            });
          return r.json();
        })
        .then((r) => {
          console.log("Adding tweets to fuse: new", r.tweets.length);
          r.tweets.forEach((t) => fuse.add(t));
          setResults(fuse.search(""));
          return r;
        }),
    getNextPageParam: (qkey, opts) => qkey.next,
  });

  return (
    <div>
      <Head>
        <title>Twitter likes explorer</title>
        <meta property="og:url" content="https://www.002fa7.net" />
        <meta property="og:title" content="Twitter Likes Explorer" />
        <meta
          property="og:description"
          content="A personal tool to search my liked tweets."
        />
        <meta property="og:image" content="https://www.002fa7.net/og.png" />
      </Head>

      <main className="h-screen w-screen flex flex-col items-center gap-8 px-4">
        <h1 className="mt-8 text-4xl font-black text-black">
          Twitter Likes Explorer
        </h1>
        <p className="prose max-w-[480px]">
          This is a personal tiny tool to be able to browse the tweets I&apos;ve
          personally liked.
          <br />
          The API key is subjected to a 75 query / 15min quota, which is quickly
          running out.
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
            value={handle ?? ""}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setvalidHandle(true)}
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
            <p className="whitespace-pre-wrap overflow-hidden font-mono rounded text-xs p-2 bg-white text-gray-500">
              {JSON.stringify(
                // @ts-ignore
                JSON.parse(likesQuery.error?.message ?? ""),
                null,
                2
              )}
            </p>
          </div>
        )}
        {likesQuery.isFetching && <div>Loading...</div>}
        {likesQuery.data && (
          <>
            <div className="flex items-center justify-between gap-4">
              <p>
                Found{" "}
                <span className="text-black font-bold">
                  {likesQuery.data.pages
                    .flatMap((it) => it.tweets)
                    .length.toLocaleString()}
                </span>{" "}
                tweets liked
              </p>
              {likesQuery.data &&
                likesQuery.data.pages.length > 0 &&
                !likesQuery.isFetching &&
                likesQuery.hasNextPage && (
                  <button
                    className="px-4 py-1 rounded-full bg-black text-white shadow hover:shadow-lg"
                    onClick={() => likesQuery.fetchNextPage()}
                  >
                    Fetch next
                  </button>
                )}
            </div>
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
                    const s = e.target.value;
                    if (s) setResults(fuse.search(s));
                    else {
                      setResults(
                        likesQuery.data?.pages.flatMap((it) =>
                          it.tweets.flatMap((t) => ({
                            item: t,
                            refIndex: 0,
                          }))
                        ) ?? []
                      );
                    }

                    return s;
                  })
                }
                className="py-2 px-4 rounded-xl border placeholder:text-gray-200"
              />
            </div>

            {search && (
              <div>
                Found{" "}
                <span className="text-black font-bold">
                  {results.length.toLocaleString()}
                </span>{" "}
                tweets liked matching &ldquo;
                <span className="text-blue-400">{search}</span>&rdquo;
              </div>
            )}
            {results?.length > 0 && (
              <div className="flex items-center gap-4">
                <button
                  className="rounded-full py-1 px-2 gap-2 flex items-center justify-center text-white bg-gray-500 hover:bg-opacity-80 focus:ring"
                  onClick={() => setPreview(!preview)}
                >
                  <HeroIcon name={preview ? "EyeSlashIcon" : "EyeIcon"} />
                  <span className="text-xs">
                    {preview ? "simple" : "embedded tweets"}
                  </span>
                </button>
                <button
                  className="rounded-full px-2  py-1 gap-2 flex items-center justify-center text-white bg-gray-500 hover:bg-opacity-80 focus:ring"
                  onClick={() => {
                    setSort(sort === "date" ? "score" : "date");
                    setResults((r) =>
                      r.sort((a, b) =>
                        sort === "date"
                          ? (a.item.created_at ?? "") <
                            (b.item.created_at ?? "")
                            ? 1
                            : -1
                          : (a.score ?? 0) < (b.score ?? 0)
                          ? 1
                          : -1
                      )
                    );
                  }}
                >
                  <HeroIcon
                    name={
                      sort === "date" ? "CalendarIcon" : "MagnifyingGlassIcon"
                    }
                  />
                  <span className="text-xs">
                    {sort === "date" ? "sort by score" : "sort by date"}
                  </span>
                </button>
              </div>
            )}

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
              {results
                ?.slice(page, page + pageSize)
                .map(({ item: it, score }) =>
                  preview ? (
                    <TwitterTweetEmbed
                      key={it.id}
                      tweetId={it.id}
                      placeholder={<TweetPreview t={it} />}
                    />
                  ) : (
                    <TweetPreview key={it.id} t={it} />
                  )
                )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function TweetPreview({ t }: { t: TweetV2 }) {
  return (
    <div className="flex p-4 sm:w-[600px] flex-col gap-4 bg-white rounded-xl border">
      <p className="whitespace-pre-wrap">{t.text}</p>
      <div className="flex justify-between items-center text-sm w-full gap-2">
        {t.created_at && (
          <span className="text-gray-200">
            {new Date(t.created_at).toLocaleString()}
          </span>
        )}
        <a
          className="flex items-center gap-2 underline hover:text-black"
          href={`https://twitter.com/twitter/status/${t.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <HeroIcon name="LinkIcon" />
          Visit on twitter
        </a>
      </div>
    </div>
  );
}
