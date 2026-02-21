import type { Metadata } from "next";
import PrivacyAccordion from "./PrivacyAccordion";

export const metadata: Metadata = {
  title: "Privacy Policy — Data Vista",
  description:
    "Data Vista Privacy Policy: how we collect, use, and protect your data when you use our AI-powered analytics platform.",
};

export default function PrivacyPage() {
  return <PrivacyAccordion />;
}
