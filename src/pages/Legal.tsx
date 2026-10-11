import { Link } from 'react-router-dom';
import { COMPANY_NAME, CONTACT_EMAIL, LEGAL_DRAFT, LEGAL_UPDATED, SITE_NAME } from '../lib/site';

type Section = { h: string; p: string[] };

function LegalPage({ title, sections }: { title: string; sections: Section[] }) {
  return (
    <div className="min-h-[100dvh] bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white px-4 pb-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link to="/" className="text-lg font-semibold">{SITE_NAME}</Link>
          <button onClick={() => window.history.back()} className="text-sm text-rose-600 underline">Back</button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        {LEGAL_DRAFT && (
          <p role="note" className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Draft: this page is a starting template and has not yet been reviewed by a lawyer.
          </p>
        )}
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">Last updated {LEGAL_UPDATED}. {SITE_NAME} is for adults aged 18 and over only.</p>
        <div className="mt-6 grid gap-6">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2 text-lg font-semibold">{s.h}</h2>
              <div className="grid gap-2 text-neutral-700">{s.p.map((t, i) => <p key={i}>{t}</p>)}</div>
            </section>
          ))}
        </div>
      </main>
      <footer className="border-t border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        <nav className="flex flex-wrap justify-center gap-4" aria-label="Legal">
          <Link to="/terms" className="underline">Terms</Link>
          <Link to="/privacy" className="underline">Privacy</Link>
          <Link to="/guidelines" className="underline">Community guidelines</Link>
          <Link to="/safety" className="underline">Safety</Link>
          <Link to="/report-abuse" className="underline">Report abuse</Link>
        </nav>
      </footer>
    </div>
  );
}

export function Terms() {
  return <LegalPage title="Terms of Service" sections={[
    { h: '1. Who can use ' + SITE_NAME, p: [
      `You must be at least 18 years old to create an account or use ${SITE_NAME}. By signing up you confirm that you are 18 or older. If we believe someone is under 18 we may suspend or delete their account.`] },
    { h: '2. Your account', p: [
      'Give accurate information, keep your password secret, and use one account per person. You are responsible for everything that happens under your account.'] },
    { h: '3. Your content', p: [
      'You keep ownership of the photos, posts, comments and messages you create. You give us a limited licence to store and display them in order to run the service, for example showing your profile to other users. Only post content you have the right to share.'] },
    { h: '4. Rules of conduct', p: [
      'Follow our Community Guidelines. In particular: no nudity or sexual content on Live video, no harassment, hate, threats or scams, no impersonation, no content involving anyone under 18, and no spam or unsolicited promotion.'] },
    { h: '5. Live video', p: [
      'Live connects you to another user in real time. We do not record Live video. Other users could still record or screenshot what they see, so only share what you are comfortable with. You can skip, end the call, report or block at any time.'] },
    { h: '6. Moderation and safety', p: [
      'We review reports and may remove content, suspend or ban accounts that break these rules. We cannot verify everyone on the service, and profile verification is not available yet. Be careful when sharing personal details or meeting someone in person.'] },
    { h: '7. Ending your account', p: [
      'You can deactivate or permanently delete your account in Settings at any time. We may suspend or terminate accounts that violate these Terms or put others at risk.'] },
    { h: '8. Disclaimers and liability', p: [
      `${SITE_NAME} is provided “as is”. We are not responsible for the conduct of users, online or offline. To the extent allowed by law, our liability is limited. [Have a lawyer complete this section for your country.]`] },
    { h: '9. Changes to these Terms', p: [
      'We may update these Terms. If you keep using the service after an update, you accept the new version.'] },
    { h: '10. Contact', p: [`${COMPANY_NAME} — ${CONTACT_EMAIL}`] },
  ]} />;
}

