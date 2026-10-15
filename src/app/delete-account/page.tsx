import Link from "next/link";

export const metadata = { title: "Delete Account – Mockingbird" };

export default function DeleteAccountPage() {
  return (
    <main className="legal" lang="en">
      <h1>Delete Account</h1>
      <p>You can delete your MockingBird account yourself at any time:</p>
      <ol>
        <li>Sign in to MockingBird.</li>
        <li>
          Open the <Link href="/dashboard">Dashboard</Link>.
        </li>
        <li>
          In the &ldquo;Delete account&rdquo; section, click <strong>Delete account</strong> and confirm the deletion.
        </li>
      </ol>
      <p>Deletion removes:</p>
      <ul>
        <li>your MockingBird account,</li>
        <li>your stored account data,</li>
        <li>stored social media connections,</li>
        <li>OAuth access tokens (YouTube access is also revoked at Google),</li>
        <li>drafts and uploaded media that has not been published,</li>
        <li>your publishing history, and</li>
        <li>any other data associated with your account,</li>
      </ul>
      <p>unless statutory retention obligations or other legal reasons prevent deletion.</p>
      <p>Deleting your MockingBird account does not delete posts already published on social media platforms.</p>
      <p>
        If you can no longer sign in, send a deletion request to:{" "}
        <strong>
          <a href="mailto:beshtawi.ashraf@gmail.com">beshtawi.ashraf@gmail.com</a>
        </strong>
      </p>
      <p>Last updated: October 2026</p>
    </main>
  );
}
