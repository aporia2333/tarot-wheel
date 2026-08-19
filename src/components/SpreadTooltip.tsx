interface SpreadTooltipProps {
  id: string;
  description: string;
}

export function SpreadTooltip({ id, description }: SpreadTooltipProps) {
  return (
    <div id={id} role="tooltip" className="spread-tooltip">
      <span className="spread-tooltip-star" aria-hidden="true">✦</span>
      <p>{description}</p>
    </div>
  );
}
