import { useEffect, useMemo, useRef } from "react";
import MapView, { Marker, Polygon, type Region } from "react-native-maps";
import { NYC_REGION } from "../lib/bars";
import { fullyVisibleNeighborhoods } from "../lib/geo";
import { NEIGHBORHOOD_POLYGONS } from "../lib/neighborhoods";
import type { Bar } from "../lib/types";

type Props = {
  /** Bars to render as pins (the filtered subset) when not showing outlines. */
  bars: Bar[];
  /** When true, render tappable neighborhood outlines instead of bar pins. */
  showOutlines: boolean;
  /** Called when a bar pin's callout is tapped. */
  onSelectBar: (barId: string) => void;
  /** Called when a neighborhood outline is tapped — selects that filter. */
  onSelectNeighborhood: (name: string) => void;
  /** Bar ids the user has ever visited — shown with a distinct pin color. */
  visitedIds: Set<string>;
  /**
   * Called when the user manually zooms out far enough to see 2+ neighborhoods.
   * Return true if this switched the filter — the camera then stays put instead
   * of re-framing, so the outlines appear at the user's current zoom.
   */
  onZoomOut?: () => boolean | void;
  /** Bump to force a re-frame of the current target (e.g. All re-pressed). */
  frameNonce?: number;
};

// How long after starting one of our own camera animations to ignore region
// events (animations run 350ms; the slack absorbs late completion callbacks).
const PROGRAMMATIC_MOVE_MS = 800;

// A neighborhood's framed region can already fully contain other neighborhoods
// (Brooklyn's frame spans into lower Manhattan), so seeing 2+ neighborhoods is
// only treated as "zoomed out" once the view is also wider than what we framed.
const ZOOM_OUT_FACTOR = 1.2;

/** Region that frames the given bars with a little padding. */
function regionForBars(bars: Bar[]): Region {
  if (bars.length === 0) return NYC_REGION;

  const lats = bars.map((b) => b.latitude);
  const lons = bars.map((b) => b.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLon + maxLon) / 2;
  // 1.4x padding, with a floor so a single bar isn't zoomed in absurdly.
  const latitudeDelta = Math.max((maxLat - minLat) * 1.4, 0.01);
  const longitudeDelta = Math.max((maxLon - minLon) * 1.4, 0.01);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

const NEIGHBORHOOD_ENTRIES = Object.entries(NEIGHBORHOOD_POLYGONS);

export default function BarMap({
  bars,
  showOutlines,
  onSelectBar,
  onSelectNeighborhood,
  visitedIds,
  onZoomOut,
  frameNonce = 0,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const programmaticMoveAt = useRef(0);
  const lastTargetRef = useRef<Region>(NYC_REGION);
  const suppressNextFrame = useRef(false);
  const initialRegion = useMemo(
    () => (showOutlines ? NYC_REGION : regionForBars(bars)),
    [], // first frame only
  );

  // Re-frame the camera when the mode or the filtered subset changes: the whole
  // city for outlines, or the selected bars when drilled into a neighborhood.
  // Camera-only changes (no churn beyond the mode swap) are safe in Expo Go.
  // Skipped once after a zoom-out switch so the user's camera stays put.
  useEffect(() => {
    const target = showOutlines ? NYC_REGION : regionForBars(bars);
    lastTargetRef.current = target;
    if (suppressNextFrame.current) {
      suppressNextFrame.current = false;
      return;
    }
    programmaticMoveAt.current = Date.now();
    mapRef.current?.animateToRegion(target, 350);
  }, [showOutlines, bars, frameNonce]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation
      onRegionChangeComplete={(region) => {
        // Note: details.isGesture is Google Maps-only, so on Apple Maps we
        // tell our own animateToRegion calls apart from pinches by timestamp.
        const programmatic =
          Date.now() - programmaticMoveAt.current < PROGRAMMATIC_MOVE_MS;
        if (
          !programmatic &&
          !showOutlines &&
          region.latitudeDelta >
            lastTargetRef.current.latitudeDelta * ZOOM_OUT_FACTOR &&
          fullyVisibleNeighborhoods(region) >= 2
        ) {
          // Only hold the camera if the handler actually switched the filter.
          if (onZoomOut?.()) suppressNextFrame.current = true;
        }
      }}
    >
      {showOutlines
        ? NEIGHBORHOOD_ENTRIES.map(([name, ring]) => (
            <Polygon
              key={name}
              coordinates={ring}
              strokeColor="#e0218a"
              strokeWidth={2}
              fillColor="rgba(224, 33, 138, 0.18)"
              tappable
              onPress={() => onSelectNeighborhood(name)}
            />
          ))
        : bars.map((bar) => (
            <Marker
              key={bar.id}
              coordinate={{ latitude: bar.latitude, longitude: bar.longitude }}
              title={bar.name}
              description={`${bar.neighborhood} • Tap for details`}
              pinColor={visitedIds.has(bar.id) ? "#22c55e" : "#ff4d4f"}
              onCalloutPress={() => onSelectBar(bar.id)}
            />
          ))}
    </MapView>
  );
}
