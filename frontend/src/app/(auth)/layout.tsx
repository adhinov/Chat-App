import { LayoutWithBg } from "../layout-with-bg";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutWithBg>{children}</LayoutWithBg>;
}
