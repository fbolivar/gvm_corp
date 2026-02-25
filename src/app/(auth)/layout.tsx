export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Soft background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/50 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-100/40 rounded-full blur-[150px]" />
      <div className="absolute top-[30%] right-[20%] w-[20%] h-[20%] bg-rose-100/30 rounded-full blur-[120px]" />

      {children}
    </div>
  )
}
