const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#e3e5e8] to-white dark:from-[#1E1F22] dark:to-[#313338] px-4 py-12">
      {children}
    </div>
  );
};

export default AuthLayout;
