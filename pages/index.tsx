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
import Link from "next/link";
import SpinIcon from "../lib/SpinIcon";

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

// XXX: wish there was a hook on react-query's rehydration, but in the meantime this
// monstrosity will do.
const cachedTweets =
  typeof window !== "undefined"
    ? JSON.parse(
        window.localStorage.getItem("REACT_QUERY_OFFLINE_CACHE") ?? "{}"
      )?.clientState?.queries[0]?.state.data.pages.flatMap(
        (it: any) => it.tweets
      ) ?? []
    : [];

const fuse = new Fuse<TweetV2>(cachedTweets, {
  keys: ["text"],
  isCaseSensitive: false,
  includeScore: true,
  shouldSort: true,
  // search params
  ignoreLocation: true,
  threshold: 0.3,
});
const pageSize = 10;

export default function Home() {
  const [handle, setHandle] = useLocalStorage<string | undefined>(
    "handle",
    undefined
  );
  const [validHandle, setvalidHandle] = useState(!!handle);
  const [searchQuery, setSearchQuery] = useState("");

  const [showFancyTwitterEmbed, setShowFancyTwitterEmbed] = useState(false);
  const [sortType, setSortType] = useState<"date" | "score">("score");

  const [results, setResults] = useState(() => fuse.search(""));
  const [page, setPage] = useState(0);

  const likesQuery = useInfiniteQuery(["likes", handle], {
    enabled: !!handle && validHandle,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retryOnMount: false,
    retry: false,
    keepPreviousData: true,
    queryFn: ({ queryKey: [, values], pageParam }) =>
      fetch(
        `/api/twitter-likes?${new URLSearchParams({
          handle: handle ?? "",
          ...(pageParam ? { token: pageParam } : {}),
        })}`
      )
        .then<{
          next?: string;
          previous?: string;
          tweets: TweetV2[];
        }>((r) => {
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
    getNextPageParam: (data) => data.next,
    getPreviousPageParam: (data) => data.previous,
  });

  return (
    <div>
      <Head>
        <title>Twitter Likes Explorer</title>
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
        <div className="flex items-center gap-2">
          <label className="font-bold text-black" htmlFor="handle">
            Handle
          </label>
          <div className="relative">
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
            {likesQuery.isFetching && (
              <div className="absolute top-1/2 -translate-y-1/2 right-2">
                <SpinIcon height={24} className="animate-spin" />
              </div>
            )}
          </div>
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
        {likesQuery.data && (
          <>
            <div className="flex items-center justify-between gap-4">
              <p>
                Loaded{" "}
                <span className="text-black font-bold">
                  {likesQuery.data.pages
                    .flatMap((it) => it.tweets)
                    .length.toLocaleString()}
                </span>{" "}
                tweets.
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
                  setSearchQuery(() => {
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

            {searchQuery && (
              <div>
                Found{" "}
                <span className="text-black font-bold">
                  {results.length.toLocaleString()}
                </span>{" "}
                tweets liked matching &ldquo;
                <span className="text-blue-400">{searchQuery}</span>&rdquo;
              </div>
            )}
            {results?.length > 0 && (
              <div className="flex items-center gap-4">
                <button
                  className="rounded-full py-1 px-2 gap-2 flex items-center justify-center text-white bg-gray-500 hover:bg-opacity-80 focus:ring"
                  onClick={() =>
                    setShowFancyTwitterEmbed(!showFancyTwitterEmbed)
                  }
                >
                  <HeroIcon
                    name={showFancyTwitterEmbed ? "EyeIcon" : "EyeSlashIcon"}
                  />
                  <span className="text-xs">
                    {showFancyTwitterEmbed ? "embedded tweets" : "simple"}
                  </span>
                </button>
                <button
                  className="rounded-full px-2  py-1 gap-2 flex items-center justify-center text-white bg-gray-500 hover:bg-opacity-80 focus:ring"
                  onClick={() => {
                    setSortType(sortType === "date" ? "score" : "date");
                    setResults((r) =>
                      r.sort((a, b) =>
                        sortType === "date"
                          ? a.item.created_at && b.item.created_at
                            ? new Date(b.item.created_at).getTime() -
                              new Date(a.item.created_at).getTime()
                            : 0
                          : (b.score ?? 0) - (a.score ?? 0)
                      )
                    );
                  }}
                >
                  <HeroIcon
                    name={
                      sortType === "date"
                        ? "CalendarIcon"
                        : "MagnifyingGlassIcon"
                    }
                  />
                  <span className="text-xs">
                    {sortType === "date"
                      ? "sorting by date"
                      : "sorting by score"}
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
                  showFancyTwitterEmbed ? (
                    <TwitterTweetEmbed
                      key={it.id}
                      tweetId={it.id}
                      placeholder={<TweetPreview t={it} score={score} />}
                    />
                  ) : (
                    <TweetPreview key={it.id} t={it} score={score} />
                  )
                )}
            </div>
          </>
        )}

        <div className="mt-auto pb-8 flex flex-col items-center gap-4">
          <Link href="/about">
            <a className="underline">About</a>
          </Link>

          {likesQuery.data && (
            <button
              className="hover:text-gray-400 flex items-center gap-2"
              onClick={() => {
                fuse.remove(() => true);
                fuse.setCollection([]);
                setSearchQuery("");
                setvalidHandle(false);
                setHandle("");
                setPage(0);
                setResults([]);
                likesQuery.remove();
                window.location.reload();
              }}
            >
              <HeroIcon name="TrashIcon" />
              <span>Delete local caches</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function TweetPreview({ t, score }: { t: TweetV2; score?: number }) {
  return (
    <div className="flex p-4 sm:w-[500px] h-fit flex-col gap-4 bg-white rounded-xl border-2 border-gray-100">
      <p className="whitespace-pre-wrap">{t.text}</p>
      <div className="flex justify-between items-center text-sm w-full gap-2">
        {t.created_at && (
          <span className="text-gray-300">
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
      {score && (
        <p className="text-sm text-gray-300">
          Search score (lower is better):{" "}
          <span className="font-bold">{score.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}
