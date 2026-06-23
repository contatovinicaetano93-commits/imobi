import { redirect } from "next/navigation";
import { TOMADOR_HOME } from "@/lib/tomador-flow";

/** Score fora do fluxo principal do tomador */
export default function ScoreRedirectPage() {
  redirect(TOMADOR_HOME);
}
