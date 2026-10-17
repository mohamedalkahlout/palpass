import { getTaxiOffices } from "@/lib/supabase/service";
import { TaxisClient } from "./TaxisClient";

/**
 * Server Component — single-trip taxi catalog load (no client fetch storm).
 */
export default async function TaxisPage() {
  const taxis = await getTaxiOffices(null);
  return <TaxisClient initialTaxis={taxis || []} />;
}
