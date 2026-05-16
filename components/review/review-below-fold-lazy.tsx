"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const ReviewDelayedModal = dynamic(
  () =>
    import("@/components/review/review-delayed-modal").then((m) => ({
      default: m.ReviewDelayedModal,
    })),
  { loading: () => null },
);

const ReviewDigitalResources = dynamic(
  () =>
    import("@/components/review/review-digital-resources").then((m) => ({
      default: m.ReviewDigitalResources,
    })),
  { loading: () => null },
);

const ReviewRewardGames = dynamic(
  () =>
    import("@/components/review/review-reward-games").then((m) => ({
      default: m.ReviewRewardGames,
    })),
  { loading: () => null },
);

export function ReviewDelayedModalLazy(
  props: ComponentProps<typeof ReviewDelayedModal>,
) {
  return <ReviewDelayedModal {...props} />;
}

export function ReviewDigitalResourcesLazy(
  props: ComponentProps<typeof ReviewDigitalResources>,
) {
  return <ReviewDigitalResources {...props} />;
}

export function ReviewRewardGamesLazy(
  props: ComponentProps<typeof ReviewRewardGames>,
) {
  return <ReviewRewardGames {...props} />;
}
