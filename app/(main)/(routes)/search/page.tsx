import { Suspense } from "react";

import { SearchPageClient } from "@/components/search/search-page-client";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageClient />
    </Suspense>
  );
}
