import Link from "next/link";
import { GOOGLE_PERMISSIONS_URL, GOOGLE_PRIVACY_URL, YOUTUBE_TERMS_URL } from "@/lib/youtube";
import { TIKTOK_PRIVACY_URL, TIKTOK_TERMS_URL } from "@/lib/tiktok";

export const metadata = { title: "Privacy Policy – Mockingbird" };

export default function PrivacyPage() {
  return (
    <main className="legal" lang="en">
      <h1>Privacy Policy</h1>

      <h2>1. Controller</h2>
      <p>The controller responsible for processing personal data in connection with MockingBird is:</p>
      <address>
        <strong>Ashraf Beshtawi</strong>
        <br />
        Pritzhagener Weg 3
        <br />
        12685 Berlin
        <br />
        Germany
      </address>
      <p>
        Email: <a href="mailto:beshtawi.ashraf@gmail.com">beshtawi.ashraf@gmail.com</a>
      </p>

      <h2>2. About MockingBird</h2>
      <p>
        MockingBird is an application that lets users create and manage posts in one place and publish them on their own
        social media accounts.
      </p>
      <p>
        To do so, users can connect their social media accounts to MockingBird through the official interfaces (APIs)
        provided by each platform.
      </p>
      <p>MockingBird only accesses data and functions that the user has authorized on the respective platform.</p>

      <h2>3. Which personal data is processed?</h2>
      <p>Depending on how MockingBird is used, the following data in particular may be processed:</p>
      <ul>
        <li>name or username</li>
        <li>email address</li>
        <li>user account and internal user ID</li>
        <li>information about connected social media accounts</li>
        <li>social media account IDs</li>
        <li>OAuth credentials, access tokens and refresh tokens</li>
        <li>posts created by users</li>
        <li>images, videos and other uploaded content</li>
        <li>technical log and usage data</li>
        <li>IP address</li>
        <li>browser and device information</li>
        <li>date and time of access and actions</li>
      </ul>
      <p>
        Which data is actually processed depends on the features the user uses and on the APIs of the connected
        platforms.
      </p>

      <h2>4. Connecting social media platforms</h2>
      <p>MockingBird can connect to the following social media platforms:</p>
      <ul>
        <li>Facebook / Meta</li>
        <li>Instagram</li>
        <li>X</li>
        <li>Telegram</li>
        <li>LinkedIn</li>
        <li>YouTube</li>
        <li>TikTok</li>
      </ul>
      <p>Connections use the authentication and API procedures provided by each platform.</p>
      <p>MockingBird only receives the permissions the user has granted on the respective platform.</p>
      <p>
        The platform operators also process data under their own responsibility. Their processing is governed by the
        privacy policy of the respective platform.
      </p>

      <h2>5. YouTube and TikTok</h2>
      <h3>YouTube</h3>
      <p>
        MockingBird uses the <strong>YouTube API Services</strong> to upload videos to YouTube channels that users
        connect. By connecting a YouTube channel, users agree to the{" "}
        <a href={YOUTUBE_TERMS_URL} target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        . Google processes data under the{" "}
        <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </a>
        .
      </p>
      <p>When a user connects a YouTube channel, MockingBird requests permission to:</p>
      <ul>
        <li>read the channel&apos;s ID and title, to show which channel is connected;</li>
        <li>upload videos to that channel, only when the user publishes a post to it.</li>
      </ul>
      <p>
        MockingBird stores the channel ID, the channel title and the OAuth access and refresh tokens Google issues. For
        each upload it sends the video, the title the user entered and the post text (as the video description) to
        YouTube. MockingBird does not read, store or analyze any other YouTube data, and does not share YouTube data with
        anyone other than YouTube itself.
      </p>
      <p>
        The stored data is kept until the user disconnects the channel or deletes their MockingBird account. In both
        cases MockingBird deletes it and revokes its access at Google. Users can also revoke MockingBird&apos;s access at
        any time on the{" "}
        <a href={GOOGLE_PERMISSIONS_URL} target="_blank" rel="noopener noreferrer">
          Google security settings page
        </a>
        ; after that, publishing to the channel fails until it is connected again.
      </p>
      <p>
        MockingBird&apos;s use and transfer of information received from Google APIs adheres to the Google API Services
        User Data Policy, including the Limited Use requirements.
      </p>

      <h3>TikTok</h3>
      <p>
        MockingBird uses TikTok&apos;s <strong>Login Kit</strong> and <strong>Content Posting API</strong> to post videos
        to TikTok accounts that users connect. By connecting a TikTok account, users agree to the{" "}
        <a href={TIKTOK_TERMS_URL} target="_blank" rel="noopener noreferrer">
          TikTok Terms of Service
        </a>
        . TikTok processes data under the{" "}
        <a href={TIKTOK_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          TikTok Privacy Policy
        </a>
        .
      </p>
      <p>When a user connects a TikTok account, MockingBird requests permission to:</p>
      <ul>
        <li>read the account&apos;s ID and display name, to show which account is connected (user.info.basic);</li>
        <li>post videos to that account, only when the user publishes a post to it (video.publish).</li>
      </ul>
      <p>
        MockingBird stores the account&apos;s ID, its display name and the OAuth access and refresh tokens TikTok issues.
        Before each post it reads the account&apos;s current posting options from TikTok (nickname, allowed visibility
        and interaction settings, maximum video length) to show them to the user; these are not stored. For each post it
        sends the video, the post text (as the caption) and the settings the user chose to TikTok. MockingBird does not
        read, store or analyze any other TikTok data, and does not share TikTok data with anyone other than TikTok
        itself.
      </p>
      <p>
        The stored data is kept until the user disconnects the account or deletes their MockingBird account. In both
        cases MockingBird deletes it and revokes its access at TikTok. Users can also remove MockingBird at any time in
        the TikTok app under Settings and privacy → Security → Apps and services; after that, publishing to the account
        fails until it is connected again.
      </p>

      <h2>6. Purposes of processing</h2>
      <p>Personal data is processed in particular to:</p>
      <ul>
        <li>authenticate users when they sign in,</li>
        <li>provide the MockingBird account,</li>
        <li>connect social media accounts,</li>
        <li>create and manage posts,</li>
        <li>publish posts on the platforms the user selects,</li>
        <li>keep the application secure and stable,</li>
        <li>detect and fix errors,</li>
        <li>ensure that MockingBird works technically.</li>
      </ul>

      <h2>7. Legal bases</h2>
      <p>Depending on the processing operation, personal data is processed in particular on the basis of:</p>
      <ul>
        <li>Art. 6(1)(b) GDPR, where processing is necessary to provide the features the user requested;</li>
        <li>Art. 6(1)(f) GDPR, where processing is necessary for legitimate interests;</li>
        <li>Art. 6(1)(a) GDPR, where consent is required and the user has given it.</li>
      </ul>

      <h2>8. OAuth and access tokens</h2>
      <p>
        Users sign in to MockingBird via OAuth with Google, GitHub or Discord. MockingBird receives the user&apos;s name,
        email address and account ID from the chosen provider; MockingBird does not store a password.
      </p>
      <p>
        When a user connects a social media account to MockingBird, authentication data or access tokens are processed
        as far as the respective API requires.
      </p>
      <p>
        This data is used to carry out the actions the user has authorized on the respective platform, for example
        publishing a post.
      </p>

      <h2>9. Publishing posts</h2>
      <p>
        When a user publishes a post through MockingBird, the required content and technical information are sent to the
        social media platform the user selected.
      </p>
      <p>This transfer takes place so that the post can be published on the account the user has authorized.</p>
      <p>The social media platform additionally processes the data under its own privacy policy.</p>

      <h2>10. Hosting and technical service providers</h2>
      <p>External technical service providers may be used to operate MockingBird.</p>
      <p>These may include in particular:</p>
      <ul>
        <li>hosting providers</li>
        <li>database providers</li>
        <li>cloud infrastructure</li>
        <li>storage providers</li>
        <li>email service providers</li>
        <li>monitoring and logging services</li>
        <li>error analysis and security services</li>
      </ul>
      <p>
        <strong>Providers currently in use:</strong>
      </p>
      <ul>
        <li>
          <strong>Hosting:</strong> Contabo GmbH, Munich (Germany) – virtual server running the application and the
          database.
        </li>
        <li>
          <strong>Database:</strong> PostgreSQL, self-hosted on the same server; no external database provider.
        </li>
        <li>
          <strong>Media processing:</strong> Cloudinary Ltd. – uploaded images and videos are sent to Cloudinary for
          processing and storage.
        </li>
        <li>
          <strong>Sign-in (OAuth):</strong> Google, GitHub, Discord.
        </li>
        <li>
          <strong>Monitoring / error analysis:</strong> no external services; server and error logs stay on our own
          server.
        </li>
      </ul>

      <h2>11. Server and log data</h2>
      <p>When MockingBird is accessed and used, technically necessary information may be processed.</p>
      <p>This may include in particular:</p>
      <ul>
        <li>IP address</li>
        <li>date and time of access</li>
        <li>requested URL</li>
        <li>browser used</li>
        <li>operating system</li>
        <li>referrer</li>
        <li>technical status information</li>
      </ul>
      <p>The processing serves in particular the technical provision, stability and security of the application.</p>
      <p>The specific retention period depends on the infrastructure used.</p>

      <h2>12. Cookies and similar technologies</h2>
      <p>MockingBird only uses technically necessary cookies and browser storage:</p>
      <ul>
        <li>
          <code>authjs.session-token</code> (or <code>__Secure-authjs.session-token</code>): sign-in session, HttpOnly,
          valid for up to 30 days.
        </li>
        <li>
          <code>authjs.csrf-token</code>, <code>authjs.callback-url</code>: protection against cross-site request forgery
          and returning to the right page after sign-in; only for the duration of the session.
        </li>
        <li>
          <code>twitter_oauth_secret</code>, <code>temp_jwt</code>: only while connecting an X account, valid for 5
          minutes.
        </li>
        <li>
          <code>linkedin_oauth_state</code>, <code>youtube_oauth_state</code>, <code>tiktok_oauth_state</code>: only
          while connecting a LinkedIn account, YouTube channel or TikTok account, valid for 10 minutes.
        </li>
        <li>
          Browser storage (localStorage) <code>colorMode</code> (light/dark mode) and <code>emojiHistory</code> (recently
          used emojis): stays in the browser and is not sent to the server.
        </li>
      </ul>
      <p>
        When connecting Facebook pages or Instagram accounts, Meta&apos;s JavaScript SDK (connect.facebook.net) is loaded;
        Meta may set its own cookies. Meta&apos;s privacy policy applies to these.
      </p>
      <p>No tracking or analytics cookies are used.</p>
      <p>
        Technically necessary cookies or comparable technologies may be used where they are required to provide the
        features the user requested.
      </p>
      <p>Any storage on or access to the user&apos;s device beyond that may require consent.</p>

      <h2>13. Retention period</h2>
      <p>
        Personal data is only stored for as long as necessary for the respective purposes or as required by statutory
        retention obligations.
      </p>
      <p>
        Users can delete their MockingBird account (see <Link href="/delete-account">delete your account</Link>).
      </p>
      <p>
        On deletion, the personal data associated with the account is deleted, unless statutory retention obligations or
        other legally permitted reasons require further storage.
      </p>

      <h2>14. Disconnecting social media accounts</h2>
      <p>Users can remove the connection between MockingBird and their social media accounts.</p>
      <p>
        The credentials or access tokens stored at MockingBird for that connection are then deleted, unless there is
        another legal basis for storing them.
      </p>
      <p>Removing a connection in MockingBird does not by itself end the processing of data by the respective platform.</p>

      <h2>15. Rights of data subjects</h2>
      <p>Subject to the statutory requirements, users have in particular the following rights:</p>
      <ul>
        <li>right of access</li>
        <li>right to rectification</li>
        <li>right to erasure</li>
        <li>right to restriction of processing</li>
        <li>right to data portability</li>
        <li>right to object</li>
        <li>right to withdraw consent</li>
      </ul>
      <p>To exercise these rights, send a request to the following email address:</p>
      <p>
        <strong>
          <a href="mailto:beshtawi.ashraf@gmail.com">beshtawi.ashraf@gmail.com</a>
        </strong>
      </p>

      <h2>16. Right to lodge a complaint</h2>
      <p>
        Data subjects have the right to lodge a complaint with a data protection supervisory authority about the
        processing of their personal data.
      </p>

      <h2>17. Changes to this privacy policy</h2>
      <p>
        This privacy policy may be updated when MockingBird&apos;s features, the technical services used or the legal
        requirements change.
      </p>
      <p>The current version is published on this website.</p>

      <p>Last updated: October 2026</p>
    </main>
  );
}
