import { leftDecorations, rightDecorations } from "../assets/decorations";

function DecoRail({ items, side }) {
  return (
    <div className={`deco-rail deco-rail--${side}`}>
      {items.map((item) => (
        <img
          key={item.id}
          src={item.src}
          alt=""
          className={item.className ?? "deco"}
        />
      ))}
    </div>
  );
}

export default function PageDecorations() {
  return (
    <div className="page-decorations" aria-hidden="true">
      <DecoRail items={leftDecorations} side="left" />
      <DecoRail items={rightDecorations} side="right" />
    </div>
  );
}
