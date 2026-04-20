"use client";

import { useEffect, useRef } from "react";
import { Company, getSegmentColor, getStatusLabel } from "@/lib/types";

// Penha SC city center
const DEFAULT_CENTER: [number, number] = [-26.7717, -48.6478];
const DEFAULT_ZOOM = 13;

interface LeafletMapProps {
  companies: Company[];
  onSelect: (c: Company) => void;
}

export default function LeafletMap({ companies, onSelect }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import to avoid SSR
    Promise.all([
      import("leaflet"),
      import("leaflet.markercluster"),
    ]).then(([L]) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // MarkerCluster group
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        chunkedLoading: true,
        showCoverageOnHover: false,
        iconCreateFunction: (c: any) => {
          const count = c.getChildCount();
          const size = count > 100 ? 44 : count > 30 ? 36 : 28;
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(14,165,233,0.85);border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${count}</div>`,
            className: "",
            iconSize: [size, size],
          });
        },
      });

      mapRef.current = map;
      clusterRef.current = cluster;
      map.addLayer(cluster);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterRef.current = null;
      }
    };
  }, []);

  // Update markers when companies change
  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return;

    import("leaflet").then((L) => {
      clusterRef.current.clearLayers();

      const markers = companies
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((company) => {
          const color = getSegmentColor((company as any).mainCnae?.segment);
          const isActive = company.registrationStatus === "02";

          const icon = L.divIcon({
            html: `<div style="
              width:12px;height:12px;border-radius:50%;
              background:${color};
              border:2px solid ${isActive ? "white" : "#999"};
              box-shadow:0 1px 4px rgba(0,0,0,0.3);
              opacity:${isActive ? 1 : 0.55};
            "></div>`,
            className: "",
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          const marker = L.marker([company.latitude!, company.longitude!], { icon });

          marker.bindPopup(
            buildPopupHtml(company),
            { maxWidth: 280, className: "ti-popup" }
          );

          marker.on("click", () => onSelectRef.current(company));
          return marker;
        });

      clusterRef.current.addLayers(markers);
    });
  }, [companies]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"
      />
      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />
    </>
  );
}

function buildPopupHtml(company: Company): string {
  const segment = (company as any).mainCnae?.segment || "Outros";
  const color = getSegmentColor(segment);
  const addr = [company.streetType, company.street, company.streetNumber]
    .filter(Boolean)
    .join(" ");

  return `
    <div style="padding:12px;min-width:220px;font-family:system-ui,sans-serif">
      <div style="font-weight:600;font-size:13px;margin-bottom:4px;line-height:1.3;color:#111">${company.companyName}</div>
      ${company.tradeName ? `<div style="font-size:11px;color:#6b7280;margin-bottom:8px">${company.tradeName}</div>` : ""}
      <div style="font-size:11px;font-family:monospace;color:#374151;margin-bottom:8px">${company.cnpjFull}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <span style="background:${color}22;color:${color};padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600">${segment}</span>
        <span style="background:${company.registrationStatus === "02" ? "#dcfce7" : "#fee2e2"};color:${company.registrationStatus === "02" ? "#166534" : "#991b1b"};padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600">${getStatusLabel(company.registrationStatus)}</span>
      </div>
      ${company.mainCnaeCode ? `<div style="font-size:11px;color:#4b5563"><b>CNAE:</b> ${company.mainCnaeCode} — ${(company as any).mainCnae?.description ?? ""}</div>` : ""}
      ${addr ? `<div style="font-size:11px;color:#4b5563;margin-top:4px">${addr}${company.neighborhood ? ` — ${company.neighborhood}` : ""}</div>` : ""}
    </div>
  `;
}
