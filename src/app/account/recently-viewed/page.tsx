import type { Metadata } from "next";
import { RecentlyViewedGrid } from "./RecentlyViewedGrid";

export const metadata: Metadata = {
  title: "Recently Viewed · Dstyle",
};

export default function RecentlyViewedPage() {
  return <RecentlyViewedGrid />;
}
