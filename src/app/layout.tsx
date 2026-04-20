import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inteligência Territorial",
  description: "Análise de empresas por município — dados Receita Federal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
          rel="stylesheet"
        />
        <style>{`
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased; }
          .leaflet-container { font-family: inherit; }
          .leaflet-popup-content { margin: 12px 14px; font-size: 13px; line-height: 1.5; }
          .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #f1f5f9; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
