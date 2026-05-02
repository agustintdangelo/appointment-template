import type { HTMLAttributes, ReactNode } from "react";

type LocalizedSectionElement =
  | "article"
  | "aside"
  | "div"
  | "footer"
  | "form"
  | "header"
  | "main"
  | "nav"
  | "section";

type LocalizedSectionProps = HTMLAttributes<HTMLElement> & {
  as?: LocalizedSectionElement;
  children: ReactNode;
  order?: number;
};

export default function LocalizedSection({
  as: Component = "section",
  children,
  className,
  order = 0,
  ...props
}: LocalizedSectionProps) {
  const classNames = ["localized-section", className].filter(Boolean).join(" ");

  return (
    <Component
      data-locale-section=""
      data-locale-section-order={order}
      className={classNames}
      {...props}
    >
      {children}
    </Component>
  );
}
