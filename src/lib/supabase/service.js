"use server";

/**
 * PALPASS — Data Service
 * Centralized read functions for all modules.
 * This file is now a server actions module so client components can safely import and call its functions.
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────
// PROFILE & AUTH
// ─────────────────────────────────────────────────────────────

export const getCurrentProfile = cache(async function getCurrentProfile() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", user.id).maybeSingle();

    return profile ?? null;
  } catch (err) {
    console.error("[Handled SSR Exception - getCurrentProfile]:", err?.message);
    return null;
  }
});

export const getProfileById = cache(async function getProfileById(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data ?? null;
  } catch (err) {
    console.error("[Handled SSR Exception - getProfileById]:", err?.message);
    return null;
  }
});

// ─────────────────────────────────────────────────────────────
// WALLET
// ─────────────────────────────────────────────────────────────

export const getWallet = cache(async function getWallet(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
    return data ?? { balance: 0, currency: "ILS" };
  } catch (err) {
    console.error("[Handled SSR Exception - getWallet]:", err?.message);
    return { balance: 0, currency: "ILS" };
  }
});

export const getWalletBalance = cache(async function getWalletBalance(userId) {
  try {
    const wallet = await getWallet(userId);
    return wallet?.balance ?? 0;
  } catch (err) {
    console.error("[Handled SSR Exception - getWalletBalance]:", err?.message);
    return 0;
  }
});

export async function getWalletTransactions(walletId, limit = 10) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return [];
  }
}

/**
 * Get recent transactions for a user by finding their wallet first.
 */
export async function getTransactions(userId, limit = 10) {
  try {
    const supabase = await createClient();
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!wallet) return [];

    return await getWalletTransactions(wallet.id, limit);
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

export async function getNotifications(userId, limit = 20) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// BILLS & VIOLATIONS
// ─────────────────────────────────────────────────────────────

export const getBills = cache(async function getBills(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("bills").select("*").eq("user_id", userId).order("due_date", { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
});

export async function getViolations(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("violations").select("*").eq("user_id", userId).order("issued_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// SERVICE REQUESTS
// ─────────────────────────────────────────────────────────────

export async function getServiceRequests(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("service_requests").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// TRANSPORTATION
// ─────────────────────────────────────────────────────────────

export const getTaxiOffices = cache(async function getTaxiOffices(city = null) {
  try {
    const supabase = await createClient();
    let query = supabase.from("taxi_offices").select("*").eq("is_approved", true);
    if (city) query = query.eq("city", city);
    const { data } = await query.order("name");
    return data ?? [];
  } catch {
    return [];
  }
});

export async function getBusRoutes(search = null) {
  try {
    const supabase = await createClient();
    let query = supabase.from("bus_routes").select("*").eq("is_active", true);
    if (search) {
      query = query.or(`from_city.ilike.%${search}%,to_city.ilike.%${search}%,bus_number.ilike.%${search}%`);
    }
    const { data } = await query.order("bus_number");
    return data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// RESTAURANTS
// ─────────────────────────────────────────────────────────────

export async function getRestaurants(city = null) {
  try {
    const supabase = await createClient();
    let query = supabase.from("restaurants").select("*").eq("status", "approved");
    if (city) query = query.eq("city", city);
    const { data } = await query.order("name");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getRestaurantById(id) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("restaurants").select("*").eq("id", id).single();
    return data ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────────────────────

export async function getJobs(type = null, search = null) {
  try {
    const supabase = await createClient();
    let query = supabase.from("job_postings").select("*").eq("status", "approved");
    if (type) query = query.eq("type", type);
    if (search) {
      query = query.or(`title.ilike.%${search}%,organization.ilike.%${search}%,location.ilike.%${search}%`);
    }
    const { data } = await query.order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// NEWS
// ─────────────────────────────────────────────────────────────

export async function getNews(category = null, limit = 20) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("news_posts")
      .select("*, profiles(full_name, avatar_url)")
      .eq("status", "published");
    if (category) query = query.eq("category", category);
    const { data } = await query.order("created_at", { ascending: false }).limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// AID
// ─────────────────────────────────────────────────────────────

export async function getAidPackages() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("aid_packages").select("*").eq("is_active", true);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getUserAidClaims(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("aid_claims").select("*, aid_packages(name, description)")
      .eq("user_id", userId);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getDonations(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("donations").select("*").eq("donor_id", userId)
      .order("donated_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// CV
// ─────────────────────────────────────────────────────────────

export async function getCVData(userId) {
  try {
    const supabase = await createClient();
    const [{ data: education }, { data: experience }] = await Promise.all([
      supabase.from("cv_education").select("*").eq("user_id", userId).order("year", { ascending: false }),
      supabase.from("cv_experience").select("*").eq("user_id", userId).order("from_year", { ascending: false }),
    ]);
    return { education: education ?? [], experience: experience ?? [] };
  } catch {
    return { education: [], experience: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// HEALTHCARE
// ─────────────────────────────────────────────────────────────

export const getHealthInsurance = cache(async function getHealthInsurance(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("medical_profiles")
      .select("user_id, insurance_number, blood_type, primary_health_center, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    return {
      status: data.insurance_number ? "active" : "inactive",
      insurance_number: data.insurance_number,
      blood_type: data.blood_type,
      primary_health_center: data.primary_health_center,
      updated_at: data.created_at,
    };
  } catch {
    return null;
  }
});

export const getMedicalRecords = cache(async function getMedicalRecords(userId) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vaccination_records")
      .select("id, vaccine_name_ar, vaccine_name_en, dose_number, administered_date, health_facility")
      .eq("user_id", userId)
      .order("administered_date", { ascending: false });
    return (data || []).map((row) => ({
      id: row.id,
      type: row.vaccine_name_ar || row.vaccine_name_en,
      status: row.administered_date,
    }));
  } catch {
    return [];
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────

export async function getPendingUsers() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles").select("*").eq("status", "pending").order("created_at");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPendingRestaurants() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("restaurants").select("*").eq("status", "pending").order("created_at");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPendingJobs() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("job_postings").select("*").eq("status", "pending").order("created_at");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getAllUsers(search = null) {
  try {
    const supabase = await createClient();
    let query = supabase.from("profiles").select("*");
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,national_id.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data } = await query.order("created_at", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}
