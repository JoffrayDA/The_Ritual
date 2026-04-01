export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-white/20 border-t-white animate-spin"
      style={{ width: size, height: size }}
    />
  )
}
