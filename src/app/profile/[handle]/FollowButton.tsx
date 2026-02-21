"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "~/server/actions";

export function FollowButton({
  targetUserId,
  targetHandle,
  initialFollowing,
}: {
  targetUserId: string;
  targetHandle: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      if (following) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      setFollowing((prev) => !prev);
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`rounded-full px-6 py-2 text-sm font-semibold transition-all disabled:opacity-60 ${
        following
          ? "border border-charcoal/20 bg-transparent text-charcoal/70 hover:border-red-300 hover:text-red-400"
          : "bg-sage text-white shadow-lg shadow-sage/20 hover:scale-105 hover:bg-sage/90 active:scale-95"
      }`}
    >
      {isPending ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}
