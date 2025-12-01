'use client';

interface LayoutWithBgProps {
  children: React.ReactNode;
}

export function LayoutWithBg({ children }: LayoutWithBgProps) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        background: '#FF6B00',
        backgroundImage: 'linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)'
      }}
    >
      {children}
    </div>
  );
}