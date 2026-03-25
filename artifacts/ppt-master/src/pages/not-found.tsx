import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6">
      <div className="bento-card w-full max-w-md bg-white/[0.03] p-10 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-6 text-3xl font-black text-white">404 - 页面迷路了</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          看起来你访问了一个不存在的地址。或者，这是 AI 还没来得及踏足的内容荒野。
        </p>
        <div className="mt-10">
          <a href="/" className="btn-premium-primary inline-flex items-center px-8">
            返回数字主城
          </a>
        </div>
      </div>
    </div>
  );
}
