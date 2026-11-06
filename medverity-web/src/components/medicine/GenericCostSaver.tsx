"use client";

import React, { useEffect, useState } from "react";
import { TrendingDown, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, IndianRupee, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api";

interface GenericEquivalent {
  name: string;
  salts: string[];
  jan_aushadhi_price: number;
  manufacturer: string;
  bioequivalence_certified: boolean;
}

interface SavingsData {
  amount_per_strip: number;
  percentage: number;
  monthly_savings_estimate: number;
  annual_savings_estimate: number;
}

interface GenericSaverResult {
  found: boolean;
  brand_name?: string;
  brand_manufacturer?: string;
  brand_price_per_strip?: number;
  active_salts?: string[];
  category?: string;
  therapeutic_class?: string;
  best_generic?: GenericEquivalent;
  savings?: SavingsData;
  disclaimer?: string;
  message?: string;
}

interface Props {
  medicineName: string;
}

export default function GenericCostSaver({ medicineName }: Props) {
  const [result, setResult] = useState<GenericSaverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!medicineName) return;
    setLoading(true);
    apiClient
      .get<GenericSaverResult>(`/generics/check?medicine_name=${encodeURIComponent(medicineName)}`)
      .then((data) => setResult(data))
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [medicineName]);

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.25rem" }}>
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-teal-600)" }} />
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            Checking for generic alternatives...
          </span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // Not found in DB
  if (!result.found) {
    return (
      <div style={{ ...cardStyle, borderColor: "var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.25rem" }}>
          <AlertCircle size={20} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-primary)", margin: 0 }}>Generic Alternatives</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", margin: "0.25rem 0 0 0" }}>
              Not found in our database yet. Ask your pharmacist for the generic salt equivalent.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { brand_price_per_strip = 0, best_generic, savings, active_salts = [], disclaimer } = result;
  const genericPrice = best_generic?.jan_aushadhi_price ?? 0;
  const savingsPct = savings?.percentage ?? 0;

  return (
    <div style={{ ...cardStyle, borderColor: "rgba(16, 185, 129, 0.3)", background: "linear-gradient(135deg, rgba(16,185,129,0.03) 0%, rgba(5,150,105,0.02) 100%)" }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.875rem",
          padding: "1.125rem 1.25rem",
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--font-sans)",
        }}
        id="generic-saver-toggle"
      >
        {/* Savings badge */}
        <div style={{
          background: "linear-gradient(135deg, #059669, #10B981)",
          color: "white",
          borderRadius: "0.75rem",
          padding: "0.5rem 0.75rem",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "64px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
        }}>
          <TrendingDown size={16} style={{ marginBottom: "0.1rem" }} />
          <span style={{ fontSize: "1rem", fontWeight: 800, lineHeight: 1 }}>{savingsPct}%</span>
          <span style={{ fontSize: "0.6rem", fontWeight: 600, opacity: 0.85 }}>SAVE</span>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text-primary)", margin: "0 0 0.25rem 0" }}>
            💰 Generic Available — Save ₹{savings?.amount_per_strip ?? 0}/strip
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", margin: 0 }}>
            {result.brand_name}: <span style={{ textDecoration: "line-through" }}>₹{brand_price_per_strip}</span>
            {" → "}
            <span style={{ color: "#059669", fontWeight: 700 }}>₹{genericPrice}</span>
            {" with Jan Aushadhi"}
          </p>
        </div>
        {expanded
          ? <ChevronUp size={18} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
          : <ChevronDown size={18} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
        }
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ padding: "0 1.25rem 1.25rem 1.25rem" }}>
          {/* Active Salts */}
          {active_salts.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem 0" }}>
                Active Molecule(s)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {active_salts.map((salt, i) => (
                  <span key={i} style={saltBadge}>{salt}</span>
                ))}
              </div>
            </div>
          )}

          {/* Price Comparison Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            {/* Brand */}
            <div style={priceCard("#FEF3C7", "#92400E")}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem 0", opacity: 0.7 }}>
                Brand Price
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "2px" }}>
                <IndianRupee size={18} strokeWidth={2.5} />{brand_price_per_strip}
              </p>
              <p style={{ fontSize: "0.7rem", margin: "0.25rem 0 0 0", opacity: 0.7 }}>per strip</p>
            </div>
            {/* Generic */}
            <div style={priceCard("#D1FAE5", "#065F46")}>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem 0", opacity: 0.7 }}>
                Jan Aushadhi
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "2px" }}>
                <IndianRupee size={18} strokeWidth={2.5} />{genericPrice}
              </p>
              <p style={{ fontSize: "0.7rem", margin: "0.25rem 0 0 0", opacity: 0.7 }}>per strip</p>
            </div>
          </div>

          {/* Annual Savings Banner */}
          {savings && (
            <div style={{
              background: "linear-gradient(135deg, #059669, #10B981)",
              color: "white",
              borderRadius: "0.875rem",
              padding: "0.875rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: "1.0625rem", margin: 0 }}>
                  Annual Savings: ₹{savings.annual_savings_estimate.toLocaleString("en-IN")}
                </p>
                <p style={{ fontSize: "0.75rem", opacity: 0.85, margin: "0.2rem 0 0 0" }}>
                  ≈ ₹{savings.monthly_savings_estimate}/month
                </p>
              </div>
              <TrendingDown size={32} style={{ opacity: 0.7 }} />
            </div>
          )}

          {/* Bioequivalence badge */}
          {best_generic?.bioequivalence_certified && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.75rem 1rem",
              background: "rgba(16, 185, 129, 0.06)",
              borderRadius: "0.75rem",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              marginBottom: "0.875rem",
            }}>
              <ShieldCheck size={18} style={{ color: "#059669", flexShrink: 0 }} />
              <p style={{ fontSize: "0.8125rem", color: "#065F46", fontWeight: 600, margin: 0 }}>
                Identical Active Molecule · Bioequivalence Certified (CDSCO)
              </p>
            </div>
          )}

          {/* How to ask pharmacist */}
          <div style={{
            background: "var(--color-surface-secondary)",
            borderRadius: "0.75rem",
            padding: "0.875rem",
            marginBottom: "0.875rem",
          }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 700, margin: "0 0 0.4rem 0", color: "var(--color-text-primary)" }}>
              💬 Ask your pharmacist:
            </p>
            <p style={{ fontSize: "0.875rem", fontStyle: "italic", margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              "Do you have <strong>{best_generic?.name ?? active_salts.join(" + ")}</strong> from Jan Aushadhi?"
            </p>
          </div>

          {/* Disclaimer */}
          {disclaimer && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.5, margin: 0 }}>
              ⚠️ {disclaimer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-xl)",
  border: "1.5px solid",
  overflow: "hidden",
  background: "var(--color-surface)",
  marginBottom: "1rem",
};

const saltBadge: React.CSSProperties = {
  background: "var(--color-teal-50)",
  color: "var(--color-teal-700)",
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "0.25rem 0.625rem",
  borderRadius: "9999px",
  border: "1px solid var(--color-teal-200)",
};

const priceCard = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  borderRadius: "0.875rem",
  padding: "0.875rem",
  display: "flex",
  flexDirection: "column",
});
