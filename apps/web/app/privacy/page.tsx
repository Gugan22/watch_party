import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif', color: '#333' }}>
      <h1>Privacy Policy for WatchParty</h1>
      <p>Last updated: September 12, 2026</p>

      <h2>1. Overview</h2>
      <p>WatchParty is a private, open-source watch party application. We prioritize your privacy and aim to collect as little personal data as possible.</p>

      <h2>2. Information We Collect</h2>
      <p>When you log in using Google OAuth as a host, we only receive your email address, name, and profile picture to authenticate your identity.</p>
      <p>Joining guests do not require account creation or personal data collection.</p>

      <h2>3. How We Use Information</h2>
      <p>Your Google profile information is strictly used to display your display name and avatar inside your active watch party room.</p>

      <h2>4. Data Sharing</h2>
      <p>We do not sell, rent, or share your personal data with any third parties.</p>

      <h2>5. Contact</h2>
      <p>If you have any questions regarding this privacy policy, you can contact the project maintainer.</p>
    </div>
  );
}
