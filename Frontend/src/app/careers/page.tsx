import { redirect } from "next/navigation";

const EARLYJOBS_JOBS_URL = "https://www.earlyjobs.ai/jobs";

export default function CareersPage() {
  redirect(EARLYJOBS_JOBS_URL);
}
