import type { Metadata } from "next";
import { ActiveReviewView } from "@/components/review/active-review-view";
import { InactiveBusinessView } from "@/components/review/inactive-business-view";
import { QrInvalidView } from "@/components/review/qr-invalid-view";
import { getBusinessBySlug } from "@/lib/data/business";
import { activeBusinessToDisplay } from "@/lib/review/display-model";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function displayNameFromInactive(row: {
  brand_name: string | null;
  name: string;
}): string {
  return row.brand_name?.trim() || row.name?.trim() || "Business";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = raw.trim();
  if (!slug) {
    return { title: "QR invalid" };
  }

  const result = await getBusinessBySlug(slug);

  if (result.status === "not_found") {
    return { title: "QR invalid" };
  }

  if (result.status === "inactive") {
    const name = displayNameFromInactive(result.business);
    return { title: `${name} · Service unavailable` };
  }

  const name =
    result.business.brand_name?.trim() ||
    result.business.name?.trim() ||
    "Review";
  return { title: `Review · ${name}` };
}

export default async function ReviewPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = raw.trim();
  if (!slug) {
    return <QrInvalidView />;
  }

  const result = await getBusinessBySlug(slug);

  if (result.status === "not_found") {
    return <QrInvalidView />;
  }

  if (result.status === "inactive") {
    return <InactiveBusinessView slug={slug} business={result.business} />;
  }

  return (
    <ActiveReviewView
      slug={slug}
      display={activeBusinessToDisplay(result.business)}
    />
  );
}
