import type { NextApiRequest, NextApiResponse } from "next";
import {
  TweetV2,
  TweetV2UserLikedTweetsPaginator,
  TwitterApi,
} from "twitter-api-v2";

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
  // const cacheKey = `${handle}.json`;
  // const fsCached = await fs.promises
  //   .readFile(cacheKey)
  //   .then<TweetV2[]>((r) => JSON.parse(r.toString()))
  //   .catch(() => null);
  // if (fsCached) {
  //   res.status(200).json(fsCached);
  //   return;
  // }

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

  const paginationToken = req.query.token
    ? Array.isArray(req.query.token)
      ? req.query.token[0]
      : req.query.token
    : undefined;

  try {
    console.log("Fetching page", paginationToken);
    let result: TweetV2UserLikedTweetsPaginator =
      await twitterClient.v2.userLikedTweets(uid, {
        max_results: 100,
        "tweet.fields": ["created_at"],
        "user.fields": ["username"],
        pagination_token: paginationToken,
      });

    let p = 0;
    while (p < 5 && !result.done) {
      console.log("Fetching additional pages:", p, result.meta.next_token);
      result = await result.fetchNext();
      p += 1;
    }

    res.status(200).json({
      next: result.meta.next_token,
      previous: result.meta.previous_token,
      tweets: result.tweets,
      count: result.meta.result_count,
    });
  } catch (e) {
    console.error("Could not fetch user id", e);
    res.status(500).json(e);
    return;
  }
}