export function Privacy() {
  return <LegalPage title="Privacy Policy" sections={[
    { h: 'What we collect', p: [
      'Account details: your email address and date of birth.',
      'Profile details you choose to add: name, gender, bio, photos, interests, occupation, education, languages, a location label you type, and your matching preferences.',
      'Activity: likes, passes, matches, messages, posts, comments, blocks and reports, plus the time you were last active.',
      'We do not use advertising trackers. Your login session is kept in your browser’s local storage.'] },
    { h: 'How we use it', p: [
      'To run the service: show your profile to people who fit your preferences, create matches, deliver messages and notifications, keep the community safe, and respond to reports.'] },
    { h: 'What other users see', p: [
      'Other users see your name, age, photos, bio, interests and anything else you add to your profile. They never see your email address or date of birth. Your location label appears only if you choose to show it. “Online” and “last active” labels follow your Settings.'] },
    { h: 'Live video', p: [
      'Live video and audio travel directly between the two devices, or through a relay server when a direct connection isn’t possible. We do not record or store it. When two devices connect directly, each may be able to see the other’s network (IP) address, which is how internet video calls generally work.'] },
    { h: 'Service providers', p: [
      'We use Supabase (database, login, file storage and real-time messaging), Netlify (website hosting), Cloudflare (video relay servers), and Google’s public STUN service (helps devices find each other for video). These providers process data on our behalf.'] },
    { h: 'Keeping and deleting data', p: [
      'You can edit your profile at any time, deactivate your account to hide it, or permanently delete it in Settings. Deleting removes your profile, photos, posts, matches and messages.'] },
    { h: 'Security', p: [
      'Data is protected with access controls on our database and encrypted connections. No system is perfectly secure, so please use a strong, unique password.'] },
    { h: 'Age', p: [`${SITE_NAME} is for people 18 and over. If we learn that someone under 18 has an account, we will delete it.`] },
    { h: 'Your rights and contact', p: [
      `Depending on where you live you may have rights to access, correct or delete your data. Contact ${COMPANY_NAME} at ${CONTACT_EMAIL}. [Have a lawyer confirm what applies in your country.]`] },
  ]} />;
}

export function Guidelines() {
  return <LegalPage title="Community Guidelines" sections={[
    { h: 'Be respectful', p: ['Treat people kindly. Rejection is part of dating: if someone passes, ends a call or doesn’t reply, accept it and move on.'] },
    { h: 'Not allowed', p: [
      'Nudity or sexual content, especially on Live video.',
      'Harassment, bullying, hate speech, threats or intimidation.',
      'Fake profiles, impersonation, scams, asking for money, or promoting products and services.',
      'Anyone under 18, or content involving minors in any way.',
      'Illegal activity, violence, or content that encourages self-harm.',
      'Recording, sharing or publishing someone else’s video, photos or messages without their permission.'] },
    { h: 'Be honest', p: ['Use your own photos and real information. Say clearly what you’re looking for.'] },
    { h: 'What happens if rules are broken', p: ['We may remove content, suspend an account, or ban it permanently. Serious cases may be reported to the authorities.'] },
  ]} />;
}

export function Safety() {
  return <LegalPage title="Safety Guidelines" sections={[
    { h: 'Protect your information', p: [
      'Don’t share your home address, workplace, financial details or passwords. Be careful with social media handles until you trust someone.'] },
    { h: 'Watch for scams', p: [
      'Never send money, gift cards or crypto to someone you haven’t met. Be suspicious of anyone who quickly moves the chat elsewhere, avoids video, or has an urgent emergency.'] },
    { h: 'Using Live', p: [
      'Assume anything on camera could be recorded. Use Next, End call, Report and Block whenever you feel uncomfortable. You never owe anyone a conversation.'] },
    { h: 'Meeting in person', p: [
      'Video chat first. Meet in a busy public place, tell a friend where you’re going, arrange your own transport, and trust your instincts if something feels wrong.'] },
    { h: 'Get help', p: [
      'If you are in danger, contact your local emergency number right away. To tell us about a problem, use Report in the app or see the Report Abuse page.'] },
  ]} />;
}

export function ReportAbuse() {
  return <LegalPage title="Report Abuse" sections={[
    { h: 'Report inside the app', p: [
      'On Home: open a profile and choose ⋯ then Report. During Live: tap the flag icon. In a chat: tap ⋮ then Report. Reports go to our moderators, and the person you report is not told who reported them.'] },
    { h: 'Block someone', p: ['Blocking removes you from each other’s feeds, Live matching and messages straight away.'] },
    { h: 'Reporting by email', p: [
      `If you can’t use the app, or want to report something serious such as a threat or a minor on the platform, email ${CONTACT_EMAIL} with as much detail as you can.`] },
    { h: 'Emergencies', p: ['If someone is in immediate danger, contact your local emergency services first.'] },
  ]} />;
}