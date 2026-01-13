'use client';

interface LayoutWithBgProps {
  children: React.ReactNode;
}

export function LayoutWithBg({ children }: LayoutWithBgProps) {
  return (
    <div
      className="
        h-[100svh]
        flex
        items-center
        justify-center
        p-4
        bg-gradient-to-br
        from-orange-500
        to-orange-400
      "
    >
      {children}
    </div>
  );
}
