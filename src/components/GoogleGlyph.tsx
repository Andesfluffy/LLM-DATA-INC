import clsx from "classnames";

type GoogleGlyphProps = {
  className?: string;
};

export default function GoogleGlyph({ className = "" }: GoogleGlyphProps) {
  return (
    <span
      className={clsx(
        "inline-flex h-5 w-5 items-center justify-center rounded-md bg-white text-[#4285F4] font-semibold shadow-sm",
        className,
      )}
      aria-hidden
    >
      G
    </span>
  );
}
