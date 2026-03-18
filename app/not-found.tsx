import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold">页面未找到</h1>
      <p className="mt-2 text-muted-foreground">你访问的页面不存在。</p>
      <Link href="/" className="mt-6 inline-flex rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">返回首页</Link>
    </section>
  )
}

