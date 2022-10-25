import type { NextApiRequest, NextApiResponse } from "next";
import {
  TweetV2,
  TweetV2UserLikedTweetsPaginator,
  TwitterApi,
  TwitterErrorPayload,
} from "twitter-api-v2";
import * as fs from "fs";

const twitterKey = process.env.TWITTER_KEY;
if (!twitterKey) throw new Error("TWITTER_KEY not found in env");
const twitterClient = new TwitterApi(twitterKey).readOnly;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TweetV2[] | any>
) {
  if (req.method?.toLowerCase() !== "get") {
    res.status(405).end();
    return;
  }
  const handleQp = req.query.handle;
  if (!handleQp) {
    res.status(400).end();
    return;
  }

  const handle = Array.isArray(handleQp) ? handleQp[0] : handleQp;
  const cacheKey = `${handle}.json`;
  const fsCached = await fs.promises
    .readFile(cacheKey)
    .then<TweetV2[]>((r) => JSON.parse(r.toString()))
    .catch(() => null);
  if (fsCached) {
    res.status(200).json(fsCached);
    return;
  }

  let uid;
  try {
    const userQuery = await twitterClient.v2.userByUsername(handle, {
      "user.fields": ["id"],
    });
    uid = userQuery.data.id;
  } catch (e) {
    console.error("Could not fetch user id", e);
    res.status(500).json(e);
    return;
  }

  let result: TweetV2UserLikedTweetsPaginator =
    await twitterClient.v2.userLikedTweets(uid, {
      max_results: 100,
      "tweet.fields": ["created_at"],
    });

  while (!result.done) {
    console.log("Loading new page, # tweets loaded:", result.tweets.length);
    try {
      result = await result.fetchNext();
    } catch (e) {
      console.error(e);
      res.status(500).json(e);
      return;
    }
  }

  const tweets = result.tweets.sort(({ created_at: a }, { created_at: b }) => {
    return (a ?? "") < (b ?? "") ? 1 : -1;
  });
  fs.promises.writeFile(cacheKey, JSON.stringify(tweets));

  res.status(200).json(tweets);
}
