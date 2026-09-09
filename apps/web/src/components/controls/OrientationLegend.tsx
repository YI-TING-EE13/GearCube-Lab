import React from 'react';

export const OrientationLegend: React.FC = () => (
  <section
    className="orientation-legend"
    aria-label="Orientation legend"
    data-testid="orientation-legend"
  >
    <div className="orientation-legend-header">Orientation</div>
    <div className="orientation-axis-grid">
      <span>X axis:</span>
      <span>L (-X) ↔ R (+X)</span>
      <span>Y axis:</span>
      <span>D (-Y) ↔ U (+Y)</span>
      <span>Z axis:</span>
      <span>B (-Z) ↔ F (+Z)</span>
    </div>
    <p className="orientation-convention">
      CW / CCW are viewed from outside the selected face toward the cube center.
    </p>
  </section>
);
