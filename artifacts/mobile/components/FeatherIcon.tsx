import React from "react";
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";

type IconName =
  | "navigation" | "shield" | "map-pin" | "credit-card" | "star"
  | "arrow-left" | "arrow-right" | "book-open" | "truck"
  | "check-circle" | "x-circle" | "user" | "flag" | "dollar-sign"
  | "map" | "home" | "check" | "hash" | "power" | "clock"
  | "alert-circle" | "chevron-left" | "x" | "tag" | "send"
  | "bell" | "settings" | "log-out" | "edit" | "phone" | "mail"
  | "calendar" | "info";

interface Props {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: object;
}

function FeatherIcon({ name, size = 24, color = "#000", style }: Props) {
  const stroke = color;
  const sw = 2;
  const lc = "round";
  const lj = "round";
  const fill = "none";
  const common = { stroke, strokeWidth: sw, strokeLinecap: lc, strokeLinejoin: lj, fill } as const;

  const icons: Record<string, React.ReactNode> = {
    navigation: <Polygon points="3 11 22 2 13 21 11 13 3 11" {...common} />,
    shield: <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...common} />,
    "map-pin": (
      <>
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...common} />
        <Circle cx="12" cy="10" r="3" {...common} />
      </>
    ),
    "credit-card": (
      <>
        <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" {...common} />
        <Line x1="1" y1="10" x2="23" y2="10" {...common} />
      </>
    ),
    star: <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" {...common} />,
    "arrow-left": (
      <>
        <Line x1="19" y1="12" x2="5" y2="12" {...common} />
        <Polyline points="12 19 5 12 12 5" {...common} />
      </>
    ),
    "arrow-right": (
      <>
        <Line x1="5" y1="12" x2="19" y2="12" {...common} />
        <Polyline points="12 5 19 12 12 19" {...common} />
      </>
    ),
    "book-open": (
      <>
        <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...common} />
        <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...common} />
      </>
    ),
    truck: (
      <>
        <Rect x="1" y="3" width="15" height="13" {...common} />
        <Polygon points="16 8 20 8 23 11 23 16 16 16 16 8" {...common} />
        <Circle cx="5.5" cy="18.5" r="2.5" {...common} />
        <Circle cx="18.5" cy="18.5" r="2.5" {...common} />
      </>
    ),
    "check-circle": (
      <>
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...common} />
        <Polyline points="22 4 12 14.01 9 11.01" {...common} />
      </>
    ),
    "x-circle": (
      <>
        <Circle cx="12" cy="12" r="10" {...common} />
        <Line x1="15" y1="9" x2="9" y2="15" {...common} />
        <Line x1="9" y1="9" x2="15" y2="15" {...common} />
      </>
    ),
    user: (
      <>
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...common} />
        <Circle cx="12" cy="7" r="4" {...common} />
      </>
    ),
    flag: (
      <>
        <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" {...common} />
        <Line x1="4" y1="22" x2="4" y2="15" {...common} />
      </>
    ),
    "dollar-sign": (
      <>
        <Line x1="12" y1="1" x2="12" y2="23" {...common} />
        <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" {...common} />
      </>
    ),
    map: (
      <>
        <Polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" {...common} />
        <Line x1="8" y1="2" x2="8" y2="18" {...common} />
        <Line x1="16" y1="6" x2="16" y2="22" {...common} />
      </>
    ),
    home: (
      <>
        <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...common} />
        <Polyline points="9 22 9 12 15 12 15 22" {...common} />
      </>
    ),
    check: <Polyline points="20 6 9 17 4 12" {...common} />,
    hash: (
      <>
        <Line x1="4" y1="9" x2="20" y2="9" {...common} />
        <Line x1="4" y1="15" x2="20" y2="15" {...common} />
        <Line x1="10" y1="3" x2="8" y2="21" {...common} />
        <Line x1="16" y1="3" x2="14" y2="21" {...common} />
      </>
    ),
    power: (
      <>
        <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" {...common} />
        <Line x1="12" y1="2" x2="12" y2="12" {...common} />
      </>
    ),
    clock: (
      <>
        <Circle cx="12" cy="12" r="10" {...common} />
        <Polyline points="12 6 12 12 16 14" {...common} />
      </>
    ),
    "alert-circle": (
      <>
        <Circle cx="12" cy="12" r="10" {...common} />
        <Line x1="12" y1="8" x2="12" y2="12" {...common} />
        <Line x1="12" y1="16" x2="12.01" y2="16" {...common} />
      </>
    ),
    "chevron-left": <Polyline points="15 18 9 12 15 6" {...common} />,
    x: (
      <>
        <Line x1="18" y1="6" x2="6" y2="18" {...common} />
        <Line x1="6" y1="6" x2="18" y2="18" {...common} />
      </>
    ),
    tag: (
      <>
        <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" {...common} />
        <Line x1="7" y1="7" x2="7.01" y2="7" {...common} />
      </>
    ),
    send: (
      <>
        <Line x1="22" y1="2" x2="11" y2="13" {...common} />
        <Polygon points="22 2 15 22 11 13 2 9 22 2" {...common} />
      </>
    ),
    bell: (
      <>
        <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...common} />
        <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...common} />
      </>
    ),
    settings: (
      <>
        <Circle cx="12" cy="12" r="3" {...common} />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...common} />
      </>
    ),
    "log-out": (
      <>
        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...common} />
        <Polyline points="16 17 21 12 16 7" {...common} />
        <Line x1="21" y1="12" x2="9" y2="12" {...common} />
      </>
    ),
    edit: (
      <>
        <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...common} />
        <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...common} />
      </>
    ),
    phone: (
      <>
        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.72 6.72l1.18-.83a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" {...common} />
      </>
    ),
    mail: (
      <>
        <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" {...common} />
        <Polyline points="22 6 12 13 2 6" {...common} />
      </>
    ),
    calendar: (
      <>
        <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" {...common} />
        <Line x1="16" y1="2" x2="16" y2="6" {...common} />
        <Line x1="8" y1="2" x2="8" y2="6" {...common} />
        <Line x1="3" y1="10" x2="21" y2="10" {...common} />
      </>
    ),
    info: (
      <>
        <Circle cx="12" cy="12" r="10" {...common} />
        <Line x1="12" y1="8" x2="12" y2="8" {...common} />
        <Line x1="12" y1="12" x2="12" y2="16" {...common} />
      </>
    ),
    sun: (
      <>
        <Circle cx="12" cy="12" r="5" {...common} />
        <Line x1="12" y1="1" x2="12" y2="3" {...common} />
        <Line x1="12" y1="21" x2="12" y2="23" {...common} />
        <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" {...common} />
        <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" {...common} />
        <Line x1="1" y1="12" x2="3" y2="12" {...common} />
        <Line x1="21" y1="12" x2="23" y2="12" {...common} />
        <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" {...common} />
        <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" {...common} />
      </>
    ),
    "trending-up": (
      <>
        <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...common} />
        <Polyline points="17 6 23 6 23 12" {...common} />
      </>
    ),
    "edit-2": (
      <>
        <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...common} />
      </>
    ),
    "file-text": (
      <>
        <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...common} />
        <Polyline points="14 2 14 8 20 8" {...common} />
        <Line x1="16" y1="13" x2="8" y2="13" {...common} />
        <Line x1="16" y1="17" x2="8" y2="17" {...common} />
        <Polyline points="10 9 9 9 8 9" {...common} />
      </>
    ),
  };

  const content = icons[name];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
    >
      {content ?? (
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
      )}
    </Svg>
  );
}

export default FeatherIcon;
