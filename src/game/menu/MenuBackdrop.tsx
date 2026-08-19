"use client";

export function MenuBackdrop({
  children,
  dim = false,
}: {
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0e0a08]">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/art/menu-bg.png')" }}
      />
      <div
        className={
          dim
            ? "absolute inset-0 bg-black/75"
            : "absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/20"
        }
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
