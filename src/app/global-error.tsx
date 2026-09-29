"use client";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself, which
 * means it must render its own <html> and cannot rely on any site styling.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        // Hard-coded because this boundary catches failures in the root layout
        // itself, so no stylesheet is guaranteed to have loaded. Values mirror
        // --color-bone and --color-ink in globals.css.
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem",
          background: "#f4f3f0",
          color: "#1a2333",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ marginTop: "1rem", opacity: 0.7 }}>
          The site failed to load. Please refresh the page.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "2rem",
            alignSelf: "flex-start",
            padding: "0.9rem 1.75rem",
            borderRadius: 999,
            border: "none",
            background: "#1a2333",
            color: "#f4f3f0",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
