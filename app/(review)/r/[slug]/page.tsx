import type { Metadata } from "next";
import { ActiveReviewView } from "@/components/review/active-review-view";
import { InactiveBusinessView } from "@/components/review/inactive-business-view";
import { getBusinessBySlug } from "@/lib/data/business";
import { activeBusinessToDisplay } from "@/lib/review/display-model";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = raw.trim();
  if (!slug) {
    return { title: "Service unavailable" };
  }

  try {
    const result = await getBusinessBySlug(slug);

    if (result.status === "not_found") {
      return { title: "Service unavailable" };
    }

    if (result.status === "inactive") {
      return { title: "Service unavailable" };
    }

    const name =
      result.business.brand_name?.trim() ||
      result.business.name?.trim() ||
      "Review";
    return { title: `Review · ${name}` };
  } catch {
    return { title: "Service unavailable" };
  }
}

export default async function ReviewPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = raw.trim();
  if (!slug) {
    return <InactiveBusinessView />;
  }

  try {
    const result = await getBusinessBySlug(slug);

    if (result.status === "not_found") {
      return <InactiveBusinessView />;
    }

    if (result.status === "inactive") {
      return <InactiveBusinessView />;
    }

    return (
      <ActiveReviewView
        slug={slug}
        display={activeBusinessToDisplay(result.business)}
      />
    );
  } catch {
    return <InactiveBusinessView />;
  }
}
