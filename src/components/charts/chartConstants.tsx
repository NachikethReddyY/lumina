export const CHART_MARGIN = { top: 4, right: 4, bottom: 0, left: -20 } as const;
export const CHART_TICK = { fill: '#6b7280', fontSize: 10 } as const;
export const CHART_GRID = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.04)' } as const;

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="chart-card"
      style={{
        minHeight: height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
        fontSize: '13px',
      }}
      aria-busy="true"
    >
      Loading chart…
    </div>
  );
}
