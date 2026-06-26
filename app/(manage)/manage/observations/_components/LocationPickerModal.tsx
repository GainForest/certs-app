"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker, TileLayer } from "leaflet";
import { ChevronLeftIcon, Loader2Icon, LocateFixedIcon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { useModal } from "@/components/ui/modal/context";
import { mapTileUrl } from "@/app/_lib/coords";
import { isValidLocation, roundCoord, type PickedLocation } from "./default-location";

export const LocationPickerModalId = "observation-location-picker";

export type LocationPickerModalProps = {
  /** Already-chosen pin to seed the map with, if any. */
  initial?: PickedLocation | null;
  /** Where to centre the map when there is no chosen pin (e.g. the default site). */
  defaultCenter?: PickedLocation | null;
  onSelect: (location: PickedLocation) => void;
};

const FALLBACK_CENTER: PickedLocation = { lat: 12, lng: 5 };

export function LocationPickerModal({ initial, defaultCenter, onSelect }: LocationPickerModalProps) {
  const t = useTranslations("upload.observations.location");
  const { popModal, stack, hide } = useModal();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const [picked, setPicked] = useState<PickedLocation | null>(isValidLocation(initial) ? initial : null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const placeMarker = useCallback((lat: number, lng: number) => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const next = { lat: roundCoord(lat), lng: roundCoord(lng) };
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true });
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        setPicked({ lat: roundCoord(position.lat), lng: roundCoord(position.lng) });
      });
      marker.addTo(map);
      markerRef.current = marker;
    }
    setPicked(next);
  }, []);

  // Init the map once. Dynamically imported so Leaflet never touches `window`
  // during SSR — mirrors RecordMap.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const dark = document.documentElement.classList.contains("dark");
      const start = isValidLocation(initial)
        ? initial
        : isValidLocation(defaultCenter)
          ? defaultCenter
          : FALLBACK_CENTER;
      const startZoom = isValidLocation(initial) || isValidLocation(defaultCenter) ? 13 : 2;
      const map = L.map(elRef.current, { worldCopyJump: true, minZoom: 1, zoomControl: false }).setView(
        [start.lat, start.lng],
        startZoom,
      );
      L.control.zoom({ position: "bottomright" }).addTo(map);
      tileRef.current = L.tileLayer(mapTileUrl(dark), {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (event: LeafletMouseEvent) => placeMarker(event.latlng.lat, event.latlng.lng));
      mapRef.current = map;
      if (isValidLocation(initial)) placeMarker(initial.lat, initial.lng);
      setReady(true);
      setTimeout(() => map.invalidateSize(), 60);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileRef.current = null;
    };
    // Intentionally run once; `initial`/`defaultCenter` only seed the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(t("geoUnsupported"));
      return;
    }
    setGeoError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        mapRef.current?.setView([latitude, longitude], 15, { animate: true });
        placeMarker(latitude, longitude);
      },
      () => {
        setLocating(false);
        setGeoError(t("geoDenied"));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }, [placeMarker, t]);

  const handleConfirm = useCallback(() => {
    if (!picked) return;
    onSelect(picked);
    if (stack.length === 1) {
      void hide().then(() => popModal());
    } else {
      popModal();
    }
  }, [picked, onSelect, stack.length, hide, popModal]);

  return (
    <ModalContent className="px-0 py-0" dismissible={false}>
      <div className="sr-only">
        <ModalHeader>
          <ModalTitle>{t("title")}</ModalTitle>
          <ModalDescription>{t("description")}</ModalDescription>
        </ModalHeader>
      </div>
      <div className="px-5 pt-5">
        <h2 className="font-instrument text-xl font-medium italic tracking-[-0.02em] text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("description")}</p>
      </div>
      <div className="relative mt-4 w-full">
        {!ready && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-muted">
            <Loader2Icon className="animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={elRef} className="h-[420px] w-full" style={{ zIndex: 0 }} />
        {stack.length > 1 && (
          <Button
            className="absolute left-3 top-3 z-[2] rounded-full"
            variant="outline"
            size="icon-sm"
            onClick={() => popModal()}
          >
            <ChevronLeftIcon />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute right-3 top-3 z-[2] bg-background/90 shadow-sm backdrop-blur"
        >
          {locating ? <Loader2Icon className="size-4 animate-spin" /> : <LocateFixedIcon className="size-4" />}
          {t("useMyLocation")}
        </Button>
      </div>
      <div className="flex items-center gap-2 px-5 pt-3 text-sm text-muted-foreground">
        <MapPinIcon className={`size-4 shrink-0 ${picked ? "text-primary" : "text-muted-foreground/50"}`} />
        {picked ? (
          <span className="tabular-nums">{t("picked", { lat: picked.lat, lng: picked.lng })}</span>
        ) : (
          <span>{t("hint")}</span>
        )}
      </div>
      {geoError ? <p className="px-5 pt-1.5 text-xs text-destructive">{geoError}</p> : null}
      <ModalFooter>
        <Button onClick={handleConfirm} disabled={!picked}>
          {t("confirm")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
