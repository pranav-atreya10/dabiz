import Topbar from "@/components/Topbar";
import { PageTitle, Reveal } from "@/components/Motion";
import "@/app/styles/privacy.css";

export const metadata = { title: "Privacy · Requirements Studio" };

export default function PrivacyPage() {
  return (
    <div className="pg-privacy">
      <Topbar />
      <main>
        <PageTitle text="Privacy" />
        <Reveal mount delay={0.15}>
          <p className="lead">What happens to the information you put into Requirements Studio, in plain words.</p>

          <h2>What we store</h2>
          <ul>
            <li><b>Your organization&apos;s name</b>, and a scrambled (hashed) version of its sign-in code. We can&apos;t read the code itself.</li>
            <li><b>Your documents</b>: the idea you typed, your answers to the questions, and the document that was written.</li>
            <li><b>Feedback</b> you give on a document (thumbs up or down, and any comment).</li>
            <li><b>Usage counts</b>: how many AI tokens each request used, and when. Not the text itself.</li>
            <li><b>Azure DevOps settings</b>, if your admin connected them. The access token is stored encrypted.</li>
          </ul>

          <h2>Who it&apos;s shared with</h2>
          <ul>
            <li><b>OpenAI</b>: your idea, answers and document are sent to OpenAI&apos;s API to write questions and documents. See <a href="https://openai.com/policies/" rel="noopener">OpenAI&apos;s policies</a> for how they handle API data.</li>
            <li><b>Azure DevOps</b>: only when you press &quot;Send to Azure DevOps&quot;, the document is sent to your organization&apos;s own Azure DevOps project.</li>
            <li><b>Our hosting and database providers</b> (Vercel and the database host) store the data above so the app can work.</li>
          </ul>
          <p>We don&apos;t sell your data or use it for ads.</p>

          <h2>Who can see it</h2>
          <ul>
            <li>Anyone with your organization&apos;s code can see your organization&apos;s documents. Other organizations can&apos;t.</li>
            <li>The site admin can see feedback and the documents it was left on, to improve the product.</li>
          </ul>

          <h2>Please don&apos;t include</h2>
          <p>Passwords, personal details about people (like health or financial information), or anything your company isn&apos;t allowed to share with outside services.</p>

          <h2>Deleting your data</h2>
          <ul>
            <li>You can delete any document yourself from <b>My documents</b>.</li>
            <li>To delete everything for your organization, ask your admin. Deleting an organization deletes its documents and settings. Its usage counts are kept without its name.</li>
          </ul>

          <p className="updated">Last updated October 2026. This is a plain-language summary for an early version of the product, not a legal agreement.</p>
        </Reveal>
      </main>
    </div>
  );
}
