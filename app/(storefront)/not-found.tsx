import { NotFoundPanel } from "@/components/layout/not-found-panel";

export default function StorefrontNotFound() {
  return (
    <section className="flex flex-1 items-center justify-center py-12">
      <NotFoundPanel
        title="Page not found"
        description="This page doesn't exist or may have moved. Head back to the menu and keep ordering."
        primaryAction={{ href: "/", label: "Browse menu" }}
        secondaryAction={{ href: "/cart", label: "View cart" }}
      />
    </section>
  );
}
