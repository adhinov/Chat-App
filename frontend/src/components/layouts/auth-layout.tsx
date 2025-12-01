interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ 
           background: '#FF6B00',
           backgroundImage: 'linear-gradient(135deg, #FF6B00 0%, #FF8800 100%)'
         }}>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}