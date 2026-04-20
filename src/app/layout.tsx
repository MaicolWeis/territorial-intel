import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inteligência Territorial",
  description: "Análise de empresas por município — dados Receita Federal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; }
          .leaflet-container { font-family: inherit; }
          .leaflet-popup-content { margin: 12px 14px; font-size: 13px; line-height: 1.5; }
          .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #f1f5f9; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
