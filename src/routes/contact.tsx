import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_LONG } from "@/lib/legal";

export const Route = createFileRoute("/contact")({
  component: () => (
    <LegalPage
      title="Contact"
      lede="Signed-in messages go to the staff inbox from the Contact screen in the app. Do not send passwords."
      body={CONTACT_LONG}
    >
      <p className="mt-4 text-[13px]">
        Company record:{" "}
        <Link to="/company" className="font-semibold text-lime-2">
          Squadglobal Dynasty Ltd.
        </Link>
      </p>
    </LegalPage>
  ),
});
