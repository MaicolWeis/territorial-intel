"use client";
import { useEffect, useRef } from "react";
import { getSegmentColor, getStatusLabel, getSizeLabel, formatCnpj } from "@/lib/types";

interface MapCompany {
  id: number;
  cnpjFull: string;
  companyName: string;
  tradeName: string | null;
  latitude: number | null;
  longitude: number | null;
  mainCnaeCode: string | null;
  registrationStatus: string | null;
  companySizeCode: string | null;
  neighborhood: string | null;
  street: string | null;
  streetType: string | null;
  streetNumber: string | null;
  city: string | null;
  state: string | null;
  mainCnae: { segment: string | null; description: string | null } | null;
}

interface Props {
  companies: MapCompany[];
  center?: [number, number];
  zoom?: number;
}

// Penha, SC default
const DEFAULT_CENTER: [number, number] = [-26.7717, -48.6478];

export default function CompanyMap({ companies, center = DEFAULT_CENTER, zoom = 13 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const clusterRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function initMap() {
      // Dynamic imports to avoid SSR issues
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      // @ts-expect-error - leaflet.markercluster has no types
      await import("leaflet.markercluster");
      // @ts-expect-error
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      // @ts-expect-error
      await import("leaflet.markercluster/dist/MarkerCluster.Default.css");

      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // @ts-expect-error
      const cluster = L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        chunkedLoading: true,
      });

      map.addLayer(cluster);
      mapInstanceRef.current = map;
      clusterRef.current = cluster;

      addMarkers(L, cluster, companies);
    }

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        // @ts-expect-error
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when companies change
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterRef.current) return;
    async function updateMarkers() {
      const L = (await import("leaflet")).default;
      // @ts-expect-error
      clusterRef.current.clearLayers();
      addMarkers(L, clusterRef.current, companies);
    }
    updateMarkers();
  }, [companies]);

  function addMarkers(L: unknown, cluster: unknown, comps: MapCompany[]) {
    const Leaflet = L as typeof import("leaflet").default;
    comps.forEach((c) => {
      if (!c.latitude || !c.longitude) return;
      const segment = c.mainCnae?.segment || "Outros";
      const color = getSegmentColor(segment);

      const icon = Leaflet.divIcon({
        html: `<div style="
          width: 13px; height: 13px; border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>`,
        className: "",
        iconSize: [13, 13],
        iconAnchor: [6, 6],
      });

      const address = [c.streetType, c.street, c.streetNumber].filter(Boolean).join(" ");
      const popupHtml = `
        <div style="min-width:220px;font-family:system-ui,sans-serif">
          <div style="font-weight:600;font-size:13px;margin-bottom:6px;line-height:1.3">
            ${c.tradeName || c.companyName}
          </div>
          ${c.tradeName ? `<div style="font-size:11px;color:#64748b;margin-bottom:4px">${c.companyName}</div>` : ""}
          <table style="width:100%;font-size:11px;border-collapse:collapse">
            <tr><td style="color:#94a3b8;padding:2px 6px 2px 0;white-space:nowrap">CNPJ</td><td style="font-weight:500">${formatCnpj(c.cnpjFull)}</td></tr>
            <tr><td style="color:#94a3b8;padding:2px 6px 2px 0">CNAE</td><td>${c.mainCnaeCode || "–"}</td></tr>
            <tr><td style="color:#94a3b8;padding:2px 6px 2px 0">Segmento</td>
              <td><span style="background:${color};color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600">${segment}</span></td></tr>
            <tr><td style="color:#94a3b8;padding:2px 6px 2px 0">Status</td><td>${getStatusLabel(c.registrationStatus)}</td></tr>
            <tr><td style="color:#94a3b8;padding:2px 6px 2px 0">Porte</td><td>${getSizeLabel(c.companySizeCode)}</td></tr>
            <tr><td style="color:#94a3b8;padding:2px 6px 2px 0">Bairro</td><td>${c.neighborhood || "–"}</td></tr>
            ${address ? `<tr><td style="color:#94a3b8;padding:2px 6px 2px 0">Endereço</td><td>${address}</td></tr>` : ""}
          </table>
        </div>
      `;

      const marker = Leaflet.marker([c.latitude, c.longitude], { icon });
      marker.bindPopup(popupHtml, { maxWidth: 280, minWidth: 220 });
      // @ts-expect-error
      cluster.addLayer(marker);
    });
  }

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: 400 }} />
  );
}
