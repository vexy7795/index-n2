import { useLayoutEffect, useRef } from "react";

type DiceFace = 1 | 2 | 3 | 4 | 5 | 6;

const FACE_REST: Record<DiceFace, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  2: { rx: -90, ry: 0 },
  3: { rx: 0, ry: -90 },
  4: { rx: 0, ry: 90 },
  5: { rx: 90, ry: 0 },
  6: { rx: 0, ry: 180 },
};

const FACE_POSITION_CLASS: Record<DiceFace, string> = {
  1: "dice-face-front",
  6: "dice-face-back",
  3: "dice-face-right",
  4: "dice-face-left",
  2: "dice-face-top",
  5: "dice-face-bottom",
};

const FACES: DiceFace[] = [1, 2, 3, 4, 5, 6];

// Sharp-corner dice face — filled annulus with outer rect (3,3)-(21,21) and
// inner rect (5,5)-(19,19) in a 24-viewBox. Same outer/inner geometry as
// Remix's RiDice*Line (so the apparent size matches a 14px Remix icon at
// the production button's edge-fit scale) but with sharp corners — adjacent
// faces meet without the 3-arc vertex gap rounded corners would leave.
// Pip positions mirror Remix's for visual familiarity.
const FRAME_PATH = "M3 3 V21 H21 V3 H3 Z M5 5 V19 H19 V5 H5 Z";
const FACE_PIPS: Record<DiceFace, Array<{ cx: number; cy: number; r: number }>> = {
  1: [{ cx: 12, cy: 12, r: 2 }],
  2: [
    { cx: 9, cy: 9, r: 1.5 },
    { cx: 15, cy: 15, r: 1.5 },
  ],
  3: [
    { cx: 8.5, cy: 8.5, r: 1.5 },
    { cx: 12, cy: 12, r: 1.5 },
    { cx: 15.5, cy: 15.5, r: 1.5 },
  ],
  4: [
    { cx: 9, cy: 9, r: 1.5 },
    { cx: 15, cy: 9, r: 1.5 },
    { cx: 9, cy: 15, r: 1.5 },
    { cx: 15, cy: 15, r: 1.5 },
  ],
  5: [
    { cx: 8.5, cy: 8.5, r: 1.5 },
    { cx: 15.5, cy: 8.5, r: 1.5 },
    { cx: 12, cy: 12, r: 1.5 },
    { cx: 8.5, cy: 15.5, r: 1.5 },
    { cx: 15.5, cy: 15.5, r: 1.5 },
  ],
  6: [
    { cx: 9, cy: 8, r: 1.5 },
    { cx: 15, cy: 8, r: 1.5 },
    { cx: 9, cy: 12, r: 1.5 },
    { cx: 15, cy: 12, r: 1.5 },
    { cx: 9, cy: 16, r: 1.5 },
    { cx: 15, cy: 16, r: 1.5 },
  ],
};

const TUMBLE_REVS = 1;

const mod360 = (n: number) => ((n % 360) + 360) % 360;
const randomSign = () => (Math.random() < 0.5 ? -1 : 1);

function clampFace(n: number): DiceFace {
  return Math.max(1, Math.min(6, n)) as DiceFace;
}

function pickTumble(face: DiceFace, rx: number, ry: number) {
  let next: DiceFace;
  do {
    next = (1 + Math.floor(Math.random() * 6)) as DiceFace;
  } while (next === face);

  const target = FACE_REST[next];
  let dx = mod360(target.rx) - mod360(rx);
  let dy = mod360(target.ry) - mod360(ry);
  if (dx > 180) dx -= 360;
  if (dx <= -180) dx += 360;
  if (dy > 180) dy -= 360;
  if (dy <= -180) dy += 360;

  const dirX = dx === 0 ? randomSign() : Math.sign(dx);
  const dirY = dy === 0 ? randomSign() : Math.sign(dy);
  const finalRX = rx + dx + 360 * TUMBLE_REVS * dirX;
  const finalRY = ry + dy + 360 * TUMBLE_REVS * dirY;

  return { face: next, finalRX, finalRY };
}

export function DiceCube({ shuffleNonce }: { shuffleNonce: number }) {
  const cubeRef = useRef<HTMLSpanElement>(null);
  const initialFace = clampFace(Math.floor(shuffleNonce * 6) + 1);
  const poseRef = useRef({
    face: initialFace,
    rx: FACE_REST[initialFace].rx,
    ry: FACE_REST[initialFace].ry,
  });
  const skipFirst = useRef(true);

  useLayoutEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;

    if (skipFirst.current) {
      skipFirst.current = false;
      const { rx, ry } = poseRef.current;
      cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      return;
    }

    const { face, rx, ry } = poseRef.current;
    const { face: nextFace, finalRX, finalRY } = pickTumble(face, rx, ry);

    cube.style.setProperty("--dice-from-rx", `${rx}deg`);
    cube.style.setProperty("--dice-from-ry", `${ry}deg`);
    cube.style.setProperty("--dice-to-rx", `${finalRX}deg`);
    cube.style.setProperty("--dice-to-ry", `${finalRY}deg`);

    cube.classList.remove("dice-tumbling");
    void cube.offsetWidth;
    cube.classList.add("dice-tumbling");

    // Commit at start: lock the rest transform to the target so removing
    // the animation class on end doesn't revert. If the user clicks again
    // mid-tumble, the next call's "from" pose is this committed target —
    // bounds the visible snap to the remainder of the in-flight tumble.
    cube.style.transform = `rotateX(${finalRX}deg) rotateY(${finalRY}deg)`;
    poseRef.current = { face: nextFace, rx: finalRX, ry: finalRY };

    const onEnd = () => {
      cube.classList.remove("dice-tumbling");
    };
    cube.addEventListener("animationend", onEnd, { once: true });
    return () => cube.removeEventListener("animationend", onEnd);
  }, [shuffleNonce]);

  return (
    <span className="dice-scene">
      <span ref={cubeRef} className="dice-cube">
        {FACES.map((f) => (
          <span key={f} className={`dice-face ${FACE_POSITION_CLASS[f]}`}>
            <svg viewBox="0 0 24 24">
              <path d={FRAME_PATH} fill="currentColor" fillRule="evenodd" />
              {FACE_PIPS[f].map((pip, i) => (
                <circle key={i} cx={pip.cx} cy={pip.cy} r={pip.r} fill="currentColor" />
              ))}
            </svg>
          </span>
        ))}
      </span>
    </span>
  );
}
