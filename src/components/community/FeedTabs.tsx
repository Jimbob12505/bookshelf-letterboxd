import Link from "next/link";

export function FeedTabs({ activeTab }: { activeTab: "global" | "following" }) {
  return (
    <div className="mb-8 flex gap-1 rounded-xl border border-charcoal/8 bg-white/40 p-1 backdrop-blur-sm w-fit">
      {(["global", "following"] as const).map((tab) => (
        <Link
          key={tab}
          href={`/community?tab=${tab}`}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
            activeTab === tab
              ? "bg-white text-charcoal shadow-sm"
              : "text-charcoal/40 hover:text-charcoal/70"
          }`}
        >
          {tab === "global" ? "Global" : "Following"}
        </Link>
      ))}
    </div>
  );
}
