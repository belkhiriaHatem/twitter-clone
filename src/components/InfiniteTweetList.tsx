import Link from "next/link";
import React from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import ProfileImage from "./ProfileImage";
import { useSession } from "next-auth/react";
import { VscHeartFilled, VscHeart } from "react-icons/vsc";
import IconHoverFx from "./IconHoverFx";
import { api } from "~/utils/api";
import LoadingSpinner from "./LoadingSpinner";

type Tweet = {
  id: string;
  content: string;
  createdAt: Date;
  likeCount: number;
  likeByMe: boolean;
  user: {
    id: string;
    image: string | null;
    name: string | null;
  };
};
type Props = {
  tweets?: Tweet[];
  isError: boolean;
  isLoading: boolean;
  hasMore: boolean | undefined;
  fetchNewTweets: () => Promise<unknown>;
};

export default function InfiniteTweetList({
  tweets,
  fetchNewTweets,
  hasMore = false,
  isError,
  isLoading,
}: Props) {
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <h1>Error :/...</h1>;
  if (tweets == null || tweets.length == 0)
    return (
      <h1 className="flex justify-center p-4 text-lg text-gray-500">
        No Tweets
      </h1>
    );
  return (
    <ul>
      <InfiniteScroll
        dataLength={tweets.length}
        next={fetchNewTweets}
        hasMore={hasMore}
        loader={<LoadingSpinner />}
      >
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} {...tweet} />
        ))}
      </InfiniteScroll>
    </ul>
  );
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
});

function TweetCard({
  id,
  user,
  content,
  createdAt,
  likeCount,
  likeByMe,
}: Tweet) {
  const trpcUtils = api.useContext();
  const toggleLike = api.tweet.toggleLike.useMutation({
    onSuccess: ({ addedLike }) => {
      const updateData: Parameters<
        typeof trpcUtils.tweet.infiniteFeed.setInfiniteData
      >[1] = (oldData) => {
        if (oldData == null) return;
        const countModifier = addedLike ? 1 : -1;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => {
            return {
              ...page,
              tweets: page.tweets.map((tweet) => {
                if (tweet.id === id) {
                  return {
                    ...tweet,
                    likeCount: tweet.likeCount + countModifier,
                    likeByMe: addedLike,
                  };
                }
                return tweet;
              }),
            };
          }),
        };
      };
      trpcUtils.tweet.infiniteFeed.setInfiniteData({}, updateData);
      trpcUtils.tweet.infiniteFeed.setInfiniteData(
        { onlyFollowing: true },
        updateData
      );
      trpcUtils.tweet.infiniteProfileFeed.setInfiniteData(
        { userId: user.id },
        updateData
      );
    },
  });

  function handleToggleLike() {
    toggleLike.mutate({ id });
  }
  return (
    <li className="flex gap-4 border-b px-4 py-4">
      <Link href={`/profiles/${user.id}`}>
        <ProfileImage src={user.image} />
      </Link>
      <div className="flex flex-grow flex-col">
        <div className="flex gap-1">
          <Link
            href={`/profiles/${user.id}`}
            className="font-bold outline-none hover:underline focus-visible:underline"
          >
            {user.name}
          </Link>
          <span className="text-gray-500">-</span>
          <span className="text-gray-500">
            {dateTimeFormatter.format(createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap">{content}</p>
        <HeartButton
          onClick={handleToggleLike}
          isLoading={toggleLike.isLoading}
          likeByMe={likeByMe}
          likeCount={likeCount}
        />
      </div>
    </li>
  );
}

type heartBtnProps = {
  likeByMe: boolean;
  likeCount: number;
  isLoading: boolean;
  onClick: () => void;
};

function HeartButton({
  likeByMe,
  likeCount,
  onClick,
  isLoading,
}: heartBtnProps) {
  const session = useSession();
  const HeartIcon = likeByMe ? VscHeartFilled : VscHeart;

  if (session.status != "authenticated") {
    return (
      <div className="mb-1 mt-1 flex items-center gap-3 self-start text-gray-500">
        <HeartIcon />
        <span>{likeCount}</span>
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`group -ml-2 flex items-center gap-1 self-start transition-colors duration-200 ${
        likeByMe ? "text-red-500" : "text-gray-500"
      } hover:text-red-500 focus-visible:text-red-500`}
    >
      <IconHoverFx red={true}>
        <HeartIcon
          className={`transition-colors duration-200 ${
            likeByMe ? "fill-red-500" : "fill-gray-500"
          } group-hover:fill-red-500 group-focus-visible:fill-red-500`}
        />
      </IconHoverFx>
      <span>{likeCount}</span>
    </button>
  );
}
