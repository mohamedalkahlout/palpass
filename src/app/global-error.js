"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (error) {
      console.error("[PALPASS Global Error Exception]:", error);
    }
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>PALPASS | عطل فني مؤقت</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        fontFamily: "IBM Plex Sans Arabic, Segoe UI, Tahoma, sans-serif",
        margin: 0,
        padding: "2rem",
        backgroundColor: "#030712",
        color: "#f3f4f6",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          maxWidth: "480px",
          width: "100%",
          padding: "2.5rem 2rem",
          borderRadius: "1rem",
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
          textAlign: "center",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 1.5rem",
            borderRadius: "0.75rem",
            backgroundColor: "rgba(4, 120, 87, 0.15)",
            border: "1px solid rgba(4, 120, 87, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            color: "#10b981",
          }}>
            🛡️
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0 0 0.5rem", color: "#ffffff" }}>
            تعذر عرض هذه الصفحة
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
            حدث خطأ غير متوقع أثناء معالجة الصفحة. نؤكد أن بياناتكم ومعاملاتكم المالية والسيادية آمنة بنسبة 100%.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                backgroundColor: "#047857",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              إعادة المحاولة &middot; Retry
            </button>
            <a
              href="/"
              style={{
                backgroundColor: "#1f2937",
                color: "#e5e7eb",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              الرئيسية
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
