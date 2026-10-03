/**
 * "You are here" marker: a person figure in a filled circle, shared by the Leaflet (web) and the
 * native map so both show the user's location the same way.
 */

export const USER_LOCATION_SIZE = 34;

/** White person figure (head + shoulders), drawn on the colored circle. */
export const PERSON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="7" r="4" fill="#FFFFFF"/><path d="M4 21.5c0-4.7 3.6-8.3 8-8.3s8 3.6 8 8.3z" fill="#FFFFFF"/></svg>`;

/** Leaflet divIcon HTML: pulsing halo + circle with the person (pulse is off with reduced motion). */
export function userLocationHtml(color: string, animate: boolean) {
  const size = USER_LOCATION_SIZE;
  return `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <span class="pd-me-halo${animate ? ' pd-me-pulse' : ''}" style="background:${color};"></span>
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
        ${PERSON_SVG}
      </div>
    </div>`;
}

/** CSS for the halo, injected next to the other Leaflet styles. */
export const USER_LOCATION_CSS = `
  .pd-me-halo {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    opacity: 0.22;
  }
  .pd-me-pulse {
    animation: pd-me-pulse 2s ease-out infinite;
  }
  @keyframes pd-me-pulse {
    0% { transform: scale(0.6); opacity: 0.45; }
    100% { transform: scale(1.5); opacity: 0; }
  }
`;
