import Link from "next/link";
import { ReadingLayout } from "@/components/ReadingLayout";

export default function NotFound() {
  return <ReadingLayout title="这一页暂时找不到" scene="account" narrow description="回到牌室，从一个新的问题开始。">
    <Link href="/" className="btn-primary">返回牌室</Link>
  </ReadingLayout>;
}
