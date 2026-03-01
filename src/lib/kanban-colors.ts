/** Palette of soft column accent colors (HSL) */
export const COLUMN_COLORS = [
    { bg: "hsl(250 80% 96%)", border: "hsl(250 80% 72%)", badge: "hsl(250 80% 60%)", header: "hsl(250 40% 95%)" },
    { bg: "hsl(200 75% 95%)", border: "hsl(200 70% 58%)", badge: "hsl(200 70% 50%)", header: "hsl(200 40% 93%)" },
    { bg: "hsl(160 60% 94%)", border: "hsl(160 65% 45%)", badge: "hsl(160 65% 40%)", header: "hsl(160 30% 93%)" },
    { bg: "hsl(340 70% 96%)", border: "hsl(340 75% 60%)", badge: "hsl(340 75% 55%)", header: "hsl(340 40% 95%)" },
    { bg: "hsl(40 85% 95%)", border: "hsl(40 90% 50%)", badge: "hsl(40 90% 45%)", header: "hsl(40 50% 93%)" },
    { bg: "hsl(280 60% 96%)", border: "hsl(280 60% 62%)", badge: "hsl(280 60% 55%)", header: "hsl(280 30% 95%)" },
    { bg: "hsl(20 80% 95%)", border: "hsl(20 80% 55%)", badge: "hsl(20 80% 50%)", header: "hsl(20 40% 93%)" },
    { bg: "hsl(170 55% 94%)", border: "hsl(170 55% 42%)", badge: "hsl(170 55% 38%)", header: "hsl(170 30% 92%)" },
];

export function getColumnColor(index: number) {
    return COLUMN_COLORS[index % COLUMN_COLORS.length];
}
